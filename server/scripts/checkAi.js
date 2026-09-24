import "dotenv/config";

// Sends only a fixed diagnostic prompt. Never log response bodies or credentials.
const checks = [
  ["Groq", process.env.GROQ_API_KEY, () => fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({model:process.env.GROQ_ATLAS_MODEL || "openai/gpt-oss-20b",messages:[{role:"user",content:"Reply with OK."}],max_tokens:128}), signal:AbortSignal.timeout(20000),
  })],
  ["Gemini", process.env.GEMINI_API_KEY, () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-3-flash-preview"}:generateContent`, {
    method: "POST", headers: {"x-goog-api-key":process.env.GEMINI_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{parts:[{text:"Reply with OK."}]}]}), signal:AbortSignal.timeout(20000),
  })],
];
for (const [name,key,check] of checks) {
  if (!key || /your_|placeholder/.test(key)) { console.log(`${name}: not configured`); continue; }
  try { const response = await check(); console.log(`${name}: HTTP ${response.status}`); if (!response.ok) process.exitCode = 1; }
  catch { console.log(`${name}: network error or timeout`); process.exitCode = 1; }
}
