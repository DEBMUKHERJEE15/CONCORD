import {
  TripBudgetCalculation,
  HotelOfferLive,
  HotelUserEstimate,
  HotelOffer,
  TransportOffer,
  ActivityOffer,
  DiningPackageOffer,
  SelectedHotelState,
} from "../../types";

export interface CalculateTripBudgetParams {
  travelerCount: number;
  roomCount?: number;
  departureDate: string;
  returnDate: string;
  sharedBudgetINR: number;
  selectedHotel?: SelectedHotelState;
  fallbackHotelOffer?: HotelOffer;
  transportOffer?: TransportOffer;
  activityOffers?: ActivityOffer[];
  diningOffer?: DiningPackageOffer;
  customTransportCostINR?: number;
  customDiningCostINR?: number;
  customActivityCostINR?: number;
  customLocalTransportCostINR?: number;
  contingencyPercentage?: number; // default 5%
  exchangeRates?: {
    USD_TO_INR?: number;
    EUR_TO_INR?: number;
  };
}

const DEFAULT_USD_TO_INR = 84.0;
const DEFAULT_EUR_TO_INR = 91.5;

/**
 * Calculates nights between two ISO date strings (minimum 1)
 */
export function calculateNightsBetween(departureDate: string, returnDate: string): number {
  try {
    const dep = new Date(departureDate);
    const ret = new Date(returnDate);
    const diff = Math.ceil((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24));
    return isNaN(diff) || diff < 1 ? 1 : diff;
  } catch {
    return 1;
  }
}

/**
 * Converts currency amount to INR using transparently documented conversion rates
 */
export function convertToINR(
  amount: number,
  currency: string,
  exchangeRates?: { USD_TO_INR?: number; EUR_TO_INR?: number }
): { amountINR: number; rateUsed?: number; conversionNote?: string } {
  const curr = currency.toUpperCase();
  if (curr === "INR") {
    return { amountINR: Math.round(amount * 100) / 100 };
  }

  if (curr === "USD") {
    const rate = exchangeRates?.USD_TO_INR || DEFAULT_USD_TO_INR;
    const amountINR = Math.round(amount * rate * 100) / 100;
    return {
      amountINR,
      rateUsed: rate,
      conversionNote: `Converted from $${amount.toFixed(2)} USD at 1 USD = ₹${rate.toFixed(2)}`,
    };
  }

  if (curr === "EUR") {
    const rate = exchangeRates?.EUR_TO_INR || DEFAULT_EUR_TO_INR;
    const amountINR = Math.round(amount * rate * 100) / 100;
    return {
      amountINR,
      rateUsed: rate,
      conversionNote: `Converted from €${amount.toFixed(2)} EUR at 1 EUR = ₹${rate.toFixed(2)}`,
    };
  }

  // Fallback 1:1 if unknown currency, noting the limitation
  return {
    amountINR: amount,
    conversionNote: `Unrecognized currency ${currency}; treated 1:1 with INR without speculative conversion.`,
  };
}

/**
 * Exact deterministic budget calculator using minor integer units (paisa) to avoid floating-point errors
 */
export function calculateTripBudget(params: CalculateTripBudgetParams): TripBudgetCalculation {
  const travelers = Math.max(params.travelerCount || 1, 1);
  const nights = calculateNightsBetween(params.departureDate, params.returnDate);
  const rooms = Math.max(params.roomCount || Math.ceil(travelers / 2), 1);
  const sharedBudgetINR = Math.max(params.sharedBudgetINR || 0, 0);

  // 1. Accommodation Calculation (using minor units: paisa)
  let accommodationPaisa = 0;
  let accommodationStatus: "verified_live" | "demo" | "user_estimate" | "missing" = "missing";
  let accommodationLabel = "No accommodation selected";
  let hotelDetails: TripBudgetCalculation["categories"]["accommodation"]["details"] = undefined;
  let taxesAndFeesPaisa = 0;
  let taxesStatus: "calculated" | "included_in_items" | "none" = "none";
  let taxesLabel = "No additional taxes";

  if (params.selectedHotel) {
    const sel = params.selectedHotel;
    if (sel.selectedOffer) {
      const offer = sel.selectedOffer;
      const converted = convertToINR(offer.totalStayPrice, offer.currency, params.exchangeRates);
      accommodationPaisa = Math.round(converted.amountINR * 100);
      accommodationStatus = "verified_live";
      accommodationLabel = `${sel.directoryItem.name} (Live Amadeus Offer — ${offer.roomType || "Standard"})`;

      hotelDetails = {
        hotelName: sel.directoryItem.name,
        perNightINR: Math.round(convertToINR(offer.pricePerNight, offer.currency, params.exchangeRates).amountINR),
        nights,
        rooms,
        taxesIncluded: offer.taxesIncluded,
        source: `Amadeus Live (${offer.currency})`,
      };

      if (!offer.taxesIncluded && offer.taxesAndFees) {
        const taxConv = convertToINR(offer.taxesAndFees, offer.currency, params.exchangeRates);
        taxesAndFeesPaisa += Math.round(taxConv.amountINR * 100);
        taxesStatus = "calculated";
        taxesLabel = `Hotel taxes & fees (${offer.currency} ${offer.taxesAndFees})`;
      } else if (offer.taxesIncluded) {
        taxesStatus = "included_in_items";
        taxesLabel = "Taxes and fees already included in room rate";
      }
    } else if (sel.userEstimate) {
      const perNight = sel.userEstimate.nightlyRateINR;
      const totalEst = perNight * nights * rooms;
      accommodationPaisa = Math.round(totalEst * 100);
      accommodationStatus = "user_estimate";
      accommodationLabel = `${sel.directoryItem.name} (User Estimate — ₹${perNight.toLocaleString("en-IN")}/night × ${nights}n × ${rooms}r)`;

      hotelDetails = {
        hotelName: sel.directoryItem.name,
        perNightINR: perNight,
        nights,
        rooms,
        taxesIncluded: true,
        source: "User Manual Estimate",
      };
    } else if (sel.totalStayINR > 0) {
      accommodationPaisa = Math.round(sel.totalStayINR * 100);
      accommodationStatus = sel.priceStatus === "live_offer" ? "verified_live" : "user_estimate";
      accommodationLabel = `${sel.directoryItem.name} (Selected Hotel)`;
    }
  } else if (params.fallbackHotelOffer) {
    const perNight = params.fallbackHotelOffer.pricePerNightINR;
    const totalEst = perNight * nights * rooms;
    accommodationPaisa = Math.round(totalEst * 100);
    accommodationStatus = "demo";
    accommodationLabel = `${params.fallbackHotelOffer.name} (Demo catalog — ₹${perNight.toLocaleString("en-IN")}/night × ${nights}n × ${rooms}r)`;

    hotelDetails = {
      hotelName: params.fallbackHotelOffer.name,
      perNightINR: perNight,
      nights,
      rooms,
      taxesIncluded: true,
      source: "Demo Inventory",
    };
  }

  // 2. Transport Calculation
  let transportPaisa = 0;
  let transportStatus: "verified" | "demo" | "estimate" | "missing" = "missing";
  let transportLabel = "No transport selected";

  if (params.customTransportCostINR !== undefined && params.customTransportCostINR > 0) {
    transportPaisa = Math.round(params.customTransportCostINR * 100);
    transportStatus = "estimate";
    transportLabel = `Custom transport allowance (₹${params.customTransportCostINR.toLocaleString("en-IN")})`;
  } else if (params.transportOffer) {
    transportPaisa = Math.round(params.transportOffer.totalCostINR * 100);
    transportStatus = "demo";
    transportLabel = `${params.transportOffer.name} (Demo catalog)`;
  }

  // 3. Activities Calculation
  let activitiesPaisa = 0;
  let activitiesStatus: "verified" | "demo" | "estimate" | "missing" = "missing";
  let activitiesLabel = "No activities selected";

  if (params.customActivityCostINR !== undefined && params.customActivityCostINR > 0) {
    activitiesPaisa = Math.round(params.customActivityCostINR * 100);
    activitiesStatus = "estimate";
    activitiesLabel = `Custom activity budget (₹${params.customActivityCostINR.toLocaleString("en-IN")})`;
  } else if (params.activityOffers && params.activityOffers.length > 0) {
    const perPersonSum = params.activityOffers.reduce((sum, act) => sum + act.costPerPersonINR, 0);
    const totalActivities = perPersonSum * travelers;
    activitiesPaisa = Math.round(totalActivities * 100);
    activitiesStatus = "demo";
    activitiesLabel = `${params.activityOffers.length} activities (₹${perPersonSum.toLocaleString("en-IN")} × ${travelers} travelers)`;
  }

  // 4. Dining Calculation
  let diningPaisa = 0;
  let diningStatus: "demo" | "estimate" | "missing" = "missing";
  let diningLabel = "No dining package selected";

  if (params.customDiningCostINR !== undefined && params.customDiningCostINR > 0) {
    diningPaisa = Math.round(params.customDiningCostINR * 100);
    diningStatus = "estimate";
    diningLabel = `Custom dining budget (₹${params.customDiningCostINR.toLocaleString("en-IN")})`;
  } else if (params.diningOffer) {
    const totalDining = params.diningOffer.costPerPersonINR * travelers;
    diningPaisa = Math.round(totalDining * 100);
    diningStatus = "demo";
    diningLabel = `${params.diningOffer.name} (₹${params.diningOffer.costPerPersonINR.toLocaleString("en-IN")} × ${travelers} travelers)`;
  }

  // 5. Local Transport Calculation
  let localTransportPaisa = 0;
  let localTransportStatus: "demo" | "estimate" | "missing" = "missing";
  let localTransportLabel = "Included in main transport or walking";

  if (params.customLocalTransportCostINR !== undefined && params.customLocalTransportCostINR > 0) {
    localTransportPaisa = Math.round(params.customLocalTransportCostINR * 100);
    localTransportStatus = "estimate";
    localTransportLabel = `Local transport allowance (₹${params.customLocalTransportCostINR.toLocaleString("en-IN")})`;
  } else {
    // Standard baseline for local daily transit (metro, taxis, auto-rickshaw)
    const baselineDailyPerTraveler = 350;
    const totalLocal = baselineDailyPerTraveler * travelers * Math.max(nights, 1);
    localTransportPaisa = Math.round(totalLocal * 100);
    localTransportStatus = "estimate";
    localTransportLabel = `Daily local transit estimate (₹${baselineDailyPerTraveler}/day × ${travelers}p × ${nights}d)`;
  }

  // 6. Subtotal before contingency
  const subtotalPaisa =
    transportPaisa +
    accommodationPaisa +
    activitiesPaisa +
    diningPaisa +
    localTransportPaisa +
    taxesAndFeesPaisa;

  // 7. Contingency Calculation (default 5%)
  const contingencyPct = params.contingencyPercentage !== undefined ? params.contingencyPercentage : 5;
  const contingencyPaisa = Math.round(subtotalPaisa * (contingencyPct / 100));

  // 8. Grand Total Trip Cost
  // Formula: totalTripCost = transport + accommodation + activities + food + localTransport + additionalFees + contingency
  const totalTripCostPaisa = subtotalPaisa + contingencyPaisa;
  const totalTripCostINR = totalTripCostPaisa / 100;

  // Remaining budget formula: remainingBudget = groupBudget - totalTripCost
  const sharedBudgetPaisa = Math.round(sharedBudgetINR * 100);
  const remainingBudgetPaisa = sharedBudgetPaisa - totalTripCostPaisa;
  const remainingBudgetINR = remainingBudgetPaisa / 100;

  const isOverBudget = remainingBudgetPaisa < 0;
  const budgetOverrunINR = isOverBudget ? Math.abs(remainingBudgetINR) : 0;
  const costPerTravelerINR = Math.round((totalTripCostINR / travelers) * 100) / 100;

  // Detect unpriced or estimated categories
  const unpricedItems: string[] = [];
  if (accommodationStatus === "missing") unpricedItems.push("accommodation");
  if (transportStatus === "missing") unpricedItems.push("transport");
  if (activitiesStatus === "missing") unpricedItems.push("activities");
  if (diningStatus === "missing") unpricedItems.push("dining");

  const unpricedNotice = unpricedItems.length > 0
    ? `Notice: ${unpricedItems.join(", ")} cost is currently missing or unpriced.`
    : undefined;

  const formulaExplanation =
    `totalTripCost = transport (₹${(transportPaisa / 100).toLocaleString("en-IN")}) + ` +
    `accommodation (₹${(accommodationPaisa / 100).toLocaleString("en-IN")}) + ` +
    `activities (₹${(activitiesPaisa / 100).toLocaleString("en-IN")}) + ` +
    `food (₹${(diningPaisa / 100).toLocaleString("en-IN")}) + ` +
    `localTransport (₹${(localTransportPaisa / 100).toLocaleString("en-IN")}) + ` +
    `taxes/fees (₹${(taxesAndFeesPaisa / 100).toLocaleString("en-IN")}) + ` +
    `contingency [${contingencyPct}%] (₹${(contingencyPaisa / 100).toLocaleString("en-IN")}) = ` +
    `₹${totalTripCostINR.toLocaleString("en-IN")}`;

  return {
    currency: "INR",
    travelerCount: travelers,
    roomCount: rooms,
    nightsCount: nights,
    categories: {
      transport: {
        amountINR: transportPaisa / 100,
        status: transportStatus,
        label: transportLabel,
      },
      accommodation: {
        amountINR: accommodationPaisa / 100,
        status: accommodationStatus,
        label: accommodationLabel,
        details: hotelDetails,
      },
      activities: {
        amountINR: activitiesPaisa / 100,
        status: activitiesStatus,
        label: activitiesLabel,
      },
      dining: {
        amountINR: diningPaisa / 100,
        status: diningStatus,
        label: diningLabel,
      },
      localTransport: {
        amountINR: localTransportPaisa / 100,
        status: localTransportStatus,
        label: localTransportLabel,
      },
      taxesAndFees: {
        amountINR: taxesAndFeesPaisa / 100,
        status: taxesStatus,
        label: taxesLabel,
      },
      contingency: {
        amountINR: contingencyPaisa / 100,
        percent: contingencyPct,
        status: "estimate",
        label: `${contingencyPct}% Contingency Buffer (Unplanned expenses & emergency reserve)`,
      },
    },
    totalTripCostINR,
    costPerTravelerINR,
    sharedBudgetINR,
    remainingBudgetINR,
    isOverBudget,
    budgetOverrunINR,
    formulaExplanation,
    unpricedItemsNotice: unpricedNotice,
  };
}
