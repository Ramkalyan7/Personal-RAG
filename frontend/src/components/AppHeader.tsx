import { LogOut } from "lucide-react";

import { useAuth } from "../providers/AuthProvider";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header
      className="sticky top-0 z-20 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="mx-auto flex min-h-[var(--app-header-height)] w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8"
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg) 82%, transparent)",
          backdropFilter: "blur(14px)",
        }}
      >
        <Logo />

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {isAuthenticated && (
            <button className="subtle-button gap-2" onClick={logout} type="button">
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
