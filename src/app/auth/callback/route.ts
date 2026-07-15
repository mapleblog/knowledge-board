import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback (Google). The provider redirects back here with `?code`, which
 * we exchange for a session. This is a *different* exchange from the email
 * confirmation route (`auth/confirm` uses `verifyOtp`). Mirrors that route's
 * origin-based redirect so it works on any domain (localhost / preview / prod).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth-failed`);
}
