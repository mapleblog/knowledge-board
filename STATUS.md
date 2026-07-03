# Status — Blocking Points

Tracks work that is code-complete but cannot be finished or verified because
it depends on external/manual setup. See [`TASKS.md`](TASKS.md) for the full
task breakdown. Format must including "Phrase", "Blocking Description", "Actions Required",

| Phase | Blocking Description | Actions Required | Progress Status |
|---|---|---|---|
| Phase 0 — Foundation | Resolved. Live Supabase project created; `.env` filled with project URL + anon key. | None — verified via `curl` against `/auth/v1/settings` (valid key, reached real project) and via the running dev server (auth redirect to `/login` confirms env wiring end-to-end). | Done. |
| Phase 1 — Authentication | Resolved. Cross-user RLS verified: `schema.sql` had not actually been applied to the live project (Table Editor showed no tables despite Phase 0 checklist); ran it manually via the SQL Editor, then confirmed isolation with a throwaway two-user script (User A/B each created a board; neither could read the other's row, `select *` only returned each user's own board). | None. | Done. Sign-up, login, logout, `proxy.ts` route protection, server-side session read, and cross-user RLS are all verified end-to-end. |
| Phase 2 — Boards CRUD | Code-complete, not yet manually verified in a browser. `chromium-cli` isn't available in this Windows dev environment, so the create/edit/delete flow was only checked via `tsc --noEmit`, `next build`, and `eslint` (all clean) plus a curl smoke test of `/login`. | Manually sign in and exercise create/edit/delete board + empty state in a real browser before treating this as verified. | Implemented, pending manual UI verification. |
| Phase 3 — Cards CRUD + ordering | Not started. | No longer blocked — live DB is available. Ready to implement. | Not started. |
| Phase 4 — Attachments | Not started. | No longer blocked — live DB is available, but the `attachments` storage bucket still needs confirming/creating. | Not started. |

**Next step:** manually verify Phase 2 in a browser (sign in, create/edit/delete a board, confirm the empty state and RLS scoping), then start Phase 3 (Cards CRUD + ordering).
