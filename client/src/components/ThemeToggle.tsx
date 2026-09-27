import { setTheme, useTheme } from "../lib/theme";
import { Icon } from "./Icon";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="btn btn-ghost p-2"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {/* show where you'd go: a sun in dark mode, a moon in light mode */}
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}
