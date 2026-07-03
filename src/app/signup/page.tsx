"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/lib/auth-actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, null);

  return (
    <div className="flow">
      <div className="auth-panel">
        <div className="brand">
          <span className="m" />
          Trailmark
        </div>
        <h1>Create an account</h1>
        <p className="tag">Sequence what to learn next.</p>

        <form action={formAction} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          {state?.error && <p className="auth-error">{state.error}</p>}
          {state?.message && <p className="auth-message">{state.message}</p>}

          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
