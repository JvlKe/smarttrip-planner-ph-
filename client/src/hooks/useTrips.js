import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
export default function useTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/trips");
      setTrips(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { trips, loading, error, reload };
}
