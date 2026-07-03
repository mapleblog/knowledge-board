"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/lib/auth-actions";

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <>
      <form action={formAction} className="auth-form">
        <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />
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
    </>
  );
}
