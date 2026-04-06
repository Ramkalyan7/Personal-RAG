import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate replace to="/projects" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate((location.state as { from?: string } | null)?.from ?? "/projects", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to log in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-92px)] max-w-7xl items-center justify-center px-5 py-12 sm:px-8 lg:py-20">
      <div className="w-full max-w-xl">
        <section className="glass-panel rounded-[2.25rem] p-6 sm:p-8 lg:p-10">
          <div className="mb-8 space-y-3">
            <p className="section-kicker">Login</p>
            <h1 className="display-face text-[2.3rem] leading-[0.95] sm:text-[2.7rem]">Log in.</h1>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <FieldLabel htmlFor="login-email" label="Email" />
            <TextInput
              autoComplete="email"
              id="login-email"
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
            <FieldLabel htmlFor="login-password" label="Password" />
            <TextInput
              autoComplete="current-password"
              id="login-password"
              onChange={setPassword}
              placeholder="Enter your password"
              type="password"
              value={password}
            />

            {error ? (
              <p className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "#8b2b2b", color: "#ffb8b8" }}>
                {error}
              </p>
            ) : null}

            <button className="primary-button auth-submit-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Logging In..." : "Log In"}
            </button>
          </form>

          <p className="mt-6 text-sm muted-copy">
            New here?{" "}
            <Link className="font-semibold underline underline-offset-4" to="/signup">
              Sign up
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

type FieldLabelProps = {
  htmlFor: string;
  label: string;
};

function FieldLabel({ htmlFor, label }: FieldLabelProps) {
  return (
    <label className="field-label" htmlFor={htmlFor}>
      {label}
    </label>
  );
}

type TextInputProps = {
  autoComplete?: string;
  id: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: "email" | "password" | "text";
  value: string;
};

function TextInput({ autoComplete, id, onChange, placeholder, type, value }: TextInputProps) {
  return (
    <div className="field-shell">
      <input
        autoComplete={autoComplete}
        className="field-input w-full"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </div>
  );
}
