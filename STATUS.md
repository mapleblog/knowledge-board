# Status — Blocking Points

Tracks work that is code-complete but cannot be finished or verified because
it depends on external/manual setup. See [`TASKS.md`](TASKS.md) for the full
task breakdown. Format must including "Phrase", "Blocking Description", "Actions Required",

| Phase | Blocking Description | Actions Required | Progress Status |
|---|---|---|---|
| Phase 0 — Foundation | Resolved. Live Supabase project created; `.env` filled with project URL + anon key. | None — verified via `curl` against `/auth/v1/settings` (valid key, reached real project) and via the running dev server (auth redirect to `/login` confirms env wiring end-to-end). | Done. |
| Phase 1 — Authentication | RLS policies (`supabase/schema.sql`) not yet exercised cross-user. Single-user sign-up → confirmation email → login was verified manually, but no test of one user reading another user's data. | Manually confirm: sign in as User A, create a board, sign in as User B, confirm User B cannot read User A's boards/cards/attachments. | Unblocked (Phase 0 done). Sign-up, login, logout, `proxy.ts` route protection, and server-side session read are code-complete, `tsc`/`eslint`/`next build`-clean, and manually verified end-to-end. Cross-user RLS check still outstanding. |
| Phase 2 — Boards CRUD | Not started. | No longer blocked — live DB is available. Ready to implement. | Not started. |
| Phase 3 — Cards CRUD + ordering | Not started. | No longer blocked — live DB is available. Ready to implement. | Not started. |
| Phase 4 — Attachments | Not started. | No longer blocked — live DB is available, but the `attachments` storage bucket still needs confirming/creating. | Not started. |

**Next step:** verify cross-user RLS (Phase 1's remaining item), then start Phase 2 (Boards CRUD).
