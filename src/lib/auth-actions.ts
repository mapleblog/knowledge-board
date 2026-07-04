"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error?: string; message?: string } | null;

function safeRedirectTarget(redirectTo: FormDataEntryValue | null): string {
  const value = String(redirectTo ?? "");
  // Only allow same-origin, relative paths — reject protocol-relative ("//host")
  // and absolute URLs to avoid an open redirect via a spoofed redirectTo.
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately generic: distinguishing "unconfirmed" from "bad credentials"
    // lets an attacker enumerate which emails have registered accounts.
    return { error: "Incorrect email or password." };
  }

  redirect(redirectTo);
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Same anti-enumeration stance as signIn: never reveal whether the email
    // is already registered, and never echo Supabase's raw message (it can
    // leak the same fact). An existing account gets the identical "check
    // your inbox" response a fresh sign-up gets.
    if (error.message.toLowerCase().includes("already registered")) {
      return { message: "Check your inbox and click the confirmation link to finish setting up your account." };
    }
    return { error: "Could not create the account. Please try again." };
  }

  // Email confirmation required: session is null until the user confirms.
  // (Supabase also takes this path for existing confirmed emails when
  // confirmations are on — it returns a stub user instead of an error.)
  if (!data.session) {
    return { message: "Check your inbox to confirm your email, then log in." };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect("/login?error=sign-out-failed");
  }

  redirect("/login");
}
