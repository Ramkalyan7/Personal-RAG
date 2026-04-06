import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "../lib/api";

type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type SignupPayload = {
  email: string;
  full_name: string;
  password: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  signup: (payload: SignupPayload) => Promise<void>;
  token: string | null;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = "personal-rag-auth-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function initializeSession() {
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const currentUser = await apiRequest<AuthUser>("/auth/me", { token });
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void initializeSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function login(payload: LoginPayload) {
    const response = await apiRequest<TokenResponse>("/auth/login", {
      body: JSON.stringify(payload),
      method: "POST",
    });
    persistSession(response);
  }

  async function signup(payload: SignupPayload) {
    const response = await apiRequest<TokenResponse>("/auth/signup", {
      body: JSON.stringify(payload),
      method: "POST",
    });
    persistSession(response);
  }

  function persistSession(response: TokenResponse) {
    localStorage.setItem(AUTH_STORAGE_KEY, response.access_token);
    setToken(response.access_token);
    setUser(response.user);
    setIsInitializing(false);
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsInitializing(false);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(token && user),
      isInitializing,
      login,
      logout,
      signup,
      token,
      user,
    }),
    [isInitializing, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
