export default function PasswordGuide({ password = "" }) {
  const checks = [
    ["At least 8 characters", password.length >= 8],
    ["Contains a letter", /[A-Za-z]/.test(password)],
    ["Contains a number", /[0-9]/.test(password)],
    ["Contains a symbol (recommended)", /[^A-Za-z0-9]/.test(password)],
  ];
  return (
    <div className="password-guide">
      <b>Password guide</b>
      <small>
        Required: 8+ characters, a letter, and a number. A symbol makes it
        stronger.
      </small>
      <ul>
        {checks.map(([label, ok]) => (
          <li className={ok ? "ok" : ""} key={label}>
            {ok ? "✓" : "○"} {label}
          </li>
        ))}
      </ul>
      <small>
        Example only: <code>Lakbay2026!</code> — do not copy this exact
        password.
      </small>
    </div>
  );
}
