import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";

export function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, signup } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate replace to="/projects" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({ full_name: fullName, email, password });
      navigate("/projects", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-92px)] max-w-7xl items-center justify-center px-5 py-12 sm:px-8 lg:py-20">
      <div className="w-full max-w-xl">
        <section className="glass-panel rounded-[2.25rem] p-6 sm:p-8 lg:p-10">
          <div className="mb-8 space-y-3">
            <p className="section-kicker">Sign up</p>
            <h1 className="display-face text-[2.3rem] leading-[0.95] sm:text-[2.7rem]">Sign up.</h1>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <FieldLabel htmlFor="signup-name" label="Full name" />
            <TextInput
              id="signup-name"
              onChange={setFullName}
              placeholder="Jane Doe"
              type="text"
              value={fullName}
            />
            <FieldLabel htmlFor="signup-email" label="Email" />
            <TextInput
              autoComplete="email"
              id="signup-email"
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
            <FieldLabel htmlFor="signup-password" label="Password" />
            <TextInput
              autoComplete="new-password"
              id="signup-password"
              onChange={setPassword}
              placeholder="Minimum 8 characters"
              type="password"
              value={password}
            />
            <FieldLabel htmlFor="signup-confirm-password" label="Re-enter password" />
            <TextInput
              autoComplete="new-password"
              id="signup-confirm-password"
              onChange={setConfirmPassword}
              placeholder="Re-enter your password"
              type="password"
              value={confirmPassword}
            />

            {error ? (
              <p className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "#8b2b2b", color: "#ffb8b8" }}>
                {error}
              </p>
            ) : null}

            <button className="primary-button auth-submit-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-sm muted-copy">
            Already have an account?{" "}
            <Link className="font-semibold underline underline-offset-4" to="/login">
              Login
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
