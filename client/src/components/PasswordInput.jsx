import { useState } from "react";

export default function PasswordInput({ label, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="password-field">
      {label}
      <span className="password-input-wrap">
        <input
          {...inputProps}
          aria-label={label}
          type={visible ? "text" : "password"}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((value) => !value)}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? "◉" : "◎"}
        </button>
      </span>
    </label>
  );
}
