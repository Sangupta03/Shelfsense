import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AuthCard, fieldErrors, topError } from "../components/AuthCard";
import { DemoButton } from "../components/DemoButton";
import { Field, FormError } from "../components/Field";
import { Spinner } from "../components/Icon";
import { useSignup } from "../lib/auth";

export function SignupPage() {
  const signup = useSignup();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const errors = fieldErrors(signup.error);

  function submit(e: FormEvent) {
    e.preventDefault();
    signup.mutate({ name, email, password });
  }

  return (
    <AuthCard
      title="Create your shelf"
      subtitle="Free, private, and your products stay yours."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-sky hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required autoFocus />
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          minLength={8}
          required
        />
        <p className="-mt-2 text-xs text-muted">At least 8 characters.</p>
        <FormError message={topError(signup.error)} />
        <button type="submit" className="btn btn-primary w-full py-3" disabled={signup.isPending}>
          {signup.isPending && <Spinner />} Create account
        </button>
      </form>
      <div className="mt-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <div className="mt-5 flex flex-col">
        <DemoButton label="Try the demo — no sign-up" className="w-full py-3" />
      </div>
    </AuthCard>
  );
}
