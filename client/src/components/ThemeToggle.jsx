import useTheme from "../hooks/useTheme";
import Icon from "./Icon";
export default function ThemeToggle() {
  const { dark, toggleTheme } = useTheme();
  const label = dark ? "Use light mode" : "Use dark mode";
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
