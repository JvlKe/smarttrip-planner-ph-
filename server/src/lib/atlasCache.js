import { createHash } from "node:crypto";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "could",
  "do",
  "does",
  "for",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "please",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "you",
  "your",
]);

const PRIVATE_PATTERN =
  /\b(my|our|mine|account|email|phone|booking|reference|password|token|secret|api key|database|address|full name|trip id)\b/i;
const SAFE_TOPIC_PATTERN =
  /\b(smarttrip|atlas|trip|itinerary|budget|cost|map|street view|share|export|pdf|poster|checklist|packing|transport|vehicle|destination|travel|safety|emergency|profile|notification|mobile|password)\b/i;

export function normalizeAtlasQuestion(question) {
  return question
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word))
    .join(" ");
}

export function atlasFingerprint(normalized) {
  return createHash("sha256").update(normalized).digest("hex");
}

export function isSafeAtlasCacheQuestion(question) {
  return (
    question.length <= 240 &&
    SAFE_TOPIC_PATTERN.test(question) &&
    !PRIVATE_PATTERN.test(question) &&
    !/\b\d{5,}\b/.test(question)
  );
}

export function atlasSimilarity(left, right) {
  const a = new Set(left.split(" ").filter(Boolean));
  const b = new Set(right.split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((word) => b.has(word)).length;
  if (shared < 2) return 0;
  const jaccard = shared / new Set([...a, ...b]).size;
  const containment = shared / Math.min(a.size, b.size);
  return Math.max(jaccard, containment * 0.9);
}
