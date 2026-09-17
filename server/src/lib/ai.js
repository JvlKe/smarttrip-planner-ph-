import { GoogleGenAI } from "@google/genai";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 45000;
const GEMINI_QUOTA_COOLDOWN_MS = 60 * 60 * 1000;

let geminiPausedUntil = 0;
let geminiPauseReason = "";

function errorStatus(error) {
  return Number(
    error?.status ||
      error?.statusCode ||
      error?.code ||
      error?.error?.code ||
      0,
  );
}

function canFallback(error) {
  const status = errorStatus(error);
  const message = String(error?.message || error || "").toLowerCase();
  return (
    !process.env.GEMINI_API_KEY ||
    status === 429 ||
    status >= 500 ||
    error?.name === "AbortError" ||
    /quota|rate.?limit|resource.?exhausted|high demand|overload|timeout|timed out|network|fetch failed|unavailable/.test(
      message,
    )
  );
}

function isGeminiQuotaError(error) {
  const status = errorStatus(error);
  const message = String(error?.message || error || "").toLowerCase();
  return (
    status === 429 ||
    /quota|rate.?limit|resource.?exhausted|requestsperday|free_tier_requests/.test(
      message,
    )
  );
}

function pauseGemini(error) {
  if (error?.geminiCircuitOpen || !isGeminiQuotaError(error)) return;
  geminiPausedUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
  geminiPauseReason = String(error?.message || "Gemini quota unavailable.");
  console.warn(
    `Gemini quota circuit open for ${GEMINI_QUOTA_COOLDOWN_MS / 60000} minutes; Groq will be used directly.`,
  );
}

function assertGeminiAvailable() {
  if (Date.now() >= geminiPausedUntil) return;
  const error = new Error(
    `Gemini is temporarily skipped after a quota error. ${geminiPauseReason}`,
  );
  error.code = 429;
  error.geminiCircuitOpen = true;
  throw error;
}

async function generateWithGemini({ prompt, json, temperature }) {
  assertGeminiAvailable();
  if (!process.env.GEMINI_API_KEY)
    throw Object.assign(new Error("Gemini is not configured."), {
      code: "GEMINI_NOT_CONFIGURED",
    });
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    contents: prompt,
    config: {
      ...(json ? { responseMimeType: "application/json" } : {}),
      temperature,
      abortSignal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    },
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

async function generateWithGroq({
  prompt,
  json,
  temperature,
  model,
  maxTokens,
}) {
  if (!process.env.GROQ_API_KEY)
    throw Object.assign(new Error("Groq is not configured."), {
      code: "GROQ_NOT_CONFIGURED",
    });
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      reasoning_effort: "low",
      max_completion_tokens: maxTokens || (json ? 4096 : 2048),
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || `Groq request failed (${response.status}).`,
    );
    error.status = response.status;
    throw error;
  }
  const text = payload?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty response.");
  return text;
}

function parseJsonResponse(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start)
      throw new SyntaxError("AI returned invalid JSON.");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

export async function generateAiText({
  prompt,
  temperature = 0.4,
  groqModel = process.env.GROQ_ATLAS_MODEL || "openai/gpt-oss-20b",
}) {
  try {
    return {
      text: await generateWithGemini({ prompt, temperature, json: false }),
      provider: "gemini",
    };
  } catch (geminiError) {
    if (!canFallback(geminiError)) throw geminiError;
    pauseGemini(geminiError);
    if (!geminiError?.geminiCircuitOpen)
      console.warn(
        "Gemini unavailable; trying Groq:",
        geminiError?.message || "unknown error",
      );
    return {
      text: await generateWithGroq({
        prompt,
        temperature,
        json: false,
        model: groqModel,
      }),
      provider: "groq",
    };
  }
}

export async function generateAiJson({
  prompt,
  temperature = 0.4,
  groqModel = process.env.GROQ_ITINERARY_MODEL || "openai/gpt-oss-120b",
  maxTokens = 4096,
}) {
  try {
    const text = await generateWithGemini({
      prompt,
      temperature,
      json: true,
    });
    return { data: parseJsonResponse(text), provider: "gemini" };
  } catch (geminiError) {
    const malformedJson = geminiError instanceof SyntaxError;
    if (!malformedJson && !canFallback(geminiError)) throw geminiError;
    pauseGemini(geminiError);
    if (!geminiError?.geminiCircuitOpen)
      console.warn(
        "Gemini JSON unavailable; trying Groq:",
        geminiError?.message || "unknown error",
      );
    try {
      const text = await generateWithGroq({
        prompt,
        temperature,
        json: true,
        model: groqModel,
        maxTokens,
      });
      return { data: parseJsonResponse(text), provider: "groq" };
    } catch (groqJsonError) {
      const groqStatus = errorStatus(groqJsonError);
      const groqMessage = String(groqJsonError?.message || "").toLowerCase();
      if (
        groqStatus === 413 ||
        /request too large|tokens per minute|empty response/.test(groqMessage)
      ) {
        const compactModel =
          process.env.GROQ_ATLAS_MODEL || "openai/gpt-oss-20b";
        console.warn(
          "Groq " +
            groqModel +
            " could not complete the large JSON request; retrying with " +
            compactModel +
            ".",
        );
        const text = await generateWithGroq({
          prompt,
          temperature: Math.min(temperature, 0.25),
          json: true,
          model: compactModel,
          maxTokens,
        });
        return { data: parseJsonResponse(text), provider: "groq" };
      }
      if (groqStatus !== 400) throw groqJsonError;
      console.warn(
        "Groq strict JSON validation failed; retrying with plain JSON output.",
      );
      const text = await generateWithGroq({
        prompt: `${prompt}\n\nIMPORTANT: Return one complete, valid JSON object only. Do not use Markdown fences or add commentary.`,
        temperature: Math.min(temperature, 0.25),
        json: false,
        model: groqModel,
        maxTokens,
      });
      return { data: parseJsonResponse(text), provider: "groq" };
    }
  }
}
