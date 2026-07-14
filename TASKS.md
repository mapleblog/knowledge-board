# Tasks — Trailmark Knowledge Board

Phased task breakdown derived from [`docs/prd.md`](docs/prd.md). Each phase is
shippable on its own. Check items off as they land.

**Legend:** `[x]` done · `[ ]` todo · `[~]` partially done / scaffolded

---

## Phase 0 — Foundation (scaffolded)

The interactive UI shell already renders against in-memory seed data.

- [x] Next.js 16 (App Router) + TypeScript + Tailwind v4 project
- [x] "Flow" design system ported to `src/app/globals.css`
- [x] Domain types (`src/lib/types.ts`) mirroring the DB schema
- [x] Board list, timeline path, sortable step card components
- [x] @dnd-kit drag-to-reorder (local state only)
- [x] Supabase SQL schema with RLS + `updated_at` trigger (`supabase/schema.sql`)
- [x] Supabase browser/server client helpers scaffolded (`src/lib/supabase/`)
- [x] Create Supabase project; run `schema.sql`; create the attachments storage bucket
- [x] Fill `.env` from `.env.example` (URL + anon key); verify client connects

---

## Phase 1 — Authentication (PRD §2 Auth, §4 Security)

Gate the app behind email/password before any board data is created.

- [x] Email/password sign-up flow (Supabase Auth)
- [x] Login flow + error states (bad credentials, unconfirmed email)
- [x] Logout / session menu
- [x] Server-side session read in App Router (`proxy.ts` + `server.ts` helper — Next 16 renamed `middleware.ts` to `proxy.ts`)
- [x] Route protection: redirect unauthenticated users to `/login`
- [x] Verify RLS: a user cannot read another user's boards/cards/attachments (needs a live Supabase project — see Phase 0)

---

## Phase 2 — Boards CRUD (PRD §2 Board creation, accent color)

Replace seed boards with the user's real, persisted boards.

- [x] Fetch boards for the signed-in user (server component / action)
- [x] Create board: name (required) + optional description + accent color picker (preset palette)
- [x] Auto-assign a default accent color when skipped
- [x] Edit board (name, description, color)
- [x] Delete board with confirmation (cascades to cards/attachments)
- [x] Dashboard list wired to live data with per-board progress + accent ring
- [x] Empty state for a user with zero boards

---

## Phase 3 — Cards CRUD + ordering (PRD §2 Card creation, Reordering)

The core "learning path" loop, persisted.

- [x] Fetch cards for a board ordered by `order_index`
- [x] Create card: title (required) + optional description + URL; appended to end
- [x] Card detail view (modal/side panel): full description, clickable URL (new tab)
- [x] Edit card
- [x] Delete card with confirmation
- [x] Persist drag-reorder via fractional `order_index` (single-row write per move)
- [x] Optimistic UI on reorder; debounced write; survives page reload
- [x] Verify reorder works on touch (phone-sized viewport) — verified 2026-07-03 via devtools touch emulation (press-hold drag reorders; swipe still scrolls)

---

## Phase 4 — Attachments (PRD §2 Attachments, §4 Storage)

- [x] Signed upload to Supabase Storage from the card form
- [x] Client-side validation: png/jpg/webp/pdf, ≤ 5MB, clear rejection errors
- [x] Server/storage-rule validation (authoritative) for type + size
- [x] Persist `attachments` row (path, name, size, mime)
- [x] Attachment preview (images) + download link in card detail view
- [x] Delete attachment (and remove storage object)
- [x] Create private `attachments` Storage bucket (5MB limit, png/jpg/webp/pdf) + apply storage RLS policies

---

## Phase 5 — Responsive & polish (PRD §2 Responsive, success criteria)

- [x] Full drag-reorder + CRUD verified on a phone-sized viewport (touch) — board/card CRUD and touch drag-reorder all confirmed 2026-07-03
- [x] Fix: mobile top bar (brand / "+ New board" / session menu) crowded and overlapped below 520px — the earlier two-row wrap still overflowed row 2 on narrow phones, so the top bar is now a navbar: on ≤520px the actions collapse into a hamburger-toggled dropdown; desktop layout unchanged (`KnowledgeBoardApp.tsx`, `src/app/globals.css`)
- [x] Fix: hydration mismatch from `@dnd-kit`'s auto-generated `aria-describedby` instance ids not matching between SSR and client — pinned via explicit `DndContext` `id={`path-${boardId}`}` (`TimelinePath.tsx`, `KnowledgeBoardApp.tsx`)
- [x] Fix: drag handle too narrow — reordering required grabbing the small ⋮⋮ grip. The whole card is now the drag handle (5px pointer activation keeps clicks working, click-after-drag guard keeps the detail modal from opening on drop, `touch-action: manipulation` keeps touch scrolling working); grip is decorative (`StepCard.tsx`, `globals.css`)
- [x] Loading / error / empty states across boards and cards — added a route
  `loading.tsx` skeleton (two-column shell, shimmer, respects
  `prefers-reduced-motion`) shown while `page.tsx` fetches; a route `error.tsx`
  boundary (Next 16.2 `unstable_retry`) so a failed boards fetch offers a retry
  instead of masquerading as the empty state; `page.tsx` now throws on the
  Supabase fetch error instead of swallowing it; and a card-level empty state
  (`.path-empty`) for a board with zero steps. Board-level empty state (Phase 2)
  and mutation error/pending states (delete modals, reorder/status banner,
  modal "Saving…") already existed
- [x] Accessibility pass (keyboard drag, focus traps in modals, labels) — new
  shared `Modal` primitive (`Modal.tsx`) gives every dialog `role="dialog"` +
  `aria-modal` + `aria-labelledby`, a Tab focus trap, Escape-to-close, and
  focus restoration to the trigger on close; all five modals (board/card
  create-edit, card detail, delete board/card) refactored onto it (also removes
  the copy-pasted overlay markup). Timeline status node is now a real
  `<button>` with an `aria-label` (was a click-only `<span>` with just a
  `title`), so status cycling is keyboard-operable; added a `:focus-visible`
  ring. Board accent swatches got per-radio `aria-label`s + a keyboard focus
  ring. Keyboard drag-reorder was already wired via @dnd-kit's `KeyboardSensor`.
  `tsc`/`eslint`/`next build` clean; dev-server smoke passed (routes serve, no
  runtime errors). Note: the interactive focus-trap/Escape flow is auth-gated,
  so click-through in a browser is still worth a manual pass
- [x] New-user path: create board + first card in under 2 minutes, no tutorial
  — flow traced end-to-end and judged to meet the criterion: once authenticated
  the zero-boards empty state ("Start your first board" + CTA) → `BoardModal`
  (name autofocused, description/color optional) → the new board auto-selects
  and shows the card-level empty state ("…add your first one below") →
  `CardModal` (title autofocused). That's 2 dialogs / 2 required fields / ~4
  interactions, each guided by empty-state copy, so no tutorial is needed; the
  0→1-board transition auto-selects the new board (no dead-end). Confirmed the
  email-confirm link (`/auth/confirm`) sets the session and redirects to `/`,
  so same-browser signup lands straight in the app; reworded the signup
  success message that had implied a mandatory separate login step. Email
  delivery latency is external and outside the in-app 2-minute measure. Final
  stopwatch pass is a quick manual check on a live account

---

## Code review follow-ups (2026-07-03 quality & architecture check)

Static checks (`tsc --noEmit`, `eslint`) clean. Architecture judged sound
(server actions / components / types layering, RLS + server-side re-checks,
signed-upload flow). Findings below, worst first.

**Bugs**

- [x] Fix: rapid reorders lose writes — `KnowledgeBoardApp.tsx` used one shared
  `reorderTimeout` not keyed by card, so dragging card A then card B within
  300ms cancelled A's pending `reorderCard` write (A snapped back after the
  next refetch). Fixed: pending writes now keyed per card id in a
  `pendingReorders` Map, and any still-debounced writes are flushed on unmount
- [x] Surface errors from fire-and-forget actions (`deleteBoard`, `deleteCard`,
  `reorderCard`, `updateCardStatus`, `deleteAttachment`) — they swallowed
  Supabase errors and returned `void`, so failures looked like success until
  the next refetch. Fixed: all five now return `{ error }` state; the delete
  modals + attachment row use `useActionState` (stay open / show the error,
  pending label on the button), and reorder/status-toggle errors surface in a
  dismissible `.save-error` banner in `KnowledgeBoardApp`. `reorderCard` /
  `updateCardStatus` also revalidate on failure so the optimistic UI snaps
  back to server truth
- [x] Decide on `in_progress`: the node toggle only flipped done ↔ todo, so
  `in_progress` (and its pill style) was unreachable dead state. Fixed by
  making it reachable: clicking a timeline node now cycles
  next up → in progress → done → next up (`STATUS_CYCLE` in
  `KnowledgeBoardApp.tsx`), with an inner-dot node style for in-progress
  (`.step.in-progress` in `globals.css`) and a status-aware tooltip on the
  node (`StepCard.tsx`)

**Quality / consistency**

- [x] Deduplicate `PathCard` (was defined in `KnowledgeBoardApp.tsx`,
  `TimelinePath.tsx`, `StepCard.tsx`; inlined again in `BoardWithCards` and
  `CardDetailModal`) — now a single exported `CardWithAttachments` in
  `src/lib/types.ts`, used everywhere
- [x] Type the Supabase client with generated DB types and drop the
  `boards as BoardWithCards[]` cast in `page.tsx`. Done: DB types generated
  from the live project into `src/lib/supabase/database.types.ts` (regenerate
  after schema changes), browser/server clients are now
  `create*Client<Database>`, and `page.tsx` narrows the text `color`/`status`
  columns to the domain unions via `resolveBoardColor`/`resolveCardStatus`
  (new in `types.ts`; `board-actions.ts` reuses the color resolver)
- [x] Align signup with login's anti-enumeration stance — signup returned
  "already exists" and raw `error.message` (`auth-actions.ts`). Fixed: an
  already-registered email now gets the identical "Check your inbox…" message
  a fresh sign-up gets, and other Supabase errors return a generic "Could not
  create the account" instead of echoing `error.message`
- [x] Low: batch `getAttachmentUrl` calls (was one server action per
  attachment on card-detail open). Fixed: `getAttachmentUrls(paths[])` signs
  all of a card's attachments in one `createSignedUrls` storage call, fetched
  once by `CardDetailModal` (keyed on the path list, so board refetches don't
  re-sign unchanged attachments) and passed down to a now-presentational
  `AttachmentItem`
- [x] Low: note fractional `order_index` limits in `schema.sql` — done: the
  column comment now documents the no-rebalancing float-exhaustion limit
  (~50 midpoint splits into one gap; fix is renumbering 1..n) and the
  `createCard` max+1 read-then-insert race across sessions (harmless beyond
  nondeterministic ordering; resolved by the next drag)
- [x] Cosmetic: `linkLabel` showed "co" for `example.co.uk` (`board.ts`) —
  fixed with a small two-part public-suffix heuristic (co/com/net/org/gov/
  edu/ac + 2-letter ccTLD steps one label left); verified against
  example.co.uk, bbc.co.uk, amazon.com.au, github.com, localhost
- [~] Supabase advisor follow-ups (also in STATUS.md): `search_path` on
  `public.touch_updated_at` is now pinned empty — applied to the live project
  as migration `pin_search_path_on_touch_updated_at` and mirrored in
  `supabase/schema.sql`; advisor warning gone. Leaked-password protection is
  an Auth dashboard toggle with no API/SQL surface — enable manually:
  Dashboard → Authentication → Sign In / Providers → Passwords → "Prevent use
  of leaked passwords" (may require the Pro plan)

---

## Code review follow-ups (2026-07-13 quality & architecture check)

Re-ran the full check after the five UI commits (`a532d45`..`1ebd0e3`).
Architecture unchanged and still sound. `tsc --noEmit` / `next build` were
clean; `eslint` had regressed (item 1). All findings below fixed same day;
`tsc`, `eslint --max-warnings=0`, and `next build` all clean afterwards.

- [x] Fix: eslint regression — the attachment-open popup-blocked fallback in
  `StepCard.tsx` used `window.location.href = url`, which the
  `react-hooks/immutability` rule rejects as an error (lint exited 1; `next
  build` unaffected since Next no longer lints during build). Fixed with the
  semantically identical `window.location.assign(url)`
- [x] Fix: deleting a card or board orphaned its attachment files in Storage —
  `deleteCard`/`deleteBoard` relied on the DB cascade, which removes the
  `attachments` *rows* but not the bucket objects, leaking unreachable files
  against the free-tier quota. Fixed: both actions now collect the affected
  `file_path`s and `storage.remove()` them **before** the row delete (order
  matters: the storage delete policy traces ownership through the `cards`
  row, so it must still exist when remove() runs). `deleteAttachment` already
  cleaned up correctly
- [x] Harden: card URLs are now validated server-side — `createCard`/
  `updateCard` accepted any string (the `<input type="url">` check is
  client-only) and it renders straight into `<a href>`; a stored
  `javascript:` URL is self-XSS today (RLS: owner-only) but becomes stored
  XSS against viewers once v2 shareable board links land. Both actions now
  reject non-http(s) schemes (`isSafeHttpUrl` in `card-actions.ts`)
- [x] Fix: keyboard drag swallowed the next click — `wasDragged` in
  `StepCard.tsx` was set whenever a drag started but only cleared inside the
  click handler; a keyboard drag (Space to lift/drop) fires no click, so the
  stale flag ate the next genuine click instead of opening the detail modal.
  Fixed: the flag now also clears on a zero-delay timeout when `isDragging`
  goes false (after the drop's click, if any, has fired)
- [x] Cosmetic: board progress bar filled from the right — `.progress` used
  `justify-content: flex-end`, anchoring the segments to the right edge with
  the amber in-progress segment left of the done segment. Removed the
  `flex-end` and reordered the segments (done first, then in-progress) so the
  bar fills left→right
- [x] Cosmetic: annotated the deliberate `<img>` in `AttachmentItem.tsx` with
  an inline `eslint-disable` + reason (signed short-lived Supabase URL —
  `next/image` would re-proxy and cache it pointlessly) so the warning no
  longer reads as an oversight

---

## Phase 6 — Deployment (PRD §3 Deployment)

- [x] Deploy to Vercel (env vars wired to Supabase) — **live 2026-07-14 at
  `knowledge-board-maple.vercel.app`**. Zero-config Vercel import of
  `mapleblog/knowledge-board` (`origin/main` at `3b20fe1`) with the two
  `NEXT_PUBLIC_SUPABASE_*` env vars set; pushed after a clean `tsc` /
  `eslint --max-warnings=0` / `next build`. The auth confirm route uses the
  request origin, so it works on the production domain unchanged.
- [x] Configure Supabase Auth redirect/site URLs for the deployed domain — Site
  URL + Redirect URLs pointed at `knowledge-board-maple.vercel.app` (2026-07-14).
- [x] Smoke test the full flow on production (sign up → board → card → attachment → reorder) — **passed 2026-07-14** on the live URL per the README "Production smoke test".
- [x] Document free-tier limits + upgrade path in README — done: README now has
  "Free-tier limits & upgrade path" (Supabase Free: ~1-week inactivity pause,
  500 MB DB / 1 GB Storage / 5 GB egress, leaked-password check needs Pro →
  Pro ~$25/mo; Vercel Hobby: personal-use, 100 GB bandwidth → Pro ~$20/mo), plus
  a full "Deploying to Vercel" section and refreshed feature/layout docs.

---

## Post-MVP (deferred — PRD §5 Roadmap)

- **v1.1:** Google OAuth · markdown in descriptions · search across a user's cards
- **v2.0:** shareable read-only board links · move cards between boards · tagging/filtering · list virtualization if boards exceed ~100 cards
