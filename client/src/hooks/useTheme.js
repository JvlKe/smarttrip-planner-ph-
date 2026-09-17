import { useSyncExternalStore } from "react";

const eventName = "smarttrip-theme-change";
const getTheme = () =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";
function subscribe(listener) {
  const onStorage = (event) => {
    if (event.key === "theme") {
      document.documentElement.dataset.theme =
        event.newValue === "dark" ? "dark" : "light";
      listener();
    }
  };
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", onStorage);
  };
}
export default function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme);
  const toggleTheme = () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* Theme still works if storage is blocked. */
    }
    window.dispatchEvent(new Event(eventName));
  };
  return { dark: theme === "dark", toggleTheme };
}
