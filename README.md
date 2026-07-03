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
- **Supabase** (Postgres + Auth + Storage) — client helpers scaffolded, not yet wired

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

The app currently renders in-memory seed data (`src/lib/sample-data.ts`) so the
UI is fully interactive out of the box — switch boards, drag steps to reorder,
click a timeline node to toggle "done", and add a step.

## Project layout

```
src/
  app/
    globals.css              Flow design tokens + components (ported from the mockup)
    layout.tsx  page.tsx     Root layout + home (renders the board view)
  components/flow/
    KnowledgeBoardApp.tsx    Top-level client shell + local state
    BoardList.tsx            Left column: boards with accent rings + progress
    TimelinePath.tsx         Right column: the path + @dnd-kit drag context
    StepCard.tsx             A single sortable timeline step
  lib/
    types.ts                 Domain types (mirror the DB schema)
    board.ts                 Progress + status-pill helpers
    sample-data.ts           Seed data (mirrors docs/mockup.html)
    supabase/                Browser + server client helpers
supabase/
  schema.sql                 Tables + Row-Level Security + updated_at trigger
docs/                        PRD, design system, and original mockups/wireframes
```

## Wiring up Supabase (next steps)

1. Create a Supabase project, then copy `.env.example` → `.env.local` and fill
   in `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor
   (creates tables + RLS policies).
3. Add email/password auth screens and a middleware session refresh.
4. Replace the `sample-data` reads in `page.tsx` with a Supabase query, and swap
   the local mutations in `KnowledgeBoardApp.tsx` for server actions with
   optimistic UI.

See `docs/prd.md` §5 for the phased roadmap.
