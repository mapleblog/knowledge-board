# Trailmark — Knowledge Board

Sequence *what to learn next*. Create a board per subject and order your
knowledge cards as a top-to-bottom **learning path**, with drag-to-reorder,
reference links, and file attachments.

Built to the spec in [`docs/prd.md`](docs/prd.md) using the **"Flow"** design
system in [`docs/DESIGN.md`](docs/DESIGN.md) (reverse-extracted from
[`docs/mockup.html`](docs/mockup.html)).

## Stack

- **Next.js 16 (App Router) + TypeScript**
- **Tailwind CSS v4** + a scoped `.flow` design-system stylesheet in
  `src/app/globals.css`
- **@dnd-kit** for accessible, touch-capable drag-to-reorder
- **Supabase** (Postgres + Auth + Storage) — auth and boards are wired to a live project; cards/attachments still pending

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Boards are fetched from Supabase for the signed-in user (see `src/app/page.tsx`)
and are fully CRUD — create, edit, and delete (with confirmation) — via Server
Actions in `src/lib/board-actions.ts`. Card mutations (reorder, toggle done, add
step) are still local-only pending Phase 3.

## Project layout

```
src/
  app/
    globals.css              Flow design tokens + components (ported from the mockup)
    layout.tsx  page.tsx     Root layout + home (fetches the user's boards)
    login/  signup/          Auth screens
  components/
    auth/SessionMenu.tsx     Top-bar logout
    flow/
      KnowledgeBoardApp.tsx  Top-level client shell + local card state
      BoardList.tsx          Left column: boards with accent rings + progress
      BoardModal.tsx         Create/edit board form (name, description, color)
      DeleteBoardModal.tsx   Delete confirmation
      TimelinePath.tsx       Right column: the path + @dnd-kit drag context
      StepCard.tsx           A single sortable timeline step
  lib/
    types.ts                 Domain types (mirror the DB schema)
    board.ts                 Progress + status-pill helpers
    auth-actions.ts          Sign up / log in / log out Server Actions
    board-actions.ts         Board create/update/delete Server Actions
    supabase/                Browser + server client helpers, proxy session refresh
supabase/
  schema.sql                 Tables + Row-Level Security + updated_at trigger
docs/                        PRD, design system, and original mockups/wireframes
```

## Wiring up Supabase

1. Create a Supabase project, then copy `.env.example` → `.env.local` and fill
   in `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor
   (creates tables + RLS policies).

See `docs/prd.md` §5 and [`TASKS.md`](TASKS.md) for the phased roadmap.
