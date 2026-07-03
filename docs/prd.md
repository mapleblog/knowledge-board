# PRD: Knowledge Board

**Status:** Final v1.1
**Author:** Product/Eng collaboration with Claude
**Last updated:** 2026-07-03

---

## 1. Executive Summary

**Problem Statement:** Students, beginners, and self-learners scatter their study material across bookmarks, notes apps, and files with no visual way to sequence *what to learn next* or track progress through a topic. There's no lightweight tool built around **ordering knowledge points as a procedure**, rather than as a flat list or a generic Kanban board.

**Proposed Solution:** A web-based Knowledge Board where each learner creates one or more **boards** (one per subject), each containing an ordered, drag-and-reorderable list of **knowledge cards**. Each card has a title, description, an optional reference URL, and optional small file attachments (images, PDFs, notes). Reordering cards lets the learner define or refine their own learning sequence/procedure.

**Success Criteria (MVP):**
- A new user can create a board and add their first knowledge card in under 2 minutes with no tutorial.
- Drag-and-reorder works reliably on both desktop (mouse) and mobile (touch) with no lost state.
- Card creation (title + description + URL) completes in under 15 seconds of user interaction.
- File attachments up to 5MB upload and preview successfully >= 99% of attempts.
- Zero cost to run at low usage (fits inside free tiers of chosen hosting/DB/storage).

---

## 2. User Experience & Functionality

### User Personas

- **Beginner Self-Learner (primary):** Learning a new skill or subject alone (e.g., a bootcamp student learning web dev, someone learning a language). Wants a simple, visual way to lay out "what to learn, in what order" and keep reference links/notes attached to each step.
- **Student (secondary):** Organizing course material into a study sequence ahead of exams, attaching lecture PDFs/slides to specific topics.
- **Casual Public User:** Discovers the tool, signs up, and builds one or two boards for a personal project or hobby (e.g., "Learn Guitar," "Learn Excel").

### User Stories

1. As a self-learner, I want to create a new board for a subject so that I can keep each topic's material separate from others.
2. As a student, I want to add a knowledge card with a title, description, a reference URL, and an attachment so that all context for one learning step lives in one place.
3. As a beginner, I want to drag a card up or down the board so that I can reorder my learning path as my understanding evolves.
4. As a user, I want to edit or delete a card so that I can fix mistakes or remove outdated material.
5. As a user, I want to click a card to expand it and see the full description, open the URL, and view/download the attachment.
6. As a returning user, I want to log in and see my boards exactly as I left them, on any device.
7. As a user, I want to see my boards listed on a home/dashboard screen so I can jump between subjects.

### Acceptance Criteria

- **Board creation:** User can create a board with a name (required) and optional description; new board appears immediately in the dashboard list.
- **Card creation:** Form requires a title; description, URL, and attachment are optional. Card appears at the bottom of the board's ordered list by default.
- **Reordering:** Dragging a card to a new position persists the new order immediately (optimistic UI) and survives a page reload.
- **Card detail view:** Clicking/tapping a card opens an expanded view (modal or side panel) showing full description, a clickable URL (opens in new tab), and an attachment preview/download link.
- **Edit/Delete:** Both available from the card detail view or a contextual menu on the card; delete requires a confirmation step.
- **Auth:** User must sign up / log in (email+password) before creating boards; boards are private to their owner by default.
- **Attachments:** Accepts common file types (images: png/jpg/webp; docs: pdf) up to 5MB per file; rejected files show a clear error.
- **Responsive:** Full functionality (including drag-reorder) works on a phone-sized viewport via touch.
- **Board accent color:** User can pick an accent color for a board from a small preset palette at creation (default assigned automatically if skipped); shown as a colored header/border on the dashboard for quick visual scanning.

### Non-Goals (MVP)

- Real-time multi-user collaboration on the same board (e.g., Google-Docs-style co-editing).
- Public sharing / read-only public board links.
- Nested sub-boards or folders beyond a flat list of boards.
- Rich-text/WYSIWYG editing in descriptions (plain text/markdown only).
- Spaced-repetition, quizzing, or grading features.
- Native mobile apps (web-responsive only).
- Version history / undo beyond simple delete-confirmation.

---

## 3. Recommendations (Open Questions Resolved)

You asked for advice on tech stack, deployment, and theme — here's the recommendation and reasoning:

### Tech Stack: **Next.js + TypeScript + Tailwind CSS**

Given the confirmed requirements — multiple users with accounts, boards persisted across devices, and file attachments — plain HTML/CSS/JS would require you to hand-roll routing, state management, and API calls, and it has no natural path to authentication or a database. Recommendation:

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js (App Router) + TypeScript** | File-based routing for dashboard/board/card views, built-in API routes so you don't need a separate backend service, strong ecosystem for drag-and-drop libraries, TypeScript catches bugs early as the data model (boards → cards → attachments) grows. |
| Styling | **Tailwind CSS** | Fast to build consistent UI without hand-writing CSS; pairs well with component libraries like shadcn/ui for polished defaults (cards, modals, forms) with minimal design effort — good for a solo/small project. |
| Drag-and-reorder | `@dnd-kit/core` (or `react-beautiful-dnd` successor) | Actively maintained, accessible, touch-support out of the box — satisfies the mobile drag-reorder requirement. |
| Auth + Database + File Storage | **Supabase** (Postgres + Auth + Storage) | One free-tier platform covers accounts (multi-user), a relational DB (boards/cards ordering), and file storage (attachments) — avoids stitching together 3 separate services. |

### Deployment: **Vercel (app) + Supabase (data/auth/storage)**

- **Vercel free tier** deploys Next.js natively (zero-config), gives you preview deployments per git push, and is the path of least friction for a Next.js app.
- **Supabase free tier** covers Postgres DB, authentication, and object storage for attachments — all within the "free hosting only" constraint.
- This combo has no cost at low/personal-project usage and scales up on paid tiers later if the audience grows beyond hobby use.

### Project Theme: naming & visual direction

Suggested names (pick one, or use as inspiration):
- **Waypoint** — evokes marking your path through a subject, step by step.
- **Studybench** — a workbench where you lay out and arrange your learning material.
- **Trailmark** — "marking the trail" through a topic.
- **Lernpath** *(or "Learnpath")* — literal, friendly, easy to say.

Visual direction: a calm, focused "index card on a corkboard" aesthetic — soft neutral background, card-based UI with subtle shadows, one accent color per board (user-assignable) to help distinguish subjects at a glance. Avoid a busy/gamified look (badges, streak counters) — the target user wants a clear, low-noise organizing tool, not a habit-tracking app.

---

## 4. Technical Specifications

### Architecture Overview

```
Browser (Next.js client, React)
   |
   |-- Next.js Server (API routes / Server Actions)
   |        |
   |        |-- Supabase Postgres (boards, cards, order_index)
   |        |-- Supabase Auth (session/JWT)
   |        |-- Supabase Storage (attachment files)
   |
   Deployed on Vercel
```

- **Data model (initial):**
  - `users` (managed by Supabase Auth)
  - `boards`: `id, user_id, name, description, created_at`
  - `cards`: `id, board_id, title, description, url, order_index, created_at, updated_at`
  - `attachments`: `id, card_id, file_path, file_name, file_size, mime_type`
- **Ordering:** `order_index` (float or integer with re-balancing) on `cards`, updated on drag-drop via a single API call per move.

### Integration Points

- **Supabase Auth:** email/password to start; OAuth (Google) as a fast-follow.
- **Supabase Storage:** signed upload URLs for attachments, size/type validated client- and server-side.
- **Supabase Postgres:** accessed via Supabase client SDK or an ORM (Prisma) from Next.js server actions/API routes.

### Security & Privacy

- Row-Level Security (RLS) policies in Supabase so a user can only read/write their own boards, cards, and attachments.
- File upload validation on both client (immediate feedback) and server/storage rules (authoritative) for file type and size.
- No sensitive data expected (study notes/links), but treat attachment contents as private by default — no public URLs unless a future "share" feature is explicitly added.

---

## 5. Risks & Roadmap

### Phased Rollout

- **MVP (Phase 1):** Email/password auth, create/view/edit/delete boards (with preset accent color), create/edit/delete cards (title, description, URL, attachment), drag-to-reorder within a board (no pagination/virtualization — flat render is sufficient at expected scale), responsive layout.
- **v1.1:** OAuth login (Google), markdown support in descriptions, basic search across a user's cards.
- **v2.0:** Shareable read-only board links, moving cards between boards, tagging/filtering, lightweight progress marking (e.g., "done" state per card), card-list virtualization if usage data shows boards regularly exceeding ~100 cards — still avoiding a full gamification layer unless user feedback asks for it.

### Technical Risks

- **Drag-and-drop on mobile touch devices** can be finicky across browsers — mitigate by using a well-tested library (`@dnd-kit`) and testing early on real devices.
- **Free-tier limits** (Supabase pauses free projects after inactivity, storage caps) — acceptable for MVP/personal-scale use; document upgrade path if usage grows.
- **Order-index race conditions** if a user reorders rapidly or from two devices at once — mitigate with debounced writes and last-write-wins semantics for MVP (real-time conflict resolution is a non-goal).

---

## Decisions Log

The following were open questions in v1.0, now resolved for MVP scope:

1. **OAuth vs. email/password at launch:** Email/password only for MVP. OAuth (Google) adds provider setup overhead (Google Cloud console, consent screen) that isn't worth the friction cost this early — moved to v1.1 as a fast-follow once the core flows are validated.
2. **Board accent color:** Included in MVP, not deferred to v1.1. It's a single color field plus a preset palette — cheap to build — and it directly serves the confirmed "multiple boards, one per subject" structure by letting users visually distinguish subjects at a glance from day one.
3. **Cards per board scale:** Designed for the realistic self-study range of 10s–100 cards per board. MVP renders the full list with no pagination or virtualization; that optimization is deferred to v2.0 and only built if real usage data shows boards regularly exceeding ~100 cards.
