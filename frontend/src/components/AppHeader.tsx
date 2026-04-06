import { Link } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header
      className="sticky top-0 z-20 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="flex w-full items-center justify-between gap-4 px-5 py-4 sm:px-8"
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg) 82%, transparent)",
          backdropFilter: "blur(14px)",
        }}
      >
        <Link
          className="display-face text-[1.35rem] leading-none sm:text-[1.45rem]"
          to="/"
        >
          Ask Vault
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {isAuthenticated && (
            <button className="subtle-button" onClick={logout} type="button">
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
