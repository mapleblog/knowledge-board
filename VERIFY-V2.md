# VERIFY-V2 — manual browser pass for v2.0 (8.1–8.3)

The remaining unchecked boxes in [`TASKS.md`](TASKS.md) are all **auth-gated
browser checks** — they can't be automated in this environment (no browser
driver; the Supabase MCP connector is read-only/permission-denied for this
project). Everything that *could* be verified by script already has been.

Tick the boxes as you go, then hand the results back so `TASKS.md` and
`STATUS.md` can be updated.

**Setup**
- Run against `npm run build && npm start` (prod, not `npm run dev` — status
  codes differ), or the live site `knowledge-board-lovat.vercel.app`.
- You need **two boards** and **one card carrying both an attachment and a URL**.
- Sign in first. For the signed-out steps use a **separate browser profile**, not
  just incognito, if you've ever logged in on that host.

---

## Already verified by script (2026-07-23) — do not redo

- `tsc --noEmit` + `eslint --max-warnings=0` + `next build` clean.
- Live DB `bruzjjsqcmmzptamkhrw`: `cards.tags` and `boards.share_token` both
  exist; `get_shared_board` is anon-callable.
- RPC returns `null` for nonexistent, nil, **and NULL** tokens — private boards
  (default `share_token IS NULL`) are not exposed.
- `' or 1=1--` → HTTP 400 `invalid input syntax for type uuid` (rejected at the
  type boundary); omitted arg → PGRST202 (no no-arg overload).
- Anon `select *` on `boards`/`cards`/`attachments` → `[]` (RLS holds).
- Signed-out HTTP: `/` 307→login · `/login` 200 · `/signup` 200 · `/shareXYZ`
  307 (no over-match) · `/share` 404 · **all bad tokens 404** (malformed,
  nonexistent uuid, nil uuid, uuid+extra, encoded traversal, injection-shaped)
  with `<meta name="robots" content="noindex">` intact.
- `parseSharedBoard` (`src/lib/types.ts`) rebuilds a whitelisted object rather
  than casting the RPC result, so `user_id` / `share_token` / attachments cannot
  reach the public view even if the SQL projection were widened later.

---

## Optional: run sections A–C automatically

[`scripts/verify-v2.mjs`](scripts/verify-v2.mjs) drives sections A, B and C in a
headless browser. Playwright is **not** a dependency of this project — install
it ad hoc so the app's dependency tree stays unchanged:

```bash
npm i --no-save playwright && npx playwright install chromium
npm run build && npm start          # prod server, NOT npm run dev
BASE_URL=http://localhost:3000 TM_EMAIL=... TM_PASSWORD=... node scripts/verify-v2.mjs
```

It creates its own `E2E-<stamp>` fixtures (two boards, two cards, a 1×1 PNG
attachment, a share token) and deletes them in a `finally` block, pass or fail;
existing boards are never touched. There is no separate test database, so the
fixtures land in whatever Supabase project the server points at — prefer a local
server over the live domain. Pass credentials via the environment only.

Section D below is not automated either way. Tick the tables by hand if you'd
rather do the whole pass manually — the script is a convenience, not the
source of truth.

---

## A — 8.1 Move cards between boards

| # | Step | Expected | ✓/✗ |
|---|---|---|---|
| A1 | Open the card with an attachment + URL (click the card body) | Detail modal shows the link and the attachment under **Attachments** | |
| A2 | Scroll to **Move to board** → pick the other board → **Move** | Modal closes; card disappears from this board | |
| A3 | Select the destination board | Card is at the **bottom** of the list (appended, not inserted) | |
| A4 | Open it there | URL still clickable; attachment still listed, preview/download works | |
| A5 | Reload (F5) | Still on the destination board, still at the end | |

If the `.save-error` banner appears, copy its text — that's a real failure.

## B — 8.2 Tagging & filtering

| # | Step | Expected | ✓/✗ |
|---|---|---|---|
| B1 | Edit a card → tag field (`e.g. react, basics`) → type `react`+Enter, `Basics `+comma | Two chips: `react`, `basics` (lowercased) | |
| B2 | Save, then tag a **second** card with `react` only | Both cards show `#react` chips on the timeline | |
| B3 | Reload | Tags persist (the real migration proof) | |
| B4 | Click a `#react` chip on a card | Bar reads **Filtered by #react · N cards · drag-reorder paused** | |
| B5 | Try dragging a card while filtered | Nothing moves — drag disabled | |
| B6 | Click **Clear filter** | Full list returns; dragging works again and survives reload | |
| B7 | Switch boards while a filter is active | Filter clears automatically | |
| B8 | Try an 11th tag / a 31-char tag | Blocked by the limit hint | |

## C — 8.3 Shareable read-only links 🔒

Bad-token 404s are already confirmed by script — only the **valid-token** path
below still needs a human.

| # | Step | Expected | ✓/✗ |
|---|---|---|---|
| C1 | Click **🔗** on a board row | Modal: "This board is private…" + **Create share link** | |
| C2 | **Create share link** → **Copy** | Button flips to **Copied!**; URL is `<origin>/share/<uuid>` | |
| C3 | Paste into a **signed-out** browser profile | Board renders read-only, **no sign-in prompt** | |
| C4 | On the public page, check | no drag, no status toggle, no edit/delete, **no Attachments section**, no account chrome | |
| C5 | View source (Ctrl+U), search it | `noindex` present; **no `user_id`, no `share_token`** anywhere | |
| C6 | Card with a URL on the public page | Link renders, points at the real https URL | |
| C7 | Owner window → 🔗 → **Rotate link**; reload the **old** URL signed-out | **404** | |
| C8 | 🔗 → **Stop sharing**; reload the **new** URL signed-out | **404** | |
| C9 | 🔗 again | Modal back to the "private / Create share link" state | |

**C5 and C7 matter most** — C5 proves the projection isn't leaking, C7 proves
revocation is real.

## D — carry-overs (optional, quick)

| # | Step | Expected | ✓/✗ |
|---|---|---|---|
| D1 | 7.1 search on a phone viewport | Hamburger → search input full-width, results panel doesn't overflow, tapping a result opens the card | |
| D2 | Supabase → Authentication | Confirm link-by-verified-email is still on (STATUS.md assumes it, never confirmed) | |

---

**On completion:** tick 8.1 / 8.2 / 8.3 in `TASKS.md` and append a dated entry to
`STATUS.md`. If anything fails, record the exact error text — the failure mode
matters more than the tick.
