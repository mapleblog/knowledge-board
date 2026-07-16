# Status — Blocking Points

Tracks work that is code-complete but cannot be finished or verified because
it depends on external/manual setup. See [`TASKS.md`](TASKS.md) for the full
task breakdown. Format must including "Phrase", "Blocking Description", "Actions Required",

| Phase | Blocking Description | Actions Required | Progress Status |
|---|---|---|---|
| Phase 0 — Foundation | Resolved. Live Supabase project created; `.env` filled with project URL + anon key. | None — verified via `curl` against `/auth/v1/settings` (valid key, reached real project) and via the running dev server (auth redirect to `/login` confirms env wiring end-to-end). | Done. |
| Phase 1 — Authentication | Resolved. Cross-user RLS verified: `schema.sql` had not actually been applied to the live project (Table Editor showed no tables despite Phase 0 checklist); ran it manually via the SQL Editor, then confirmed isolation with a throwaway two-user script (User A/B each created a board; neither could read the other's row, `select *` only returned each user's own board). | None. | Done. Sign-up, login, logout, `proxy.ts` route protection, server-side session read, and cross-user RLS are all verified end-to-end. |
| Phase 2 — Boards CRUD | Resolved. Manually verified in a browser 2026-07-03: create (with and without accent color — default color auto-assigned), edit (name/description/color persist across reload), delete with confirmation (gone after reload), and the zero-boards empty state all work. | None. | Done. |
| Phase 3 — Cards CRUD + ordering | Resolved (desktop). Manually verified in a browser 2026-07-03: create (title-only and full), detail modal with clickable URL (new tab), edit, delete with confirmation, drag-reorder + reload-persistence (incl. two cards dragged within 300ms — debounce fix holds). During verification the drag handle was widened from the ⋮⋮ grip to the whole card (grip was too narrow to grab): listeners moved to the card div with a click-after-drag guard, grip is now decorative, card uses `touch-action: manipulation` so touch scrolling still works (`StepCard.tsx`, `globals.css`). | None — touch drag-reorder also confirmed 2026-07-03 (press-hold drag reorders; swipe still scrolls), and the status cycle (next up → in progress → done, inner-dot style, tooltips, reload persistence) verified the same day. | Done. |
| Phase 4 — Attachments | Resolved. Connected to the live Supabase project (`bawjdscthwgnwcnziawo` — **note: this project was later deleted; the live backend is now `bruzjjsqcmmzptamkhrw`, see the "Supabase project migration" note below**) via the Supabase MCP connector and created the private `attachments` Storage bucket (`public: false`, `file_size_limit: 5242880` bytes, `allowed_mime_types: image/png, image/jpeg, image/webp, application/pdf`), then applied the three storage RLS policies (select/insert/delete) from the bottom of `supabase/schema.sql` as a migration. Verified live: `storage.buckets` row confirms private + limits, `pg_policies` confirms all three policies exist on `storage.objects`, and `get_advisors` (security) reports no issues tied to the attachments bucket or its policies. | Manually exercise upload/preview/download/delete in a browser to confirm the end-to-end UX. First click-test (2026-07-03) failed with "Could not prepare upload": storage logs showed 400s on the sign-upload endpoint, traced to all three storage policies using an unqualified `name` that Postgres resolved to `boards.name` inside the EXISTS subquery instead of `storage.objects.name` — the ownership check compared card ids against board titles and always denied. Fixed via live migration `fix_attachment_policies_qualify_object_name` (policies recreated with `objects.name`, verified in `pg_policy`) and mirrored in `schema.sql` with a warning comment. After the fix, the full click-through passed 2026-07-03: upload (image + PDF), >5MB rejection, wrong-type rejection, image preview, download link, and delete all verified in a browser. | Done. |
| Phase 5 — Responsive & polish | Manual mobile testing found and fixed two bugs: (1) top bar (brand / "+ New board" / session menu) overlapped/crowded below ~520px — the initial two-row wrap still overflowed on narrow phones (New board + email + Log out don't fit one row), so the top bar was converted to a navbar: on ≤520px the actions collapse into a hamburger-toggled dropdown, desktop layout unchanged (`KnowledgeBoardApp.tsx`, `src/app/globals.css`). (2) Browser console reported a hydration attribute mismatch — traced to `@dnd-kit`'s `DndContext` generating its `aria-describedby` instance ids from an internal counter that isn't stable across SSR vs. client hydration; fixed by passing an explicit `id={`path-${boardId}`}` to `DndContext` (`TimelinePath.tsx`, `KnowledgeBoardApp.tsx`). Board/card CRUD manually confirmed working on a phone-sized viewport. | Remaining: the new-user 2-minute path check. Loading/error/empty states done 2026-07-04 (route `loading.tsx` skeleton + `error.tsx` retry boundary + `page.tsx` now throws on fetch error instead of masking it as empty + card-level `.path-empty`; `tsc`/`eslint`/`next build` clean). Accessibility pass done 2026-07-04: shared `Modal` primitive (dialog role/aria-modal/aria-labelledby, Tab focus trap, Escape-to-close, focus restore) with all five modals refactored onto it; status node is now a labeled `<button>` (keyboard-operable) with a focus ring; accent swatches got per-radio aria-labels + focus ring; keyboard drag already worked via @dnd-kit KeyboardSensor. Build/type/lint clean; dev smoke passed. Interactive focus-trap/Escape click-through is auth-gated → still worth a manual browser pass. New-user path check done 2026-07-04 (traced): authenticated zero-boards empty state → BoardModal (name autofocused) → new board auto-selects and shows the card-level empty state → CardModal (title autofocused) = ~4 guided interactions, no tutorial; confirmed the confirm link auto-signs-in same-browser and reworded the signup message that implied a separate login. **Phase 5 complete.** | Mobile CRUD, top-bar fix, hydration fix, and touch drag-reorder all browser-verified 2026-07-03. Loading/error/empty states + accessibility pass + new-user path check all landed 2026-07-04. Phase 5 done; next is Phase 6 (deployment). Final stopwatch/click-through of the auth-gated flows is a quick manual pass on a live account. |

| Phase 6 — Deployment | Resolved. Deployment config + docs prepared 2026-07-04 (README "Deploying to Vercel", Supabase Auth URL steps, "Free-tier limits & upgrade path"; zero-config, two `NEXT_PUBLIC_SUPABASE_*` env vars, confirm route uses request origin). Pushed to GitHub 2026-07-14 after a clean `tsc` / `eslint --max-warnings=0` / `next build` (`b6e3cac..3b20fe1`). **Deployed live 2026-07-14 at `knowledge-board-maple.vercel.app`**: Vercel import of `mapleblog/knowledge-board` with the two env vars, Supabase Auth Site/Redirect URLs pointed at the domain, and the README "Production smoke test" (sign up → board → card → attachment → reorder) passed on the live URL. | None. | Done. |

**Next step:** mobile top bar, hydration warning, and the reorder debounce fix all re-verified in a browser 2026-07-03 (two cards dragged within 300ms both persisted after reload). Boards CRUD (Phase 2) and cards CRUD + reorder (Phase 3, desktop) browser-verified 2026-07-03; the drag handle was also widened to the whole card during verification. The full manual browser verification pass completed 2026-07-03: boards CRUD, cards CRUD, drag-reorder (desktop + touch), attachments (after fixing the storage-policy denial bug), status cycle, mobile top bar, and hydration warning are all verified. **Phase 5 is now complete** (landed 2026-07-04): loading/error/empty states, the accessibility pass (shared `Modal` primitive with focus trap/Escape/roles, labeled keyboard-operable status node, swatch labels), and the new-user 2-minute path check. **Phase 6 — Deployment is complete (2026-07-14):** the config + docs were prepared 2026-07-04 (README "Deploying to Vercel" guide, Supabase Auth URL steps, free-tier limits + upgrade path; zero-config, two `NEXT_PUBLIC_SUPABASE_*` env vars, confirm route uses the request origin). The code was pushed to GitHub (`b6e3cac..3b20fe1`) after a clean `tsc` / `eslint` / `next build`, imported into Vercel with the two env vars, and the Supabase Auth Site/Redirect URLs were pointed at the domain. **The app is now live at `knowledge-board-maple.vercel.app`, and the README "Production smoke test" (sign up → board → card → attachment → reorder) passed on the live URL.** All six phases (0–6) are now done — the MVP is shipped. Remaining open items are non-blocking: the leaked-password Auth toggle (dashboard-only, may need Pro) and the deferred post-MVP roadmap (v1.1 / v2.0 in `TASKS.md`).

**v1.1 — 7.1 Search (2026-07-15):** Client-side card search shipped. New
`CardSearch.tsx` in the top bar (inside `.top-actions`, so it collapses into the
hamburger dropdown ≤520px) filters every already-loaded card by case-insensitive
substring on title/description/url over `initialBoards` — no query, server
action, or DB/RLS change. Results are grouped by board (accent dot + title +
windowed, highlighted snippet); clicking one selects that board and opens its
`CardDetailModal`. Keyboard: `/` or `Cmd/Ctrl+K` focuses (suppressed while
typing), arrows + Enter navigate, Escape clears then blurs; empty state shows
"No cards match …". Highlight regex escapes the query. `tsc` /
`eslint --max-warnings=0` / `next build` all clean. Remaining: a live
phone-viewport browser pass (auth-gated). Next up: 7.2 Markdown descriptions.

**v1.1 — 7.2 Markdown descriptions (2026-07-15):** Card descriptions now render
as GitHub-flavored markdown in the detail modal. Added `react-markdown@10.1.0` +
`remark-gfm@4.0.1`; new `Markdown.tsx` wrapper renders `card.description` in
`CardDetailModal`. Storage is unchanged (the plain-text column stays the
markdown *source* — no DB migration). **Security:** `rehype-raw` deliberately
NOT enabled and the default `urlTransform` kept, so raw HTML is escaped and
`javascript:` links are stripped; a custom `a` component forces
`target="_blank" rel="noreferrer noopener"`. Verified via a server-render test —
`<img onerror>` escapes to inert text, `[x](javascript:…)` → `href=""`, normal
links keep the safe rel, GFM tables/task lists render. Timeline card preview
(`StepCard`) left as plain text. `CardModal` textarea gained a "Markdown
supported" hint. `tsc` / `eslint --max-warnings=0` / `next build` all clean.
(The 2 moderate `npm audit` warnings are pre-existing — postcss inside Next's
own tree — not from the new deps.) Next up: 7.3 Google OAuth.

**v1.1 — 7.3 Google OAuth (2026-07-15, code complete; external setup pending):**
The code side of "Continue with Google" is done. New `auth/callback/route.ts`
exchanges the OAuth `?code` for a session (`exchangeCodeForSession` — distinct
from the email flow's `verifyOtp`), redirecting to `/` on success or
`/login?error=oauth-failed` on failure, origin-based so it works on any domain.
New client `GoogleButton.tsx` starts the flow via `signInWithOAuth({ provider:
'google', redirectTo: `${origin}/auth/callback` })`; added to both `LoginForm`
and the signup page with an "or" divider + Google-icon styling. **Bug caught &
fixed during build:** `/auth/callback` had to be added to `PUBLIC_PATHS` in
`proxy.ts` — otherwise the unauthenticated callback gets redirected to `/login`,
dropping `?code`. RLS unchanged (OAuth users get the same `auth.uid()`).
**Account-linking decision:** rely on Supabase's default link-by-verified-email
(Google emails are verified → same address = same account); confirm the Auth
setting during live testing. `tsc` / `eslint --max-warnings=0` / `next build`
clean; `/auth/callback` registered. **Still needs the account owner** (like the
Vercel deploy): Google Cloud OAuth client + consent screen, enabling Google in
Supabase Auth with the client ID/secret, and the 3-environment (localhost /
preview / prod) round-trip test. This completes the v1.1 code; Phase 7 is
code-complete pending that external config.

**Repo hygiene — branch cleanup (2026-07-15):** Consolidated to a single
branch. The stale `master` (15 commits behind, fully contained in `main`) was
removed on GitHub: switched the repo's default branch `master` → `main` (via
`gh repo edit --default-branch main` after installing + authenticating the
GitHub CLI), then `git push origin --delete master` and pruned local tracking
refs. Final state: local `main` only, remote `origin/main` only, GitHub default
`main` (confirmed `git ls-remote --symref origin HEAD` → `refs/heads/main`). No
history lost. `gh` 2.96.0 is now installed and authenticated on this machine.

**Code review (2026-07-03):** a full quality & architecture check ran clean on `tsc --noEmit` and `eslint`; architecture judged sound (layering, RLS + server-side re-checks, signed-upload verification). One real bug found and **fixed same day**: `KnowledgeBoardApp.tsx`'s shared reorder debounce timeout dropped card A's pending write when card B was dragged within 300ms — pending writes are now keyed per card in a `pendingReorders` Map and flushed on unmount (`tsc`/`eslint` clean; browser-verified 2026-07-03 — two cards dragged within 300ms both persisted after reload). The second finding — error-swallowing in the void server actions (`deleteBoard`, `deleteCard`, `reorderCard`, `updateCardStatus`, `deleteAttachment`) — is also fixed: all five now return `{ error }` state, delete modals and the attachment row report via `useActionState` (modal stays open with the error), and reorder/status-toggle failures show a dismissible banner while revalidating so the optimistic UI snaps back. The unreachable `in_progress` status is also fixed: timeline nodes now cycle next up → in progress → done → next up, with a distinct in-progress node style. Remaining smaller consistency items are listed under "Code review follow-ups" in [`TASKS.md`](TASKS.md). Nothing blocks Phase 5/6.

**Supabase project migration (2026-07-15):** The live backend moved to project
ref **`bruzjjsqcmmzptamkhrw`** (`bruzjjsqcmmzptamkhrw.supabase.co`). The original
project **`bawjdscthwgnwcnziawo`** referenced elsewhere in this file and in code
comments is **deleted** — its domain no longer resolves (DNS NXDOMAIN). This was
found while diagnosing slow loads on `knowledge-board-lovat.vercel.app`: the live
Vercel build still had `NEXT_PUBLIC_SUPABASE_URL=bawjdscthwgnwcnziawo` baked in,
so every request stalled on the dead host (public `/login` still rendered because
`proxy.ts` catches the auth failure and falls through, but authenticated board
loads could never reach the DB). Local `.env` was already on the new project.
**Fix:** update the two `NEXT_PUBLIC_SUPABASE_*` env vars on Vercel to the new
project and **redeploy** (they're inlined into the client bundle at build time,
so a saved-but-not-redeployed change has no effect), and repoint Supabase Auth
Site/Redirect URLs at the Vercel domain. The new project was verified 2026-07-15:
`boards`/`cards`/`attachments` tables + RLS, the private `attachments` storage
bucket, and all three `storage.objects` policies are present. (Historical
references to `bawjdscthwgnwcnziawo` below are left intact for provenance.)
**Resolved 2026-07-16:** the two `NEXT_PUBLIC_SUPABASE_*` env vars were updated
on Vercel and redeployed. The final open item — repointing Supabase Auth
Site/Redirect URLs at the live domain — was also done: login was redirecting to
`http://localhost:3000` (ERR_CONNECTION_REFUSED) because the new project's **Site
URL** still defaulted to localhost. Setting Site URL to the Vercel domain (and
allow-listing `<domain>/**` + `http://localhost:3000/**` for redirects) fixed it;
authenticated dashboard now loads on the live URL. Migration fully complete.
**Domain correction (2026-07-16):** the live production domain is
**`knowledge-board-lovat.vercel.app`** — the `knowledge-board-maple.vercel.app`
in the dated Phase 6 entries above is stale; treat `-lovat` as authoritative.

**v1.1 — 7.3 Google OAuth VERIFIED (2026-07-16):** the external setup is done and
the round-trip works. Google Cloud OAuth client created (authorized redirect URI
`https://bruzjjsqcmmzptamkhrw.supabase.co/auth/v1/callback`), Google provider
enabled in Supabase Auth with the client ID/secret, and Site/Redirect URLs
allow-list the live domain + localhost. "Continue with Google" was clicked
end-to-end and landed an authenticated session on `/`. **This completes Phase 7
(v1.1) — all three features (Search, Markdown, Google OAuth) are now shipped and
verified.** Remaining open items are the same non-blocking pair as before: the
leaked-password Auth toggle (Pro-gated) and the deferred v2.0 roadmap.

**v2.0 scoping drafted (2026-07-16):** [`V2.0-SCOPE.md`](V2.0-SCOPE.md) scopes the
four roadmap items — move cards between boards (M, no migration), tagging +
filtering (M–L, `tags text[]` + GIN migration), shareable read-only board links
(L, **security-critical** — first public read path, via a `security definer`
`get_shared_board(token)` fn + `/share/[token]` route; attachments deliberately
kept private for v2.0), and card-list virtualization (parked until usage shows
boards >~100 cards). Recommended order: Move → Tag → Share → (Virtualize if
needed). Nothing built yet — scoping only.

**v2.0 — 8.1 Move cards between boards (2026-07-16, code complete):** New
`moveCard(cardId, destBoardId)` server action (`card-actions.ts`) verifies
destination-board ownership, then repoints `board_id` + appends at
`max(order_index)+1`. **No migration** — attachments follow via unchanged
`card_id` (Storage objects are pathed by `card_id`), and RLS already covers both
sides (update `using` = source ownership, `with check` = destination ownership).
`CardDetailModal` gained a "Move to board" dropdown (hidden when the user has
only one board); `KnowledgeBoardApp.handleMoveCard` moves the card optimistically
(drop from source, append to destination, close modal) and snaps back via the
`.save-error` banner on failure. `.move-card`/`.move-row` styles added.
`tsc` / `eslint --max-warnings=0` / `next build` all clean. Remaining: an
auth-gated browser pass (move a card with an attachment + URL, confirm it lands
at the destination end and its attachment/link survive). Next up: 8.2 Tagging.

**Note (unrelated to attachments):** `get_advisors` had flagged two pre-existing, non-blocking security warnings. (1) `public.touch_updated_at` mutable `search_path` — **fixed 2026-07-03**: pinned empty via live migration `pin_search_path_on_touch_updated_at`, mirrored in `supabase/schema.sql`, and confirmed gone from the advisor report. (2) Leaked-password protection disabled in Auth — **deferred 2026-07-14: confirmed Pro-gated** (the "Prevent use of leaked passwords" toggle under Authentication → Sign In / Providers → Passwords requires the Supabase Pro plan; greyed out on Free). Dashboard-only, no API/SQL surface to automate. Non-blocking hardening item; enable after upgrading to Pro.
