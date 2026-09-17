import { supabase } from "./supabase";

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const cache = new Map();
const inflight = new Map();
const CACHE_MS = 60000;
let warmPromise;
let sessionPromise;
let sessionTime = 0;

function getSession() {
  if (!sessionPromise || Date.now() - sessionTime > 5000) {
    sessionTime = Date.now();
    sessionPromise = supabase.auth
      .getSession()
      .then(({ data }) => data.session);
  }
  return sessionPromise;
}

export function warmApi() {
  if (!warmPromise) {
    warmPromise = fetch(`${baseUrl}/health`, { cache: "no-store" }).catch(
      () => null,
    );
  }
  return warmPromise;
}

export function reportClientError(message, path = location.pathname) {
  fetch(`${baseUrl}/client-errors`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: String(message).slice(0, 500), path }),
  }).catch(() => {});
}

export async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const key = `${method}:${path}`;
  const cached = cache.get(key);
  const cacheEnabled =
    method === "GET" && options.cache !== false && !options.signal;
  if (cacheEnabled && cached && Date.now() - cached.time < CACHE_MS)
    return cached.value;
  if (cacheEnabled && inflight.has(key)) return inflight.get(key);

  const task = (async () => {
    const session = await getSession();
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, options.timeoutMs || 15000);
    const attempts = method === "GET" ? 2 : 1;
    try {
      for (let attempt = 0; attempt < attempts; attempt++) {
        try {
          const { timeoutMs, cache: _cache, ...fetchOptions } = options;
          const response = await fetch(`${baseUrl}${path}`, {
            ...fetchOptions,
            cache: options.cache === false ? "no-store" : "default",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              ...(session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {}),
              ...options.headers,
            },
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            const error = new Error(
              body.error ||
                (response.status === 429
                  ? "Too many requests. Please wait and try again."
                  : "Request failed."),
            );
            error.status = response.status;
            throw error;
          }
          if (cacheEnabled) cache.set(key, { time: Date.now(), value: body });
          else cache.clear();
          return body;
        } catch (error) {
          if (controller.signal.aborted)
            throw new Error(
              "The request took too long or was cancelled. Please try again.",
            );
          const temporary = !error.status || error.status >= 500;
          if (!temporary || attempt + 1 >= attempts) throw error;
          await new Promise((resolve) => setTimeout(resolve, 450));
        }
      }
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  })();
  if (cacheEnabled) inflight.set(key, task);
  try {
    return await task;
  } finally {
    if (inflight.get(key) === task) inflight.delete(key);
  }
}

export function clearApiCache() {
  cache.clear();
  sessionPromise = undefined;
  sessionTime = 0;
}
