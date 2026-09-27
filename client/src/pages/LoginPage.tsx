import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AuthCard, fieldErrors, topError } from "../components/AuthCard";
import { DemoButton } from "../components/DemoButton";
import { Field, FormError } from "../components/Field";
import { Spinner } from "../components/Icon";
import { useLogin } from "../lib/auth";

export function LoginPage() {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const errors = fieldErrors(login.error);

  function submit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to see your shelf and your latest report."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-sky hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required autoFocus />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <FormError message={topError(login.error)} />
        <button type="submit" className="btn btn-primary w-full py-3" disabled={login.isPending}>
          {login.isPending && <Spinner />} Log in
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
