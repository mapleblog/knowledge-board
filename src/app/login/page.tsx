"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/lib/auth-actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <div className="flow">
      <div className="auth-panel">
        <div className="brand">
          <span className="m" />
          Trailmark
        </div>
        <h1>Log in</h1>
        <p className="tag">Pick up where you left off.</p>

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
              autoComplete="current-password"
            />
          </label>

          {state?.error && <p className="auth-error">{state.error}</p>}

          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          No account? <Link href="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
