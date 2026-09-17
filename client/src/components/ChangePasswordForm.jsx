import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import PasswordGuide from "./PasswordGuide";
import PasswordInput from "./PasswordInput";

export default function ChangePasswordForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function changePassword(e) {
    e.preventDefault();
    setMessage("");
    if (
      form.password.length < 8 ||
      !/[A-Za-z]/.test(form.password) ||
      !/[0-9]/.test(form.password)
    )
      return setMessage(
        "New password must contain at least 8 characters, a letter, and a number.",
      );
    if (form.password !== form.confirm)
      return setMessage("New passwords do not match.");
    setBusy(true);
    try {
      const login = await supabase.auth.signInWithPassword({
        email: user.email,
        password: form.current,
      });
      if (login.error) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({
        password: form.password,
      });
      if (error) throw error;
      setForm({ current: "", password: "", confirm: "" });
      setMessage("Password changed successfully.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      id="password"
      className="form-card settings-card"
      onSubmit={changePassword}
    >
      <div className="form-title">
        <span>⚿</span>
        <div>
          <h3>Change password</h3>
          <p>Confirm your current password before choosing a new one.</p>
        </div>
      </div>
      <PasswordInput
        label="Current password"
        value={form.current}
        onChange={(e) => setForm({ ...form, current: e.target.value })}
        required
        autoComplete="current-password"
      />
      <PasswordInput
        label="New password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
        autoComplete="new-password"
      />
      <PasswordGuide password={form.password} />
      <PasswordInput
        label="Confirm new password"
        value={form.confirm}
        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        required
        autoComplete="new-password"
      />
      {message && <p className="settings-message">{message}</p>}
      <div className="inline-actions">
        <span></span>
        <button className="btn primary" disabled={busy}>
          {busy ? "Changing…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
