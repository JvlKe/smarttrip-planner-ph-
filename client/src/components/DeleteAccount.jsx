import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearApiCache } from "../lib/api";
import { supabase, authStorageKey } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "./PasswordInput";

export default function DeleteAccount() {
  const dialog = useRef(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { clearDeletedAccount } = useAuth();
  const navigate = useNavigate();
  function open() {
    setPassword("");
    setConfirmation("");
    setError("");
    dialog.current.showModal();
  }
  async function remove(event) {
    event.preventDefault();
    if (busy || confirmation !== "DELETE" || !password) return;
    setBusy(true);
    setError("");
    try {
      const result = await api("/profile", {
        method: "DELETE",
        body: JSON.stringify({ password, confirmation }),
        timeoutMs: 30000,
      });
      if (result.deleted !== true)
        throw new Error(
          "Deletion was not confirmed. Please try signing in again.",
        );
      clearApiCache();
      try {
        sessionStorage.setItem("smarttrip-account-deleted", "1");
      } catch {
        /* Route state also carries this confirmation. */
      }
      try {
        localStorage.removeItem("smarttrip-create-draft");
      } catch {
        /* Storage may be unavailable. */
      }
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      // Deletion is already confirmed; failed logout networking must not leave
      // the removed account's credentials on this device.
      try {
        localStorage.removeItem(authStorageKey);
        localStorage.removeItem(`${authStorageKey}-user`);
        localStorage.removeItem(`${authStorageKey}-code-verifier`);
      } catch {
        /* Storage may be unavailable. */
      }
      clearDeletedAccount();
      navigate("/login", { replace: true, state: { accountDeleted: true } });
    } catch (failure) {
      setError(failure.message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="btn danger-outline" type="button" onClick={open}>
        Delete account
      </button>
      <dialog
        ref={dialog}
        className="delete-account-dialog"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <form onSubmit={remove}>
          <h2 id="delete-account-title">Permanently delete your account?</h2>
          <p id="delete-account-description">
            This permanently removes your SmartTrip login, profile, trips,
            itineraries, budgets, checklists, favorites, and shared-trip links.
            This cannot be undone.
          </p>
          <PasswordInput
            label="Current password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            disabled={busy}
          />
          <label>
            Type DELETE to confirm
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
              disabled={busy}
            />
          </label>
          {error && (
            <p className="delete-account-error" role="alert">
              {error}
            </p>
          )}
          <div className="delete-account-buttons">
            <button
              className="btn ghost"
              type="button"
              autoFocus
              disabled={busy}
              onClick={() => dialog.current.close()}
            >
              Cancel
            </button>
            <button
              className="btn danger"
              type="submit"
              disabled={busy || confirmation !== "DELETE" || !password}
            >
              {busy ? "Deleting…" : "Permanently delete account"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
