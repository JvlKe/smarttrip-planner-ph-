import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key)
  throw new Error("Supabase client environment variables are missing.");
export const authStorageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
export const supabase = createClient(url, key, {
  auth: { storageKey: authStorageKey },
});
