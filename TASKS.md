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
- [ ] New-user path: create board + first card in under 2 minutes, no tutorial

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

## Phase 6 — Deployment (PRD §3 Deployment)

- [ ] Deploy to Vercel (env vars wired to Supabase)
- [ ] Configure Supabase Auth redirect/site URLs for the deployed domain
- [ ] Smoke test the full flow on production (sign up → board → card → attachment → reorder)
- [ ] Document free-tier limits + upgrade path in README

---

## Post-MVP (deferred — PRD §5 Roadmap)

- **v1.1:** Google OAuth · markdown in descriptions · search across a user's cards
- **v2.0:** shareable read-only board links · move cards between boards · tagging/filtering · list virtualization if boards exceed ~100 cards
