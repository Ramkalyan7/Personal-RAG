import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const authScreen =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <header className="sticky top-0 z-20 border-b" style={{ borderColor: "var(--border)" }}>
      <div
        className="flex w-full items-center justify-between px-5 py-4 sm:px-8"
        style={{ backgroundColor: "color-mix(in srgb, var(--bg) 88%, transparent)" }}
      >
        <Link className="display-face text-[1.35rem] leading-none sm:text-[1.45rem]" to="/">
          Ask Vault
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{user?.full_name}</p>
                <p className="text-[0.68rem] uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                  {user?.email}
                </p>
              </div>
              <Link
                className="secondary-button px-4 py-2.5 text-[0.66rem]"
                to="/projects"
              >
                Projects
              </Link>
              <button
                className="primary-button px-4 py-2.5 text-[0.66rem]"
                onClick={logout}
                type="button"
              >
                Logout
              </button>
            </>
          ) : (
            !authScreen && (
              <>
                <Link className="secondary-button px-4 py-2.5 text-[0.66rem]" to="/login">
                  Log In
                </Link>
                <Link className="primary-button px-4 py-2.5 text-[0.66rem]" to="/signup">
                  Sign Up
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
}
