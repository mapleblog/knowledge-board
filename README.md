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
- **Supabase** (Postgres + Auth + Storage) — auth, boards, cards, and
  attachments are all wired to a live project with Row-Level Security

## Features

- **Email/password auth** with email confirmation, route protection, and a
  session-refreshing proxy (`src/proxy.ts`)
- **Boards** — create/edit/delete (with confirmation) + preset accent color;
  per-board progress ring
- **Cards** — create/edit/delete, a detail view with clickable reference URL,
  and drag-to-reorder persisted via a fractional `order_index` (optimistic UI,
  debounced write, survives reload; works with mouse, touch, and keyboard)
- **Status** — click a timeline node to cycle *next up → in progress → done*
- **Attachments** — signed uploads to private Storage (png/jpg/webp/pdf, ≤ 5MB),
  image preview + download, delete; validated on both client and server
- **Responsive & accessible** — mobile navbar, dialogs with focus trap +
  Escape + labels, loading/error/empty states throughout

## Getting started (local)

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase URL + anon key
npm run dev                    # http://localhost:3000
```

See [Wiring up Supabase](#wiring-up-supabase) for the one-time backend setup.

## Wiring up Supabase

1. **Create a project** at [supabase.com](https://supabase.com), then copy
   `.env.example` → `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API). These are the only
   two environment variables the app needs — both are public/anon keys; there is
   no service-role key in the codebase.
2. **Run the schema.** Paste [`supabase/schema.sql`](supabase/schema.sql) into
   the SQL Editor and run it — creates `boards` / `cards` / `attachments`, their
   Row-Level Security policies, the `updated_at` trigger, and the three Storage
   policies.
3. **Create the Storage bucket.** Storage → New bucket named **`attachments`**,
   **Public OFF** (private). Optionally set the bucket's file-size limit to
   `5 MB` and allowed MIME types to `image/png, image/jpeg, image/webp,
   application/pdf` — the app also enforces these on both client and server
   (`src/lib/attachment-constraints.ts`).
4. **Configure the auth confirmation email.** Authentication → Email Templates →
   *Confirm signup*: the link must point at the app's confirm route, e.g.
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. The
   handler in `src/app/auth/confirm/route.ts` verifies the token, sets the
   session, and redirects into the app.
5. *(Recommended)* Authentication → Sign In / Providers → Passwords → enable
   **"Prevent use of leaked passwords."**

## Deploying to Vercel

The app is a standard Next.js App Router project — Vercel needs no extra
config (no `vercel.json` required).

1. **Push to GitHub**, then in Vercel: **Add New → Project** and import the repo.
   Framework preset auto-detects as **Next.js**; leave build/output settings at
   their defaults (`next build`).
2. **Set environment variables** (Project → Settings → Environment Variables),
   the same two as local, for the Production (and Preview) environments:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your project's anon/public key |

3. **Point Supabase Auth at the deployed domain** (Authentication → URL
   Configuration):
   - **Site URL**: `https://<your-app>.vercel.app` — this is the base the
     confirmation email link is built from.
   - **Redirect URLs**: add `https://<your-app>.vercel.app/**` (and keep
     `http://localhost:3000/**` for local dev). Vercel preview deployments use
     changing subdomains, so add `https://<your-app>-*.vercel.app/**` if you
     want confirmation links to work on previews too.
4. **Deploy**, then run the smoke test below.

### Production smoke test

Sign up → confirm via email → create a board → add a card → open its detail →
upload an attachment (and try a >5MB / wrong-type file to confirm rejection) →
drag to reorder → reload and confirm the order persisted → log out / back in.

## Free-tier limits & upgrade path

Both Vercel and Supabase have free tiers that comfortably run this app for
personal use. The ceilings worth knowing:

**Supabase (Free):**
- Projects **pause after ~1 week of inactivity** (a manual resume brings them
  back) — the main gotcha for a low-traffic personal deployment.
- **500 MB** database + **1 GB** Storage + **5 GB** egress/month.
- Up to **50,000** monthly active auth users.
- **"Prevent use of leaked passwords"** requires the **Pro** plan.
- Upgrade path: **Pro (~$25/mo)** removes auto-pause, raises limits, and adds
  daily backups.

**Vercel (Hobby):**
- Free for **non-commercial/personal** use; **100 GB** bandwidth/month.
- Serverless function execution and build-minute limits apply but are generous
  for this workload.
- Upgrade path: **Pro (~$20/mo per member)** for commercial use and higher
  limits.

For a personal knowledge board, the free tiers are sufficient; the first thing
you'll likely hit is Supabase's inactivity pause, not a resource cap.

## Project layout

```
src/
  app/
    globals.css              Flow design tokens + components (ported from the mockup)
    layout.tsx               Root layout + metadata
    page.tsx                 Home — fetches the signed-in user's boards + cards
    loading.tsx  error.tsx   Route-level loading skeleton + error/retry boundary
    login/  signup/          Auth screens
    auth/confirm/route.ts    Email-confirmation handler (verifies OTP, sets session)
  components/
    auth/SessionMenu.tsx     Top-bar logout
    flow/
      KnowledgeBoardApp.tsx  Top-level client shell (boards + optimistic card state)
      BoardList.tsx          Left column: boards with accent rings + progress
      BoardModal.tsx         Create/edit board (name, description, color)
      DeleteBoardModal.tsx   Delete-board confirmation
      TimelinePath.tsx       Right column: the path + @dnd-kit drag context
      StepCard.tsx           A single sortable timeline step
      CardModal.tsx          Create/edit card (title, description, URL)
      CardDetailModal.tsx    Card detail: description, link, attachments
      DeleteCardModal.tsx    Delete-card confirmation
      AttachmentUploader.tsx Signed-upload flow from the card detail view
      AttachmentItem.tsx     Attachment row: preview / download / delete
      Modal.tsx              Shared accessible dialog (focus trap, Escape, roles)
  lib/
    types.ts                 Domain types (mirror the DB schema)
    board.ts                 Progress, status-pill, link-label, reorder helpers
    attachment-constraints.ts  Shared client/server upload limits
    auth-actions.ts          Sign up / log in / log out Server Actions
    board-actions.ts         Board create/update/delete Server Actions
    card-actions.ts          Card create/update/delete/reorder/status Server Actions
    attachment-actions.ts    Signed-upload + attachment CRUD Server Actions
    supabase/                Browser + server + proxy clients; generated DB types
  proxy.ts                   Session-refresh proxy (Next 16's renamed middleware)
supabase/
  schema.sql                 Tables + Row-Level Security + trigger + Storage policies
docs/                        PRD, design system, and original mockups/wireframes
```

See [`docs/prd.md`](docs/prd.md) §5 and [`TASKS.md`](TASKS.md) for the phased
roadmap, and [`STATUS.md`](STATUS.md) for current blocking/verification state.
