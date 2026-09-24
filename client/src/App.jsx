import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import { ForgotPassword, ResetPassword } from "./pages/PasswordRecovery";
import AppBoundary from "./components/AppBoundary";
import { api, reportClientError } from "./lib/api";
import ErrorPage from "./pages/ErrorPage";
import Icon from "./components/Icon";
import { profileDisplayName } from "./lib/profileName";
import LandingPage from "./pages/LandingPage";
import { MAPS_ENABLED } from "./lib/releaseScope";

const dashboardImport = () => import("./pages/Dashboard");
const tripsImport = () => import("./pages/TripsPage");
const createTripImport = () => import("./pages/CreateTrip");
const Dashboard = lazy(dashboardImport);
const TripsPage = lazy(tripsImport);
const CreateTrip = lazy(createTripImport);
const TripDetail = lazy(() => import("./pages/TripDetail"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const EditTrip = lazy(() => import("./pages/EditTrip"));
const SharedTrip = lazy(() => import("./pages/SharedTrip"));
const DestinationsPage = lazy(() => import("./pages/DestinationsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const MapPreview = lazy(() => import("./pages/MapPreview"));

const Logo = () => (
  <span className="brand brand-logo">
    <img src="/assets/smarttrip-logo.webp" alt="SmartTrip PH" />
  </span>
);
function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="screen-loader">Loading SmartTrip…</div>;
  return user ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}
function PageEffects() {
  const location = useLocation();
  useEffect(() => {
    const name = location.pathname.startsWith("/app/trips/")
      ? "Trip"
      : location.pathname === "/app/trips"
        ? "My Trips"
        : location.pathname === "/app/create"
          ? "Create Trip"
          : location.pathname === "/app/profile"
            ? "Profile"
            : location.pathname === "/app/destinations"
              ? "Explore Destinations"
              : location.pathname === "/app/map"
                ? "Travel Map"
                : location.pathname === "/app/analytics"
                  ? "Travel Analytics"
                  : location.pathname === "/app/settings"
                    ? "Settings"
                    : location.pathname === "/app"
                      ? "Dashboard"
                      : "SmartTrip Planner";
    document.title = `${name} | SmartTrip PH`;
  }, [location.pathname]);
  useEffect(() => {
    const onError = (event) =>
      reportClientError(event.message || "Window error");
    const onReject = (event) =>
      reportClientError(event.reason?.message || "Unhandled request failure");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);
  return null;
}
function DepartureNotifier() {
  useEffect(() => {
    if (
      localStorage.getItem("tripNotifications") !== "on" ||
      Notification.permission !== "granted"
    )
      return;
    api("/trips")
      .then((trips) => {
        const now = new Date();
        const soon = trips.find((t) => {
          const d = (new Date(t.startDate) - now) / 86400000;
          return d >= 0 && d <= 3;
        });
        if (!soon) return;
        const key = `notice-${soon.id}-${now.toISOString().slice(0, 10)}`;
        if (!localStorage.getItem(key)) {
          new Notification("SmartTrip reminder", {
            body: `${soon.name} starts soon. Review your checklist and bookings.`,
          });
          localStorage.setItem(key, "1");
        }
      })
      .catch(() => {});
  }, []);
  return null;
}
function Shell() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = profileDisplayName(profile, user);
  const menuRef = useRef(null);
  const menuToggleRef = useRef(null);
  const navigation = [
    ["/app", "home", "Dashboard"],
    ["/app/trips", "trips", "My Trips"],
    ["/app/create", "plus", "Create Trip"],
    ["/app/destinations", "pin", "Destinations"],
    ["/app/map", "map", "Travel Map"],
    ["/app/analytics", "chart", "Analytics"],
    ["/app/profile", "user", "Profile"],
    ["/app/settings", "settings", "Settings"],
  ];
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const toggle = menuToggleRef.current;
    const links = [
      toggle,
      ...menuRef.current.querySelectorAll("a, button"),
    ].filter(Boolean);
    links[1]?.focus();
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key === "Tab") {
        const index = links.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          links.at(-1)?.focus();
        } else if (
          !event.shiftKey &&
          (index === links.length - 1 || index === -1)
        ) {
          event.preventDefault();
          toggle?.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      toggle?.focus();
    };
  }, [menuOpen]);
  useEffect(() => {
    document.body.classList.toggle("mobile-menu-open", menuOpen);
    return () => document.body.classList.remove("mobile-menu-open");
  }, [menuOpen]);
  useEffect(() => {
    const preload = () =>
      Promise.allSettled([tripsImport(), createTripImport()]);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 2500);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {"Notification" in window && <DepartureNotifier />}
      <button
        className="mobile-nav-toggle"
        ref={menuToggleRef}
        type="button"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="app-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Icon name={menuOpen ? "close" : "menu"} />
      </button>
      <button
        className={`mobile-nav-backdrop ${menuOpen ? "open" : ""}`}
        type="button"
        aria-label="Close navigation menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        ref={menuRef}
        id="app-navigation"
        className={menuOpen ? "mobile-open" : ""}
      >
        <NavLink className="brand white" to="/">
          <Logo />
        </NavLink>
        <div className="user">
          <span>
            {profile?.avatarData ? (
              <img src={profile.avatarData} alt="" />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </span>
          <div>
            <b>{displayName}</b>
            <small>Explorer</small>
          </div>
        </div>
        <nav onClick={() => setMenuOpen(false)}>
          {navigation.map(([to, icon, label]) => (
            <NavLink key={to} end={to === "/app"} to={to}>
              <Icon name={icon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          className="logout"
          onClick={() => {
            setMenuOpen(false);
            signOut();
          }}
        >
          <Icon name="logout" /> Log out
        </button>
      </aside>
      <div className="app-main" id="main-content" tabIndex="-1">
        <Suspense fallback={<div className="screen-loader">Loading page…</div>}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="trips" element={<TripsPage />} />
            <Route path="trips/:id" element={<TripDetail />} />
            <Route path="trips/:id/edit" element={<EditTrip />} />
            <Route path="create" element={<CreateTrip />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="destinations" element={<DestinationsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="map" element={MAPS_ENABLED ? <MapPage /> : <MapPreview />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </Suspense>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {[
          ["/app", "home", "Home"],
          ["/app/destinations", "map", "Explore"],
          ["/app/create", "plus", "Create"],
          ["/app/trips", "trips", "My Trips"],
          ["/app/profile", "user", "Profile"],
        ].map(([to, icon, label]) => (
          <NavLink
            key={to}
            end={to === "/app"}
            to={to}
            className={to === "/app/create" ? "create-nav-item" : undefined}
          >
            <span>
              <Icon name={icon} size={22} />
            </span>
            <small>{label}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export default function App() {
  const location = useLocation();
  return (
    <AppBoundary resetKey={location.pathname}>
      <PageEffects />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/share/:token"
          element={
            <Suspense fallback={<div className="screen-loader">Loading…</div>}>
              <SharedTrip />
            </Suspense>
          }
        />
        <Route
          path="/app/*"
          element={
            <Protected>
              <Shell />
            </Protected>
          }
        />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </AppBoundary>
  );
}
