import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-[calc(100vh-81px)] items-center justify-center px-6">
        <div className="w-full max-w-xl space-y-4">
          <div className="loading-bar rounded-full" />
          <div className="skeleton h-5 w-[48%]" />
          <div className="skeleton h-4 w-[72%]" />
          <div className="skeleton h-4 w-[64%]" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <>{children}</>;
}
