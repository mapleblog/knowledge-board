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

**v2.0 — 8.2 Tagging & filtering (2026-07-16, code complete; migration
applied):** Cards can be tagged and the board filtered by tag. **Migration:**
adds `cards.tags text[] not null default '{}'` + a `cards_tags_gin` index —
written to `supabase/migrations/0001_add_tags_to_cards.sql`, mirrored in
`schema.sql`, and `database.types.ts` hand-updated. **Applied to the live project
`bruzjjsqcmmzptamkhrw` via the SQL Editor 2026-07-16** (the Supabase MCP connector
is read-only in this environment — no apply_migration / no read — so it was run
manually). `page.tsx`
defaults `tags ?? []` so reads don't crash pre-migration. **Code:** shared
`normalizeTags`/`parseTags` in `types.ts` (caps: 10 tags/card, 30 chars,
lowercase/trim/dedupe); `createCard`/`updateCard` parse + persist tags
(authoritative); `CardModal` chip editor; clickable `#tag` chips on `StepCard`
(filter the board) + read-only chips in `CardDetailModal`;
`KnowledgeBoardApp.tagFilter` + `visibleCards` + a filter bar. **Design call:**
drag-reorder is disabled while a tag filter is active (reordering a partial list
would corrupt `order_index`); the filter clears on board switch. `tsc` /
`eslint --max-warnings=0` / `next build` all clean. Remaining: run the migration,
then an auth-gated browser pass. Next up: 8.3 Shareable links.

**v2.0 — 8.3 Shareable read-only board links (2026-07-16, code complete;
migration applied):** The app's first public (unauthenticated) read path.
**Migration `0002_shareable_board_links.sql`** (mirrored in `schema.sql`; types
hand-updated): adds `boards.share_token uuid unique` and a `security definer`
`get_shared_board(token)` function that returns a **safe read-only JSON
projection** (board id/name/description/color + cards' id/title/description/url/
status/tags/order_index — **no user_id, no attachments, no token**), matched on
the unguessable token; `search_path=''`, `revoke all from public` +
`grant execute to anon, authenticated`. **Table RLS is NOT loosened** — the
function is the single controlled read path. **Applied to the live project
`bruzjjsqcmmzptamkhrw` via the SQL Editor 2026-07-16.** **Code:** public
route `src/app/share/[token]/page.tsx` (added `/share` to `PUBLIC_PATHS` in
`proxy.ts`) — uuid-guards the token, calls the RPC, `notFound()`s on
invalid/revoked/missing (no enumeration signal), `robots:{index:false}`;
`SharedBoardView` is presentational read-only (no server actions, no
drag/status/delete, attachments excluded), reusing the v1.1 safe-markdown render
(no `rehype-raw`, `javascript:` stripped) plus an `isSafeHttpUrl` guard on
`card.url` as defense-in-depth. Owner UI: `ShareBoardModal` (create/copy/rotate/
revoke) + a 🔗 button in `BoardList`; `setShareToken`/`revokeShareLink` actions
generate the token via `crypto.randomUUID()` with a redundant `user_id` filter
on top of RLS. `tsc` / `eslint --max-warnings=0` / `next build` all clean.
Remaining: run the migration, then a signed-out browser pass. Next up: 8.4 is
parked; v2.0 built set essentially complete.

**v2.0 — 8.4 Card-list virtualization (2026-07-16, shipped, CSS-only):** Chose
the low-risk **CSS `content-visibility`** path over JS windowing (`@tanstack/
react-virtual` + dnd-kit is the hard combo `V2.0-SCOPE.md` flagged — deferred
unless a real 500+-card board proves it's needed). Added
`content-visibility: auto` + `contain-intrinsic-size: auto 140px` to
`.surface .step .card` in `globals.css` so the browser skips layout/paint of
off-screen cards on long boards. **Applied to `.card`, not `.step`,** so the
timeline rail (`.step::before`, overflows its box by -4px) is never paint-clipped
and dnd-kit still measures the fully-rendered `.step` node — **all cards stay
mounted, so drag-reorder math is unaffected**; `.card.dragging` gets
`content-visibility: visible` so the dragged card is never deferred mid-drag. No
new deps, no JS, transparent below the fold, no visual/behavioral change at the
designed 10s–100 cards/board scale. `tsc` / `eslint --max-warnings=0` /
`next build` all clean. This closes the v2.0 built set (8.1–8.4). True JS
windowing stays a documented build-if-needed follow-up for 500+-card boards.

**v2.0 — 8.3 share route now returns real HTTP 404 (2026-07-16):** A signed-out
curl pass found `/share/<bad-token>` returned **HTTP 200** (with the `noindex`
meta) instead of 404 — a "soft 404". Root cause per Next 16's own docs
(`not-found.md` / `loading.md` "Status Codes"): a **streamed** response can't
change its status after headers flush, and the root `app/loading.tsx` skeleton
wrapped every route (incl. `/share`) in a Suspense boundary, so the share page's
RPC `await` streamed the fallback → 200 before `notFound()` ran. **Fix:** moved
the dashboard `page.tsx` + `loading.tsx` into a **`(dashboard)` route group** (URL
`/` unchanged — route groups are path-transparent) so the streaming skeleton is
scoped to the dashboard only; `/share` now renders non-streamed and
`notFound()` sets a true **404**. `error.tsx` stays at the app root as the global
error boundary (error boundaries don't stream, so they don't reintroduce the
bug). Verified on a local prod server (`next build && next start`): malformed and
valid-format-nonexistent tokens both now **HTTP 404**, `noindex` meta still
present, dashboard `/` still 307→`/login` when unauthed, `/login` 200. `tsc` /
`eslint --max-warnings=0` / `next build` clean.

**Security review — v2.0 (2026-07-16):** Focused security pass over the v2.0
diff (`518629a..e244b31`: move cards, tagging, shareable links). **Result: no
HIGH/MEDIUM-confidence exploitable findings.** Verified: (1) `get_shared_board`
is `security definer` with `search_path=''` and every object schema-qualified,
returns only safe read-only fields (no `user_id`/`share_token`/attachments),
matched on the unguessable uuid token, `revoke from public` + grant to
`anon`/`authenticated` only — table RLS stays owner-only, no injection (typed
uuid bind param); (2) `/share/[token]` uuid-guards + `notFound()`s uniformly on
invalid/revoked/missing (no enumeration), `robots:noindex`; (3) no XSS on the
public page — React escaping + v1.1 safe markdown (no `rehype-raw`,
`javascript:` stripped) + `isSafeHttpUrl` guard on `card.url`; (4) `moveCard`/
`setShareToken`/`revokeShareLink` all do `getUser()` + explicit `user_id` filter
on top of RLS (no cross-tenant move/share); (5) `proxy.ts` `/share` public-path
match doesn't over-match (`/shareXYZ` excluded); (6) tags are parameterized +
normalized server-side. Static review only — the complementary live check is the
signed-out share round-trip (create → load logged-out → revoke → 404).

**Docs — CLAUDE.md refreshed (2026-07-23, `45339ee`, pushed to `origin/main`):**
Ran `/init` over the repo and rewrote `CLAUDE.md` around the existing workflow
rules (doc map, triggers, Hard Constraints kept verbatim). **Added:** the
build/lint/typecheck commands plus the project's real verification standard —
**no test framework exists**, so the gate is `tsc --noEmit` +
`eslint --max-warnings=0` + `next build`, then a manual (auth-gated) browser
pass, with status codes checked on `build && start` not `dev`; the
hand-applied-migration + hand-maintained `database.types.ts` workflow; and a
big-picture architecture section (server fetch → single client shell → Server
Actions + `revalidatePath`, RLS as the boundary with `get_shared_board` as the
only public read path, fractional `order_index` + per-card debounce, the
signed-upload/storage-delete ordering rule, the `(dashboard)` route group's
soft-404 purpose, `globals.css` as the design system). **Restored** the binding
AGENTS.md Next.js-16 rule as an explicit note (the `@AGENTS.md` import had been
dropped). **Fixed doc paths:** every rule now points at the real locations under
`docs/` (`prd.md`, `DESIGN.md`, `wireframe.html`, `themes.html`, `mockup.html`);
working docs (`TASKS.md`, `STATUS.md`, `*-AUDIT.md`) stay at root, and the note
records that `finalize.md` was never created for this project. No code touched.

**Note (unrelated to attachments):** `get_advisors` had flagged two pre-existing, non-blocking security warnings. (1) `public.touch_updated_at` mutable `search_path` — **fixed 2026-07-03**: pinned empty via live migration `pin_search_path_on_touch_updated_at`, mirrored in `supabase/schema.sql`, and confirmed gone from the advisor report. (2) Leaked-password protection disabled in Auth — **deferred 2026-07-14: confirmed Pro-gated** (the "Prevent use of leaked passwords" toggle under Authentication → Sign In / Providers → Passwords requires the Supabase Pro plan; greyed out on Free). Dashboard-only, no API/SQL surface to automate. Non-blocking hardening item; enable after upgrading to Pro.
