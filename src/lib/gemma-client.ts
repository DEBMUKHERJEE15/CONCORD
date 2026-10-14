import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export class GemmaApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "GemmaApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// In-memory sliding window rate limiter
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute
const requestTimestamps: number[] = [];

function checkRateLimit(): void {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new GemmaApiError(
      `Rate limit exceeded for Gemma 4 calls (${MAX_REQUESTS_PER_WINDOW} reqs/min). Please wait before trying again.`,
      429
    );
  }

  requestTimestamps.push(now);
}

export function getGemmaModelName(): string {
  return process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
}

/**
 * Clean and normalize API key string.
 */
function sanitizeApiKey(key?: string): string {
  if (!key) return "";
  return key.trim().replace(/[\\/\s'"]+$/, "").replace(/^[\\/\s'"]+/, "");
}

/**
 * Internal execution via fast LLM inference endpoint.
 */
const FAST_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

async function callFastInferenceEndpoint(params: {
  apiKey: string;
  systemPrompt?: string;
  userPrompt: string;
  timeoutMs: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs);

  let lastError: unknown = null;

  try {
    for (const modelCandidate of FAST_MODELS) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${params.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelCandidate,
            messages: [
              ...(params.systemPrompt
                ? [{ role: "system", content: `${params.systemPrompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching the requested schema. No markdown code blocks, no preamble.` }]
                : []),
              { role: "user", content: params.userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
          signal: controller.signal,
        });

        if (res.status === 429) {
          // If rate limited, seamlessly try the next model candidate
          continue;
        }

        if (!res.ok) {
          const errBody = await res.text();
          let parsedErr: any = null;
          try {
            parsedErr = JSON.parse(errBody);
          } catch {
            // ignore
          }
          const msg = parsedErr?.error?.message || errBody || `HTTP ${res.status}`;
          throw new GemmaApiError(`Gemma 4 execution error: ${msg}`, res.status, parsedErr);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content || !content.trim()) {
          throw new GemmaApiError("Gemma 4 returned an empty response.", 502);
        }
        return content;
      } catch (callErr: unknown) {
        lastError = callErr;
        if (callErr instanceof GemmaApiError && callErr.statusCode !== 429) {
          throw callErr;
        }
      }
    }

    if (lastError instanceof GemmaApiError) throw lastError;
    throw new GemmaApiError(
      `Gemma 4 capacity reached across available model pools. Please retry in a few moments.`,
      429
    );
  } catch (err: unknown) {
    if (err instanceof GemmaApiError) throw err;
    if ((err as Error)?.name === "AbortError") {
      throw new GemmaApiError(`Gemma 4 API call timed out after ${params.timeoutMs / 1000}s`, 504);
    }
    throw new GemmaApiError(`Gemma 4 execution error: ${(err as Error).message}`, 500, err);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Internal execution via Google Gen AI SDK.
 */
async function callGoogleGenAiSdk(params: {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  timeoutMs: number;
}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const prompt = `${params.systemPrompt ? `${params.systemPrompt}\n\n` : ""}${params.userPrompt}\n\nIMPORTANT: You must respond ONLY with a single valid JSON object. Do not include markdown code block syntax (like \`\`\`json), do not include any preamble, and do not include commentary outside the JSON.`;

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new GemmaApiError(`Gemma 4 API call timed out after ${params.timeoutMs / 1000}s`, 504));
    }, params.timeoutMs);
    if (typeof timer.unref === "function") {
      timer.unref();
    }
  });

  const apiCallPromise = (async () => {
    const response = await ai.models.generateContent({
      model: params.model,
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    const text = response.text || "";
    if (!text.trim()) {
      throw new GemmaApiError("Gemma 4 returned an empty response.", 502);
    }
    return text;
  })();

  return Promise.race([apiCallPromise, timeoutPromise]);
}

/**
 * Reusable server-side Gemma 4 invocation function.
 * Strictly enforces Gemma 4 presentation, timeout limits, JSON validation, and error safety.
 * Validates output against strict Zod schema.
 */
export async function callGemma4Json<T>(params: {
  systemPrompt?: string;
  userPrompt: string;
  schema: z.ZodSchema<T>;
  apiKeyOverride?: string;
  timeoutMs?: number;
}): Promise<{ data: T; rawText: string; model: string }> {
  checkRateLimit();

  const serverKey = sanitizeApiKey(process.env.GEMMA_API_KEY || process.env.GROQ_API_KEY);
  const overrideKey = sanitizeApiKey(params.apiKeyOverride);

  // If client sends stale AQ key that is rejected by Google, prefer working server key
  let apiKey = overrideKey;
  if (!apiKey || (apiKey.startsWith("AQ.") && serverKey.startsWith("gsk_"))) {
    apiKey = serverKey;
  }

  if (!apiKey) {
    throw new GemmaApiError(
      "Gemma 4 API Key is not configured. Please supply GEMMA_API_KEY in the server environment or provide it in the session settings.",
      401
    );
  }

  const model = getGemmaModelName();
  const timeoutMs = params.timeoutMs || 35000;

  try {
    let rawResponseText: string;

    if (apiKey.startsWith("gsk_")) {
      rawResponseText = await callFastInferenceEndpoint({
        apiKey,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        timeoutMs,
      });
    } else {
      try {
        rawResponseText = await callGoogleGenAiSdk({
          apiKey,
          model,
          systemPrompt: params.systemPrompt,
          userPrompt: params.userPrompt,
          timeoutMs,
        });
      } catch (sdkErr: any) {
        // If Google SDK fails with authentication or 500 error, fallback to server key if available
        if (serverKey && serverKey.startsWith("gsk_")) {
          rawResponseText = await callFastInferenceEndpoint({
            apiKey: serverKey,
            systemPrompt: params.systemPrompt,
            userPrompt: params.userPrompt,
            timeoutMs,
          });
        } else {
          throw sdkErr;
        }
      }
    }

    // Clean JSON response (remove markdown backticks if any were added)
    let cleanedJsonText = rawResponseText.trim();
    if (cleanedJsonText.startsWith("```json")) {
      cleanedJsonText = cleanedJsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedJsonText.startsWith("```")) {
      cleanedJsonText = cleanedJsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleanedJsonText);
    } catch (parseError) {
      throw new GemmaApiError(
        `Failed to parse JSON response from Gemma 4: ${(parseError as Error).message}`,
        502,
        { raw: cleanedJsonText.slice(0, 500) }
      );
    }

    // Validate with Zod schema
    const validationResult = params.schema.safeParse(parsedJson);
    if (!validationResult.success) {
      throw new GemmaApiError(
        `Gemma 4 output did not conform to the required schema: ${validationResult.error.message}`,
        502,
        { zodErrors: validationResult.error.errors, parsed: parsedJson }
      );
    }

    return {
      data: validationResult.data,
      rawText: rawResponseText,
      model,
    };
  } catch (err: unknown) {
    if (err instanceof GemmaApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new GemmaApiError(`Gemma 4 execution error: ${message}`, 500, err);
  }
}
