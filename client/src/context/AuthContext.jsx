import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { api, clearApiCache, warmApi } from "../lib/api";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    localStorage.removeItem("smarttripGuestMode");
    if ("indexedDB" in window) indexedDB.deleteDatabase("smarttrip-guest");
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) warmApi();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      clearApiCache();
      setSession(next);
      if (next) warmApi();
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    if (!session) {
      setProfile(null);
      return () => {
        active = false;
      };
    }
    api("/profile")
      .then((value) => active && setProfile(value))
      .catch(() => active && setProfile(null));
    return () => {
      active = false;
    };
  }, [session]);
  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      setProfile,
      clearDeletedAccount: () => {
        setSession(null);
        setProfile(null);
        clearApiCache();
      },
      loading,
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
