# Code Audit — Phase 0 (Foundation)

Date: 2026-07-03

## Automated checks

- `npx tsc --noEmit` — clean, exit 0.
- `npx eslint .` — clean, exit 0.

## Architecture review

| Item | Verdict | Notes |
|---|---|---|
| Next.js 16 App Router setup | Correct | `src/proxy.ts` correctly follows the Next 16 rename (`middleware.ts` → `proxy.ts`), matching `node_modules/next/dist/docs/.../proxy.md`: named `proxy` export, located at the root of `src` (alongside `app/`), matcher excludes `_next/static`/`_next/image`/favicon/images. |
| Supabase client split (browser/server) | Correct | Clean separation: `src/lib/supabase/client.ts` for Client Components, `server.ts` for RSC/Server Actions (async, cookie-bridged), `proxy.ts`'s `updateSession` handles cookie refresh + route protection. Standard `@supabase/ssr` pattern; no service-role key exposed to the client. |
| Domain types (`src/lib/types.ts`) | Good | Mirrors `supabase/schema.sql` 1:1 (`Board`, `Card`, `Attachment`, `BoardWithCards`). `BoardColor` is derived from a single `BOARD_COLORS` const — no duplicated color list to drift out of sync. |
| `supabase/schema.sql` | Solid | RLS policies correctly scope `cards`/`attachments` transitively through `boards` via `exists` subqueries; fractional `order_index` avoids renumbering rows on reorder; `updated_at` trigger applied only to `cards` (matches the type — the only table with that column). Sensible indexes (`cards_board_order_idx`, `attachments_card_idx`). |
| `.env` / `.env.example` | Minor inconsistency | `.env.example`'s comment says "copy to `.env.local`" but the tracked convention in this repo uses `.env` (both are valid Next.js env files; the comment is just stale). `.env` is correctly gitignored and not tracked. |
| `globals.css` "Flow" design system | Reasonable | Scoped under `.flow` with CSS custom properties; doesn't leak into global Tailwind resets beyond base `html`/`body` styles. |
| Dead code | Clean | `src/lib/sample-data.ts` (Phase 0 seed data) has been deleted now that Phase 2 wired real Supabase queries — no orphaned references remain. |

## Summary

No bugs or architecture violations found in the Phase 0 scaffolding. The proxy file convention, RLS design, type/schema parity, and Supabase client/server split are all implemented correctly per Next.js 16 conventions and the PRD. The only nit is the stale `.env`/`.env.local` comment in `.env.example` — cosmetic, not functional.

## Suggested next steps

- Fix the `.env.example` comment to match the actual `.env` convention used in this repo.
- Move on to reviewing Phase 2 (boards CRUD) code currently uncommitted in the working tree.

---

# Code Audit — Phase 1 (Authentication)

Date: 2026-07-03

```
Item: src/proxy.ts (Next 16 proxy entry)
  Verdict: ✅ Correct
  Notes:   Matches Next 16 convention per node_modules/next/dist/docs/.../proxy.md — named `proxy` export, root-level file, delegates to updateSession(), config.matcher negative-lookahead excludes _next/static, _next/image, favicon, images.

Item: src/lib/supabase/proxy.ts — updateSession() route protection
  Verdict: ✅ Fixed
  Notes:   isPublicPath() now exact-matches PUBLIC_PATHS (or a `${path}/` segment prefix), and the overly broad "/auth" entry was narrowed to "/auth/confirm" specifically — a future path like /authorize no longer incorrectly matches as public. supabase.auth.getUser() is now wrapped in try/catch: on a Supabase/network error the request is treated as unauthenticated (redirected to /login with redirectTo preserved for protected paths, or passed through unchanged for already-public paths) instead of throwing an uncaught 500. redirectTo is consumed downstream by signIn (see below), no longer dead code.

Item: src/lib/supabase/server.ts (Server Components/Actions client)
  Verdict: ✅ Correct
  Notes:   Standard @supabase/ssr pattern; setAll() try/catch (L20-27) correctly swallows the expected "read-only cookies in Server Component" error, relying on the proxy for actual cookie refresh.

Item: src/lib/supabase/client.ts (Browser client)
  Verdict: ✅ Correct
  Notes:   Only reads NEXT_PUBLIC_* env vars. No service-role key exposure anywhere in src/.

Item: src/lib/auth-actions.ts — signIn()
  Verdict: ✅ Fixed
  Notes:   redirectTo is now carried from the proxy's query param through login/page.tsx (async searchParams) and LoginForm.tsx's hidden field, validated by safeRedirectTarget() (same-origin relative paths only, rejects "//host" and absolute URLs), and used in the post-login redirect. The "email not confirmed" branch was collapsed into the same generic "Incorrect email or password." message as bad credentials, closing the enumeration gap. No presence/format validation on email/password before calling Supabase remains (empty strings passed through via `String(... ?? "")`) — not addressed by this fix.

Item: src/lib/auth-actions.ts — signUp()
  Verdict: ✅ Correct
  Notes:   Password length enforced both client-side (signup/page.tsx:31 minLength={8}) and server-side (L35-37) — good defense in depth. Correctly branches on "no session returned" to show an email-confirmation message instead of assuming an immediate redirect (L50-52).

Item: src/lib/auth-actions.ts — signOut()
  Verdict: ✅ Fixed
  Notes:   signOut() now checks the `error` returned by supabase.auth.signOut() (rather than try/catch, since redirect() itself throws internally and a naive try/catch would swallow it) and redirects to /login?error=sign-out-failed on failure instead of /login on both paths silently. CSRF remains covered by Next.js Server Actions' built-in same-origin header check.

Item: src/app/auth/confirm/route.ts (email confirmation handler)
  Verdict: ✅ Fixed
  Notes:   login/page.tsx now reads `error` from searchParams alongside redirectTo and renders a mapped message via an ERROR_MESSAGES lookup (currently covering "confirmation-failed" and "sign-out-failed"), so a failed confirmation or sign-out no longer drops the user at a blank login form.

Item: src/app/login/page.tsx, src/app/signup/page.tsx
  Verdict: ✅ Correct
  Notes:   Straightforward useActionState-driven client components. Minor a11y nit: error text has no aria-live region. Consistent with the redirectTo gap above — no hidden field forwards it from the query string into the form submission.

Item: src/components/auth/SessionMenu.tsx (logout)
  Verdict: ✅ Correct
  Notes:   Logout is a plain form bound to the signOut server action — correct, minimal pattern.

Item: Service-role key / secret exposure
  Verdict: ✅ Correct
  Notes:   No service-role key usage found anywhere in src/; only anon key + NEXT_PUBLIC_* vars reach the client.

Item: Open redirect risk (redirectTo)
  Verdict: ✅ Correct
  Notes:   redirectTo is derived from request.nextUrl.pathname (server-controlled), not an arbitrary user-supplied host, so even once wired up it would not be an open-redirect vector.
```

## Summary

Phase 1 auth is functionally complete and secure at the boundary (no key leakage, no open-redirect, CSRF covered by Next's built-in same-origin check, RLS independently verified per STATUS.md). The gaps are correctness/UX, not security-critical: `redirectTo` is set by the proxy but never consumed by `signIn`, so post-login redirect-to-original-page doesn't actually work; the unconfirmed-email error branch narrows the generic bad-credentials message enough to allow limited account enumeration; `getUser()` and `signOut()` lack error handling for the (rare) case Supabase itself throws; and the `confirmation-failed` query param from the email-confirm route has no UI consumer.

## Suggested next steps

- ~~Wire `redirectTo` through the login form (hidden field or read from `searchParams`) and use it in `signIn`'s redirect instead of hardcoding `/`.~~ Fixed 2026-07-03.
- ~~Collapse the unconfirmed-email branch into the same generic error message as bad credentials, or explicitly accept the enumeration tradeoff if intentional.~~ Fixed 2026-07-03.
- ~~Wrap `signOut()`'s Supabase call in try/catch so a failure still shows a user-facing error instead of an unhandled exception.~~ Fixed 2026-07-03 (checked the returned `error` instead, since `redirect()` throws internally).
- ~~Read `?error=confirmation-failed` in `login/page.tsx` and render a message.~~ Fixed 2026-07-03.
- ~~Tighten `isPublicPath` to exact-match known public routes instead of `startsWith`.~~ Fixed 2026-07-03.
- ~~Wrap `supabase.auth.getUser()` in `updateSession()` so a Supabase/network error fails safe to `/login` instead of throwing uncaught.~~ Fixed 2026-07-03.
