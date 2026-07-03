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
- [ ] Verify reorder works on touch (phone-sized viewport)

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

- [ ] Full drag-reorder + CRUD verified on a phone-sized viewport (touch)
- [ ] Loading / error / empty states across boards and cards
- [ ] Accessibility pass (keyboard drag, focus traps in modals, labels)
- [ ] New-user path: create board + first card in under 2 minutes, no tutorial

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
