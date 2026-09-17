import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PasswordGuide from "../components/PasswordGuide";
import PasswordInput from "../components/PasswordInput";
import ThemeToggle from "../components/ThemeToggle";

function RecoveryLayout({ children, step }) {
  return (
    <main className="auth-layout recovery-layout">
      <section className="auth-brand recovery-brand">
        <Link className="brand brand-logo auth-brand-logo" to="/">
          <img src="/assets/smarttrip-logo.webp" alt="SmartTrip PH" />
        </Link>
        <div>
          <span className="eyebrow">TRAVEL WITH PEACE OF MIND</span>
          <h1>Your adventures are still waiting for you.</h1>
          <p>
            Secure your account, then get back to planning memorable journeys
            across the Philippines.
          </p>
          <div className="recovery-security-note">
            <span aria-hidden="true">✓</span>
            <p>
              <strong>Secure account recovery</strong>
              Reset links are time-limited and can only be used once.
            </p>
          </div>
        </div>
      </section>
      <section className="auth-panel recovery-panel">
        <div className="auth-theme-action">
          <ThemeToggle />
        </div>
        <div className="recovery-step" aria-label={`Recovery step ${step} of 2`}>
          <span className={step >= 1 ? "active" : ""} />
          <span className={step >= 2 ? "active" : ""} />
          <small>Step {step} of 2</small>
        </div>
        {children}
      </section>
    </main>
  );
}
export function ForgotPassword() {
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function send(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    setMessage(
      error
        ? error.message
        : "If that email exists, a reset link has been sent.",
    );
    setBusy(false);
  }
  return (
    <RecoveryLayout step={1}>
      <form className="auth-card" onSubmit={send}>
        <span className="eyebrow">ACCOUNT RECOVERY</span>
        <h2>Forgot your password?</h2>
        <p>
          Enter the email linked to your SmartTrip account and we’ll send you a
          secure reset link.
        </p>
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {message && <p className="settings-message">{message}</p>}
        <button className="btn primary big" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
        <small>
          <Link to="/login">← Back to sign in</Link>
        </small>
      </form>
    </RecoveryLayout>
  );
}
export function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (password !== confirm) return setMessage("Passwords do not match.");
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    )
      return setMessage("Use at least 8 characters with a letter and number.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else {
      setMessage("Password updated. Redirecting…");
      setTimeout(() => nav("/app"), 800);
    }
    setBusy(false);
  }
  return (
    <RecoveryLayout step={2}>
      <form className="auth-card" onSubmit={save}>
        <span className="eyebrow">SECURE YOUR ACCOUNT</span>
        <h2>Create a new password</h2>
        <p>
          Choose something memorable to you and difficult for anyone else to
          guess.
        </p>
        <PasswordInput
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <PasswordGuide password={password} />
        <PasswordInput
          label="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
        {message && <p className="settings-message">{message}</p>}
        <button className="btn primary big" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
        <small className="recovery-help">
          Remembered your password? <Link to="/login">Back to sign in</Link>
        </small>
      </form>
    </RecoveryLayout>
  );
}
