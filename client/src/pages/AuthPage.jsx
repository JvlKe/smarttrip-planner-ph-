import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PasswordGuide from "../components/PasswordGuide";
import PasswordInput from "../components/PasswordInput";
import ThemeToggle from "../components/ThemeToggle";
import BrandLogo from "../components/BrandLogo";
import Icon from "../components/Icon";
export default function AuthPage({ mode }) {
  const register = mode === "register",
    navigate = useNavigate(),
    location = useLocation(),
    { user } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [accountDeleted] = useState(() => {
    try {
      return Boolean(
        location.state?.accountDeleted ||
        sessionStorage.getItem("smarttrip-account-deleted"),
      );
    } catch {
      return Boolean(location.state?.accountDeleted);
    }
  });
  useEffect(() => {
    if (accountDeleted) {
      try {
        sessionStorage.removeItem("smarttrip-account-deleted");
      } catch {}
    }
  }, [accountDeleted]);
  if (user) return <Navigate to="/app" replace />;
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (
      register &&
      (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
    )
      return setError(
        "Password must contain at least one letter and one number.",
      );
    if (register && form.password !== form.confirmPassword)
      return setError("Passwords do not match.");
    setBusy(true);
    try {
      if (register) {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.fullName } },
        });
        if (error) throw error;
        if (!data.session)
          throw new Error(
            "Registration succeeded, but no session was created. Check email-confirmation settings.",
          );
        await api("/profile", {
          method: "PUT",
          body: JSON.stringify({ fullName: form.fullName }),
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
      }
      navigate(location.state?.from || "/app", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className={`fresh-auth-page ${register ? "fresh-auth-register" : "fresh-auth-login"}`}
    >
      <header className="fresh-auth-mobile-header">
        <Link className="fresh-auth-back" to="/" aria-label="Back to home">
          ←
        </Link>
        <BrandLogo />
        <ThemeToggle />
      </header>
      <aside className="fresh-auth-story">
        <BrandLogo inverse />
        <div className="fresh-auth-story-copy">
          <h1>Your next Philippine adventure starts here.</h1>
          <p>
            Plan smarter, explore deeper, and keep every important trip detail
            together.
          </p>
          <blockquote>
            “SmartTrip keeps the itinerary flexible, the budget visible, and the
            journey easy to understand.”
          </blockquote>
        </div>
        <div className="fresh-auth-chips">
          <span>Palawan</span>
          <span>Siargao</span>
          <span>Batanes</span>
        </div>
      </aside>
      <section className="fresh-auth-panel">
        <div className="fresh-auth-topline">
          <ThemeToggle />
          <span>{register ? "Already registered?" : "New here?"}</span>
          <Link to={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </div>
        <form className="fresh-auth-card" onSubmit={submit}>
          <div className="fresh-auth-emblem">
            <Icon name="plane" size={24} />
          </div>
          <div className="fresh-auth-switch" aria-label="Authentication mode">
            <Link className={!register ? "active" : ""} to="/login">
              Log in
            </Link>
            <Link className={register ? "active" : ""} to="/register">
              Sign up
            </Link>
          </div>
          {accountDeleted && (
            <p className="fresh-auth-status" role="status">
              Your account has been deleted.
            </p>
          )}
          <h2>{register ? "Create your account" : "Welcome back"}</h2>
          <p>
            {register
              ? "Start planning your next Philippine trip."
              : "Sign in to continue planning your trips."}
          </p>
          {register && (
            <label>
              Full name
              <input
                className="fresh-auth-input"
                name="fullName"
                value={form.fullName}
                onChange={update}
                required
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              className="fresh-auth-input"
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              required
              autoComplete="email"
            />
          </label>
          <PasswordInput
            label="Password"
            name="password"
            minLength="8"
            value={form.password}
            onChange={update}
            required
            autoComplete={register ? "new-password" : "current-password"}
          />
          {register && <PasswordGuide password={form.password} />}{" "}
          {register && (
            <PasswordInput
              label="Confirm password"
              name="confirmPassword"
              minLength="8"
              value={form.confirmPassword}
              onChange={update}
              required
              autoComplete="new-password"
            />
          )}
          {!register && (
            <div className="fresh-auth-options">
              <label className="fresh-remember">
                <input type="checkbox" defaultChecked /> Keep me signed in
              </label>
              <Link className="forgot-link" to="/forgot-password">
                Forgot password?
              </Link>
            </div>
          )}
          {error && <div className="form-error">{error}</div>}
          <button
            className="fresh-button fresh-button-orange fresh-auth-submit"
            disabled={busy}
          >
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            {!busy && <span aria-hidden="true">→</span>}
          </button>
          <small className="fresh-auth-alternate">
            {register ? "Already have an account?" : "New to SmartTrip?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </small>
          <small className="fresh-auth-terms">
            By continuing you agree to use SmartTrip responsibly.
          </small>
        </form>
      </section>
    </main>
  );
}
