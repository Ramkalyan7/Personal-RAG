import { MoonStar, SunMedium } from "lucide-react";

import { useTheme } from "../providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      className="flex h-10 w-10 items-center justify-center rounded-full border"
      onClick={toggleTheme}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-soft)",
        cursor: "pointer",
      }}
      type="button"
    >
      {theme === "dark" ? (
        <SunMedium aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
      ) : (
        <MoonStar aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
      )}
    </button>
  );
}
