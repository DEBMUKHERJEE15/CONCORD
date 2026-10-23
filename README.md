# CONCORD — Complete Trip Explorer & Group Trip Negotiator

> **"Your group. Different priorities. One trip everyone can agree on."**
> A negotiation-based group travel planner and worldwide trip explorer that resolves conflicts between individual traveler preferences, optimizes shared budgets under strict constraints, supports arbitrary worldwide destinations via Photon / OpenStreetMap, and visibly explains every compromise.

---

## 🧭 Executive Summary

Standard AI travel planners are simple chatbots that generate generic, ungrounded itineraries without understanding group friction. In real group travel, planning breaks down because travelers have fundamentally incompatible priorities:
- **Budget Guardian** seeks maximum savings and minimal financial risk.
- **Comfort Seeker** demands 4-to-5-star hotels, private chauffeur vehicles, and upscale amenities.
- **Explorer** prioritizes activity volume, packed circuits, and cultural immersion.
- **Slow Traveler** requires mandatory midday rest buffers, low transit fatigue (≤ 60 mins/day), and relaxed pacing.

**CONCORD** solves this through a hybrid architecture combining **hosted Gemma 4 LLM reasoning** (`gemma-4-26b-a4b-it`) with **strict deterministic mathematical constraint optimization**. The LLM never hallucinates numbers or overrides budgets; instead, it analyzes human priorities, negotiates multi-round trade-offs, and explains concessions based on deterministic calculations.

---

## 🔒 Non-Negotiable Compliance Matrix

| Requirement | Implementation & Verification Status |
|---|---|
| **1. Gemma 4 LLM Exclusivity** | Powered strictly by `@google/genai` (Google Gen AI JavaScript SDK) and hosted Gemma 4 (`gemma-4-26b-a4b-it`). Resilient server-side pooling protects against 429 TPM rate limits while maintaining sub-second inference. |
| **2. Zero Model Substitution in UI** | The frontend strictly presents Gemma 4 (`gemma-4-26b-a4b-it`). If the LLM integration encounters an error, a dismissible alert banner is rendered, preserving all deterministic calculations and UI state. |
| **3. Three Logical Agent Roles** | Modular architecture separated into: `Preference & Group Agent`, `Negotiation & Optimization Agent`, and `Validation & Explanation Agent`. |
| **4. Worldwide Destination Search** | Powered by the public Photon geocoding API by Komoot (`https://photon.komoot.io/api/`). No Google Maps API key required. Preserves `[longitude, latitude]` coordinates and provides manual unverified entry fallback. |
| **5. Strict No Cross-Destination Leakage** | Curated catalog items for Goa, Jaipur, Tokyo, Paris, Kolkata, and London are strictly isolated. For any other arbitrary worldwide city, the system generates labeled baseline estimates (`MANUAL ESTIMATES — NOT LIVE PRICES`), never leaking unrelated city offers. |
| **6. Editorial Trip Explorer Overview** | Luxury travel magazine aesthetic with an interactive quick-search bar, curated destination cards, mood filters (Culture, Beach, Food, Nature), and short weekend escape templates. |
| **7. Dark Midnight Navy Theme** | Cohesive dark aesthetic across all tabs: Deep midnight navy backgrounds (`#0B1120`, `#0f172a`), card surfaces (`#131d33`, `#1a233b`), crisp typography (`#f8fafc`, `#94a3b8`), teal / emerald accent highlights (`#10b981`, `#059669`), and subtle borders (`#334155`). |
| **8. Saved Plans in LocalStorage** | Full session persistence: save, view, reopen, rename, and delete trips with arbitrary destination metadata, coordinates, candidate states, and traveler profiles. |
| **9. 25-Point Comprehensive Test Suite** | 25 automated Vitest unit tests verifying autocomplete geocoding, coordinates, throttling fallback, destination isolation, budget math, satisfaction floors, accessibility, and localStorage persistence. |

---

## 🏛️ Three Logical Agent Roles & Architecture

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      CONCORD CLIENT DASHBOARD                          │
 │   Trip Explorer • Trip Planner • 4 Archetypes • 3 Candidates • Ledger  │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ JSON POST /api/negotiate
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     NEXT.JS SERVER-SIDE ENGINE                         │
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ 1. Preference & Group Agent (Gemma 4)                            │  │
 │  │    Interprets individual preferences, archetypes & frictions     │  │
 │  │    Output validated via Zod: PreferenceAnalysisSchema            │  │
 │  └──────────────────────────────────┬───────────────────────────────┘  │
 │                                     ▼                                  │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ 2. Negotiation & Optimization Agent                              │  │
 │  │    Deterministic candidate generation & Pareto ranking           │  │
 │  │    Gemma 4 negotiates multi-round proposals & trade-offs         │  │
 │  │    Enforces shared budget ceiling & individual satisfaction      │  │
 │  └──────────────────────────────────┬───────────────────────────────┘  │
 │                                     ▼                                  │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ 3. Validation & Explanation Agent                                │  │
 │  │    Deterministic Audit: 8 strict constraint checks (PASS/FAIL)   │  │
 │  │    Gemma 4 grounded compromise explanation narrative             │  │
 │  └──────────────────────────────────────────────────────────────────┘  │
 └────────────────────────────────────────────────────────────────────────┘
```

### Agent Roles Detailed:
1. **Preference & Group Agent** (`src/lib/agents/preference-agent.ts`):
   - Ingests trip parameters, dates, party size, and traveler profiles.
   - Identifies friction dimensions (`budget_vs_comfort`, `pace_vs_sightseeing`, `transit_tolerance`, `amenity_standards`).
   - Validates output using Zod schemas with lenient transformations.
2. **Negotiation & Optimization Agent** (`src/lib/agents/negotiation-agent.ts` & `src/lib/optimizer.ts`):
   - Generates 3 distinct strategies: **Best Balanced (Pareto Consensus)**, **Lowest Cost**, and **Maximum Experience**.
   - Calculates exact component costs, per-person rates, transit minutes, and traveler satisfaction scores.
   - Formulates multi-round timeline proposals, objections, and counterproposals across up to 3 rounds.
   - Maintains the **Trade-Off Ledger**: original decision, changed decision, cost delta in INR, gainer, and conceder.
3. **Validation & Explanation Agent** (`src/lib/agents/validation-agent.ts`):
   - Executes 8 independent deterministic audits:
     1. `check-cost-sum`: Hotel + transport + activity + dining component costs sum exactly to grand total without rounding drift.
     2. `check-budget-ceiling`: Grand total ≤ declared shared group budget in INR.
     3. `check-per-person-math`: Per-person cost multiplied by traveler count matches grand total within 1 INR tolerance.
     4. `check-catalog-offers`: Validates all offer IDs against verified demo catalog or destination estimates.
     5. `check-schedule-compatibility`: Transit load ≤ 120 mins/day & total excursion duration ≤ 18 hrs across trip.
     6. `check-traveler-floors`: Every individual traveler meets or exceeds declared minimum satisfaction floor.
     7. `check-accessibility`: Ensures step-free hotel and accessible vehicle when accessibility is mandatory.
     8. `check-no-cross-destination-leakage`: Ensures zero cross-destination offer leakage.
   - Generates a clear human-readable narrative explaining why each compromise was made.

---

## 🧮 Mathematical Scoring Engine

Satisfaction for traveler $i$ is calculated using a multi-attribute utility function:

$$\text{Satisfaction}_i = w_{\text{cost}} S_{\text{cost}} + w_{\text{comfort}} S_{\text{comfort}} + w_{\text{act}} S_{\text{act}} + w_{\text{transit}} S_{\text{transit}}$$

Where:
- $\sum w = 1.0$ (configurable per traveler).
- $S_{\text{cost}}$ penalizes costs exceeding individual caps and rewards group budget savings.
- $S_{\text{comfort}}$ evaluates hotel star rating, amenities, and transport class.
- $S_{\text{act}}$ scores activity volume against minimum thresholds.
- $S_{\text{transit}}$ scores daily transit minutes against physical fatigue limits.
- **Hard Constraint Floor**: $\text{Satisfaction}_i \ge \text{Floor}_i$ (default: 60–65%). Any candidate violating an individual floor is marked **INFEASIBLE**, preventing a high aggregate average from masking a dissatisfied traveler.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14.2.20 (App Router)
- **Language**: TypeScript 5.6 (Strict Mode)
- **Styling**: Tailwind CSS with dark midnight navy palette (`#0B1120`, `#131d33`, `#1a233b`) and teal/emerald accents
- **LLM SDK**: Google Gen AI JavaScript SDK (`@google/genai` v2.29.1)
- **Hosted Model**: Gemma 4 (`gemma-4-26b-a4b-it`)
- **Geocoding Autocomplete**: Photon by Komoot (OpenStreetMap data)
- **Validation**: Zod 3.23.8
- **Testing**: Vitest 3.2.7 (25 specific test cases)
- **Icons**: Lucide React

---

## 🚀 Running Locally

### 1. Prerequisites
- Node.js `v20+` (tested on Node v24)
- npm `v10+`

### 2. Clone & Install
```bash
git clone https://github.com/your-username/concord-group-trip-negotiator.git
cd concord-group-trip-negotiator
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```env
GEMMA_API_KEY=your_hosted_gemma_api_key_here
GEMMA_MODEL=gemma-4-26b-a4b-it
```
*(Alternatively, enter your key in the web UI via the "Set Gemma Key" modal for session-only testing).*

### 4. Run Tests & Production Build
```bash
# Run 25-point comprehensive test suite
npm test

# Build production bundle
npm run build

# Start production server
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Test Suite (25 Tests)

Run the Vitest test suite at any time:
```bash
npm test
```

Test coverage includes:
1. Photon feature normalization for Tokyo (`[lon, lat]` coordinates).
2. Photon normalization for Paris (Île-de-France).
3. Photon normalization for Kolkata (West Bengal).
4. Graceful handling of missing state/county/country fields in GeoJSON.
5. Network timeout/throttling fallback to manual entry.
6. Manual entry creates valid `DestinationObject` with `isManual: true`.
7. Destination change from Goa to Tokyo invalidates prior offers.
8. Candidate for Tokyo contains zero Goa/Jaipur offer leakage.
9. Arbitrary destination (e.g. Reykjavik) receives labeled manual estimates without crashing.
10. Valid trip under budget evaluates to feasible and is selected by Pareto engine.
11. Over-budget candidate is rejected by deterministic validator.
12. Accessibility hard constraint violation rejects candidate.
13. Minimum traveler satisfaction floor breach rejects candidate.
14. Mandatory rest period violation rejects candidate when slow traveler is in party.
15. Individual spending cap violation rejects candidate.
16. Component cost summation exactly equals grandTotalINR.
17. Per-person cost multiplied by traveler count matches grand total within 1 INR tolerance.
18. Catalog verification fails when unknown or hallucinated offer ID is present.
19. Pareto selection picks Best Balanced candidate when feasible.
20. Trade-off ledger items have quantified impact and rationale.
21. Malformed LLM JSON is rejected cleanly by Zod schemas.
22. Saved plan in localStorage preserves arbitrary destination coordinates and details.
23. Reopening a saved plan restores traveler profiles and candidate selection.
24. Deleting a saved plan removes it cleanly from session list.
25. Landing page quick search transfers origin and destination into trip planner.

---

## 📡 API Reference

### 1. Health Check
`GET /api/health`
- **Response**:
```json
{
  "status": "healthy",
  "app": "CONCORD — Group Trip Negotiator",
  "version": "1.0.0",
  "gemma": {
    "model": "gemma-4-26b-a4b-it",
    "hasServerApiKey": true,
    "sdk": "@google/genai",
    "hostedType": "Google Gen AI Hosted Gemma"
  },
  "demoInventory": {
    "hotelsCount": 21,
    "transportsCount": 16,
    "activitiesCount": 18,
    "diningPackagesCount": 9,
    "disclaimer": "DEMO DATA — NOT LIVE PRICES"
  }
}
```

### 2. Destination Autocomplete Search
`GET /api/destinations/search?q=Tokyo&limit=6`
- **Response**:
```json
{
  "results": [
    {
      "id": "dest_osm_R_1543125",
      "name": "Tokyo",
      "displayName": "Tokyo, Japan",
      "country": "Japan",
      "countryCode": "JP",
      "coordinates": [139.7638947, 35.6768601],
      "latitude": 35.6768601,
      "longitude": 139.7638947,
      "osmType": "R",
      "osmId": "1543125",
      "isVerified": true,
      "isManual": false,
      "source": "photon"
    }
  ]
}
```

### 3. Worldwide Hotel Discovery
`GET /api/hotels/search?lat={lat}&lon={lon}&radiusKm={2|5|10|25}&accommodationType={type}`
- Queries OpenStreetMap Overpass API around destination coordinates.
- Returns deduplicated hotels with Haversine distance, mapped amenities, address, contact links, and attribution.
- In-memory cache protects public Overpass servers.

### 4. Live Hotel Offers & User Estimates
`POST /api/hotels/offers`
- Optional live room rates via Amadeus Self-Service APIs (`v3/shopping/hotel-offers`).
- Accommodates user manual nightly estimates when live rates are unconfigured.

### 5. Preference Interpretation
`POST /api/negotiate/parse-preferences`
- Analyzes traveler notes and identifies conflicting dimensions using the Preference & Group Agent.

### 6. Full Group Negotiation Workflow
`POST /api/negotiate`
- Orchestrates deterministic optimization, multi-round negotiation proposals, trade-off ledger accounting, and validation.

---

## 🏨 Worldwide Hotel Discovery & Deterministic Budgeting

### 1. Free Worldwide Hotel Directory (No Key Required)
Concord integrates the public OpenStreetMap Overpass API (`https://overpass-api.de/api/interpreter`) to discover mapped accommodation worldwide around destination coordinates resolved by Photon.
- **Supported tags**: `tourism=hotel`, `tourism=hostel`, `tourism=guest_house`, `tourism=motel`, `tourism=apartment`, `tourism=resort`, `tourism=bed_and_breakfast`.
- **Configurable radius**: 2 km (center), 5 km (area), 10 km (district), 25 km (region).
- **Attribution**: Clearly attributed to OpenStreetMap contributors under ODbL.
- **Rule compliance**: Missing hotel names, coordinates, or ratings are **never fabricated**.

### 2. Optional Live Hotel Pricing (Amadeus Integration)
- Server-side environment variables: `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_BASE_URL`.
- If configured: fetches verified live room offers via `GET /v3/shopping/hotel-offers`.
- If unconfigured or unavailable: graceful fallback to OpenStreetMap directory with clear badge: *"Price Not Available — Directory Listing Only"*. Users can provide a manual estimate tagged `USER ESTIMATE — NOT LIVE PRICES`.

### 3. Exact Money Calculation
Concord implements an authoritative deterministic budget calculator independent of the LLM:
$$\text{totalTripCost} = \text{transport} + \text{accommodation} + \text{activities} + \text{food} + \text{localTransport} + \text{additionalFees} + \text{contingency}$$
$$\text{remainingBudget} = \text{groupBudget} - \text{totalTripCost}$$
- **Integer Minor Units**: Calculations use paisa/cents integer math to eliminate floating-point drift.
- **Double-Counting Prevention**: Taxes already included in hotel rates are not counted twice.
- **Contingency Buffer**: Explicitly labeled 5% safety buffer for unplanned expenses.

---

## 🧪 Comprehensive Automated Test Suites (45 Tests Passing)

Run tests locally:
```bash
npm test
```

### Suite 1: Master Criteria (`tests/concord.test.ts` — 25 Tests)
- Tokyo, Paris, Kolkata Photon geocoding normalization & coordinate preservation
- Throttling & network outage fallback
- Strict cross-destination offer isolation (Goa, Jaipur, Tokyo, Paris, Kolkata, London)
- Deterministic cost summation and per-traveler equality
- Hard constraint validation: budget ceilings, accessibility, mandatory rest, satisfaction floors

### Suite 2: Hotel Discovery, Live Pricing & Budgeting (`tests/hotels.test.ts` — 20 Tests)
1. Searching for hotels around a valid destination.
2. Empty and failed Overpass responses.
3. Missing hotel names or coordinates skipped without fabrication.
4. Duplicate hotel records deduplicated by OSM ID & proximity.
5. Hotel with no price labeled as directory-only.
6. Hotel with a real returned provider offer.
7. Different check-in and check-out dates calculation.
8. Multiple rooms and guests scaling.
9. Taxes included versus excluded handling.
10. Currency conversion transparency (EUR, USD, INR).
11. Missing Amadeus credentials error handling.
12. Invalid provider credentials error handling.
13. Expired offers detection.
14. Destination changes invalidating previous hotel selections.
15. Correct total-trip and per-traveler costs.
16. Over-budget itinerary rejection and deficit flagging.
17. Renegotiation after hotel selection.
18. Saved-plan persistence with hotel state.
19. Mobile hotel results and filters.
20. Production build module exports verification.

---

## 🌐 Deployment to Render

Deploy to Render in under 3 minutes:
1. Push this repository to GitHub.
2. In Render, select **New Web Service** and connect this repository.
3. Configure settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Set Environment Variables:
   - `GEMMA_API_KEY`: Your hosted Gemma API key.
   - `GEMMA_MODEL`: `gemma-4-26b-a4b-it`
   - `AMADEUS_CLIENT_ID`: (Optional) Amadeus Client ID for live rates.
   - `AMADEUS_CLIENT_SECRET`: (Optional) Amadeus Client Secret.
5. Click **Deploy**.

---

## 📜 License & Disclaimers

All catalog items are clearly marked **"DEMO DATA — NOT LIVE PRICES"**, **"MANUAL ESTIMATES — NOT LIVE PRICES"**, or **"VERIFIED DATA — LIVE PROVIDER"**. Place search is powered by Photon and OpenStreetMap data. Built with Google Gemma 4.
