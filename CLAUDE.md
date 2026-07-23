# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Description
When start new conversation, read first `CLAUDE.md`, `TASKS.md`, `STATUS.md`, `docs/DESIGN.md` before start any task.

---

## Project

**Trailmark — Knowledge Board.** Next.js 16 (App Router) + TypeScript + Tailwind v4 on Supabase
(Postgres + Auth + Storage). A board per subject; cards are ordered top-to-bottom as a learning
path with drag-to-reorder, tags, reference links, attachments, and shareable read-only links.

> **AGENTS.md is binding:** this is **not** the Next.js in your training data. Read the relevant
> guide in `node_modules/next/dist/docs/` before writing framework code. Most visible consequence:
> `middleware.ts` is now **`proxy.ts`** (`src/proxy.ts` → `src/lib/supabase/proxy.ts`).

### Commands

```bash
npm run dev          # dev server (turbopack) — http://localhost:3000
npm run build        # next build — the real correctness gate
npm run lint         # eslint (run as: npx eslint --max-warnings=0)
npx tsc --noEmit     # type check
npm start            # prod server; needed to verify HTTP status codes (see share-route note)
```

**There is no test framework in this repo.** The verification standard used throughout the
project — and expected before marking any task done — is: `npx tsc --noEmit` +
`npx eslint --max-warnings=0` + `npm run build` all clean, followed by a manual browser pass
(most flows are auth-gated, so they cannot be automated here). Status-code behaviour must be
checked against `npm run build && npm start`, not `npm run dev`.

**Env:** two public vars only (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in
`.env` / `.env.local`. No service-role key exists anywhere in the codebase — keep it that way.
These are inlined at **build time**, so changing them on Vercel requires a redeploy.

**Migrations are applied by hand.** `supabase/migrations/*.sql` are written, mirrored into
`supabase/schema.sql`, and then pasted into the Supabase SQL Editor by the account owner (the
MCP connector is read-only in this environment). `src/lib/supabase/database.types.ts` is
hand-maintained to match; update it in the same change as any schema edit.

### Architecture

**Data flow — server fetch → one client shell → Server Actions.**
`src/app/(dashboard)/page.tsx` does a single nested Supabase read
(`boards → cards → attachments`), narrows the DB's `text` columns to domain unions via
`resolveBoardColor` / `resolveCardStatus`, and hands the whole tree to
`KnowledgeBoardApp.tsx`, the one stateful client component. Every mutation is a Server Action
in `src/lib/*-actions.ts` that ends in `revalidatePath("/")`; the shell re-syncs from the new
`initialBoards` prop during render. Nothing fetches from the client.

**Security model — RLS is the boundary, actions re-check on top of it.** Every table is
owner-scoped by Row-Level Security (`supabase/schema.sql`); server actions additionally call
`getUser()` and filter on `user_id` where a mistake would cross tenants (`moveCard`,
`setShareToken`, `revokeShareLink`). Two deliberate hard rules:
- **Public read happens through exactly one path:** the `security definer` `get_shared_board(token)`
  function returns a fixed safe JSON projection (no `user_id`, no `share_token`, no attachments).
  Table RLS is never loosened for sharing, and that projection must not be widened.
- **URLs and markdown are treated as untrusted.** `isSafeHttpUrl` rejects non-http(s) schemes
  server-side in `card-actions.ts` and again when rendering shared boards; `Markdown.tsx`
  deliberately does **not** enable `rehype-raw` and keeps the default `urlTransform`.

**Reordering** uses a fractional `order_index` (double precision) so one drag rewrites one row.
Writes are debounced 300ms and keyed **per card id** in a `Map` (a single shared timeout used to
drop writes), and flushed on unmount. Drag-reorder is disabled while a tag filter is active,
because reordering a partial list would corrupt the indexes. Known limits (no rebalancing,
append race) are documented in `schema.sql` on the column itself.

**Attachments** never pass through the app server: `createUploadTarget` validates type/size +
card ownership and returns a signed upload URL, the browser uploads directly, then
`confirmAttachment` re-reads the stored object's real size/mime (authoritative) before inserting
the row. Objects are pathed by `card_id`, which is why moving a card between boards moves nothing
in Storage. Deleting a card or board must `storage.remove()` the objects **before** the row delete
— the storage policy traces ownership through the `cards` row.

**Routing.** `src/proxy.ts` refreshes the session on every request and redirects unauthenticated
traffic to `/login`; anything public must be added to `PUBLIC_PATHS` in `src/lib/supabase/proxy.ts`.
The dashboard lives in a `(dashboard)` route group **specifically to scope its streaming
`loading.tsx` skeleton** — a route-wide Suspense fallback flushes a 200 before `notFound()` can
run, which turned `/share/<bad-token>` into a soft 404. Don't reintroduce a root `loading.tsx`.

**Styling** is not Tailwind-first: `src/app/globals.css` (~1.4k lines) is the hand-ported "Flow"
design system from `docs/DESIGN.md`, with tokens scoped to `.surface`. Add component styles there
following the existing class conventions rather than reaching for utility classes.

---

### Documents Responsibilities
| Document | Purpose |
|---|---|
| **CLAUDE.md** | Master entry point and doc map |
| **TASKS.md** | In-flight tasks with acceptance criteria, assignee, and status |
| **STATUS.md** | Current snapshot: shorter and concise what's done, what's blocked, what's next |
| **docs/DESIGN.md** | Website Visual Design Guidelines - Color System, Fonts, Spacing, Component Styles, Animations, Prohibitions |
| **README.md** | Record short and concise summary on how to configure this project, how to run this project online | 

- Create and initialize `STATUS.md` first

**Where the docs actually live.** Product/design sources are under `docs/`
(`docs/prd.md`, `docs/DESIGN.md`, `docs/mockup.html`, `docs/themes.html`,
`docs/wireframe.html`, `docs/wireframe-1.html`). Working docs stay at the repo root
(`TASKS.md`, `STATUS.md`, `README.md`, `V1.1-SCOPE.md`, `V2.0-SCOPE.md`, and the
`*-AUDIT.md` files). The rules below use the real paths — keep new files in the same
place as their siblings. Note `finalize.md` was never created for this project; the
scaffold predates it, so treat that rule as applying to future projects only.
---

### Rules
The following rules must be strictly observed.

**When user trigger create prd**, run the following prompt

```text
generate docs/prd.md. Ask user to answer following core questions:
1. project name
2. description pain point to resolve
3. target audience
4. tech stack
5. deployment method
6. theme styling
```

---

**When user ask to create wireframe/artifact**, run the following prompt

```text
Create 3 different set without repeat modern wireframe blueprint with medium fidelity grayscale boxes/placeholders, no real styling, annotation, just layout structure web-based playground based on `@docs/prd.md`, save it as **docs/wireframe.html**
```

---

**When user ask to create themes and styling playground**, run the following prompt

```text
Invoke ui-ux-pro-max skill create 3 themes and styling CSS playground based on `@docs/wireframe.html`, theme and styling css must fit to project, save it as **docs/themes.html**
```

---

**When user trigger reverse-extracted**, make confirmation with user which theme prefer to, then run following prompt

```text
Reverse-extracted full of [USER-ANSWER] theme + tokens + styling css + UI components based on `@docs/themes.html` save it as **docs/DESIGN.md**
```

---

**When user trigger mockup**, run the following prompt

```text
Run a real production-ready visual mockup based on `@docs/wireframe.html` , using theme `@docs/DESIGN.md`, save as **docs/mockup.html**
```

---

**When user trigger resolve the PRD's open questions**, run following prompt

```text
resolve `@docs/prd.md` open questions to prepare writing implementation code, save it as **finalize.md**
```

File format following:

```markdown
P1: Next.js 16 App Router setup
Status: ✅ Correct / ⚠️ Pending / 🚫 Blocking
Action Needed:
```

---

**When user ask for scaffold**, run the following prompt

```text
Initialize production scaffold, refer to `@docs/DESIGN.md` + `@docs/prd.md` as the primary sources, and read `@docs/mockup.html` as a read-only visual/behavioral reference 
(don't modify or copy it into the output).

the reference files will be:
1. `@docs/DESIGN.md` — design system / [theme-name] theme tokens and component styles (primary styling source)
2. `@docs/prd.md` — tech stack, file structure and architecture
3. `@docs/mockup.html` — read-only reference for proven layout and Canvas logic; will not be modified or copied

- When finished scaffold, run audit check to ensure code quality, code architecture. 
```

---

**When user trigger issue breakdown**, run following prompt

```text
- Breakdown the tasks into smaller subtasks according phase based on `@finalize.md`, save it as **TASKS.md**
- Phase 0 only for scaffold 
```

---

**When user trigger implement issue / start issue / start task**, run following prompt

```text
- Implement issue-by-issue based on `@TASKS.md`, **must update** when finish the tasks
```

---

**When user trigger QA check**, run following prompt

```text
Analyze and Suggest the following audit check list, which one bext fit to run:
1. Security Vulnerabilities
2. Code Quality & Architecture Flaws
3. Runtime & Performance Leaks
4. Business Logic & State Vulnerabilities
5. Compliance & Accessibility
6. Robustness & Error Handling
```

---

After finish audit check run, breakdown required actions into smaller subtasks, save them to following file , based on what audit checklist

- Security Vulnerabilities append to `SEC-AUDIT.md`
- Code Quality & Architecture Flaws append to `CODE-AUDIT.md`
- Runtime & Performance Leaks append to `RUN-AUDIT.md`
- Business Logic & State Vulnerabilities append to `BUS-AUDIT.md`
- Compliance & Accessibility append to `COM-AUDIT.md`
- Robustness & Error Handling append to `ROB-AUDIT.md`

File format following:

```markdown
AUD-001: Next.js 16 App Router setup
Verdict: ✅ Correct / ⚠️ Pending / 🚫 Blocking
Action Needed:
```

---

### Hard Constraints

- Ignore docs/themes.html, docs/mockup.html, docs/wireframe.html, docs/wireframe-1.html during process scaffold，breakdown task, implementing issue, audit check / QA check. 
- Do not modify docs/themes.html, docs/mockup.html, docs/wireframe.html, docs/wireframe-1.html during process scaffold，breakdown task, implementing issue, audit check / QA check. 
- Project security are strickly critical top priority, no vulnerubalities, no backdoor, no SQL injection 
- Conversation summary is compulsary need to update to `@STATUS`, by short and concise
- Do not add or create any element without mentioned in `@TASKS`
- New add or create must obtain confirmation with user before executes
- After completing all subtasks of a given phase, an audit check must be conducted to ensure there are no vulnerabilities or roadblocks before proceeding to the next phase

---

