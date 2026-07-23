/**
 * VERIFY-V2 automated pass — sections A, B, C of ../VERIFY-V2.md.
 *
 * This repo has no test framework by design (see CLAUDE.md); this is a
 * standalone, run-on-demand script, not a suite. Playwright is deliberately
 * NOT a dependency in package.json — install it ad hoc when you want to run
 * this, so the app's dependency tree stays unchanged:
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *
 * Then, against a prod server (`npm run build && npm start`, NOT `npm run dev`):
 *
 *   BASE_URL=http://localhost:3000 TM_EMAIL=... TM_PASSWORD=... node scripts/verify-v2.mjs
 *
 * PowerShell:
 *   $env:BASE_URL="http://localhost:3000"; $env:TM_EMAIL="..."; $env:TM_PASSWORD="..."
 *   node scripts/verify-v2.mjs
 *
 * Pass credentials via the environment only — never hardcode them here.
 *
 * It creates its own fixtures (two boards prefixed "E2E-<timestamp>", two cards,
 * a 1x1 PNG attachment, a share token) and deletes them in a `finally` block,
 * pass or fail. Nothing pre-existing is touched. Note the fixtures are written
 * to whatever Supabase project the server is configured against — there is no
 * separate test database, so prefer a local server over the live domain.
 *
 * Section D of VERIFY-V2.md (phone-viewport search, the Supabase Auth
 * account-linking setting) is not automated and still needs a human.
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Imported lazily so a missing dep reports itself clearly rather than as a
// raw ERR_MODULE_NOT_FOUND (playwright is intentionally not in package.json).
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "playwright is not installed. Run:\n" +
      "  npm i --no-save playwright && npx playwright install chromium"
  );
  process.exit(2);
}

const BASE = (process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const EMAIL = process.env.TM_EMAIL;
const PASSWORD = process.env.TM_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set TM_EMAIL and TM_PASSWORD.");
  process.exit(2);
}

const STAMP = Date.now().toString().slice(-6);
const ALPHA = `E2E-${STAMP} Alpha`;
const BETA = `E2E-${STAMP} Beta`;
const CARD_A = `E2E-${STAMP} moving card`;
const CARD_B = `E2E-${STAMP} second card`;
const CARD_URL = "https://example.com/e2e-check";

// 1x1 transparent PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
// Written outside the repo so a run never leaves an artifact behind.
const PNG_PATH = join(tmpdir(), `trailmark-e2e-pixel-${STAMP}.png`);
writeFileSync(PNG_PATH, PNG);

const results = [];
const rec = (id, desc, pass, detail = "") => {
  results.push({ id, desc, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${desc}${detail ? ` — ${detail}` : ""}`);
};
const fail = (id, desc, e) => rec(id, desc, false, `threw: ${e.message.split("\n")[0]}`);

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }),
    page.click('button[type="submit"]:has-text("Log in")'),
  ]);
}

const boardItem = (page, name) => page.locator(".b-item", { hasText: name });
const selectBoard = async (page, name) => {
  await boardItem(page, name).locator(".b-item-main").click();
  await page.waitForTimeout(300);
};

async function newBoard(page, name) {
  await page.click(".new-board");
  const dlg = page.locator('[role="dialog"]');
  await dlg.locator('input[name="name"]').fill(name);
  await dlg.locator('button[type="submit"]').click();
  await dlg.waitFor({ state: "detached", timeout: 20000 });
  await page.waitForTimeout(500);
}

async function newCard(page, title, { url, tags = [] } = {}) {
  await page.click('button:has-text("Add step"), button:has-text("+ Add step")');
  const dlg = page.locator('[role="dialog"]');
  await dlg.locator('input[name="title"]').fill(title);
  if (url) await dlg.locator('input[name="url"]').fill(url);
  for (const t of tags) {
    await dlg.locator("input.tag-draft").fill(t);
    await dlg.locator("input.tag-draft").press("Enter");
  }
  await dlg.locator('button[type="submit"]').click();
  await dlg.waitFor({ state: "detached", timeout: 20000 });
  await page.waitForTimeout(500);
}

const cardTitles = async (page) =>
  (await page.locator(".path-col .step .card h5").allTextContents()).map((s) => s.trim());

const openCard = async (page, title) => {
  await page.locator(".step .card", { hasText: title }).first().click();
  await page.locator('[role="dialog"]').waitFor({ timeout: 10000 });
};

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let shareUrlV1 = null;
  let shareUrlV2 = null;

  try {
    await login(page);
    rec("login", "authenticate as the test user", true);

    // ---- fixtures -------------------------------------------------------
    await newBoard(page, ALPHA);
    await newBoard(page, BETA);
    await selectBoard(page, ALPHA);
    await newCard(page, CARD_A, { url: CARD_URL, tags: ["react", "Basics "] });
    await newCard(page, CARD_B, { tags: ["react"] });

    // attachment on CARD_A
    await openCard(page, CARD_A);
    let dlg = page.locator('[role="dialog"]');
    await dlg.locator('input[type="file"]').setInputFiles(PNG_PATH);
    await dlg.locator(".attachment-list", { hasText: "e2e-pixel" }).waitFor({ timeout: 30000 });
    rec("fixture", "card created with URL + tags + attachment", true);

    // ================= B — tags (checked before the move) =================
    try {
      await dlg.locator('button:has-text("Close")').click();
      await dlg.waitFor({ state: "detached" });
      await page.reload({ waitUntil: "domcontentloaded" });
      await selectBoard(page, ALPHA);
      const chips = await page
        .locator(".step .card", { hasText: CARD_A })
        .locator(".tag-chip, button.tag-chip")
        .allTextContents();
      const norm = chips.map((c) => c.replace("#", "").trim()).sort();
      rec(
        "B1/B3",
        "tags lowercase+trim and survive reload",
        norm.includes("react") && norm.includes("basics"),
        `chips=${JSON.stringify(norm)}`
      );
    } catch (e) {
      fail("B1/B3", "tags persist", e);
    }

    try {
      const before = await cardTitles(page);
      await page
        .locator(".step .card", { hasText: CARD_A })
        .locator("button", { hasText: "react" })
        .first()
        .click();
      await page.waitForTimeout(400);
      const bar = page.locator(".tag-filter-bar");
      const barText = (await bar.textContent()) || "";
      rec(
        "B4",
        "filter bar shows tag + count + paused notice",
        /react/.test(barText) && /paused/i.test(barText),
        barText.replace(/\s+/g, " ").trim()
      );

      // B5 — attempt a drag while filtered; order must not change
      const visible = await cardTitles(page);
      if (visible.length >= 2) {
        const src = page.locator(".path-col .step .card").first();
        const dst = page.locator(".path-col .step .card").nth(1);
        const a = await src.boundingBox();
        const b = await dst.boundingBox();
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height + 20, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(600);
        const after = await cardTitles(page);
        rec("B5", "drag is a no-op while filtered", JSON.stringify(visible) === JSON.stringify(after));
      } else {
        rec("B5", "drag is a no-op while filtered", false, "needed 2 filtered cards");
      }

      await page.locator('.tag-filter-bar button:has-text("Clear filter")').click();
      await page.waitForTimeout(400);
      const restored = await cardTitles(page);
      rec("B6", "Clear filter restores the full list", restored.length === before.length);
    } catch (e) {
      fail("B4/B5/B6", "tag filter behaviour", e);
    }

    try {
      await page.locator(".step .card", { hasText: CARD_A }).locator("button", { hasText: "react" }).first().click();
      await page.waitForTimeout(300);
      await selectBoard(page, BETA);
      await page.waitForTimeout(300);
      rec("B7", "filter clears on board switch", (await page.locator(".tag-filter-bar").count()) === 0);
      await selectBoard(page, ALPHA);
    } catch (e) {
      fail("B7", "filter clears on board switch", e);
    }

    // ================= A — move card between boards =======================
    try {
      await openCard(page, CARD_A);
      dlg = page.locator('[role="dialog"]');
      const hadUrl = (await dlg.locator(`a[href="${CARD_URL}"]`).count()) > 0;
      const hadAtt = (await dlg.locator(".attachment-list").count()) > 0;
      rec("A1", "detail modal shows URL + attachment before the move", hadUrl && hadAtt);

      await dlg.locator(".move-card select").selectOption({ label: BETA });
      await dlg.locator('.move-row button:has-text("Move")').click();
      await dlg.waitFor({ state: "detached", timeout: 20000 });
      await page.waitForTimeout(800);

      const stillInAlpha = (await cardTitles(page)).includes(CARD_A);
      rec("A2", "card leaves the source board", !stillInAlpha);

      await selectBoard(page, BETA);
      const betaTitles = await cardTitles(page);
      rec(
        "A3",
        "card is appended at the end of the destination",
        betaTitles[betaTitles.length - 1] === CARD_A,
        `order=${JSON.stringify(betaTitles)}`
      );

      await openCard(page, CARD_A);
      dlg = page.locator('[role="dialog"]');
      const keptUrl = (await dlg.locator(`a[href="${CARD_URL}"]`).count()) > 0;
      const keptAtt = (await dlg.locator(".attachment-list").count()) > 0;
      rec("A4", "URL + attachment survive the move", keptUrl && keptAtt);
      await dlg.locator('button:has-text("Close")').click();
      await dlg.waitFor({ state: "detached" });

      await page.reload({ waitUntil: "domcontentloaded" });
      await selectBoard(page, BETA);
      const afterReload = await cardTitles(page);
      rec(
        "A5",
        "move survives reload",
        afterReload[afterReload.length - 1] === CARD_A
      );
    } catch (e) {
      fail("A", "move card between boards", e);
    }

    const banner = await page.locator(".save-error").count();
    rec("A/B", "no .save-error banner appeared", banner === 0);

    // ================= C — shareable link ================================
    try {
      await boardItem(page, BETA).locator('button[aria-label*="Share"]').click();
      dlg = page.locator('[role="dialog"]');
      await dlg.locator('button:has-text("Create share link")').click();
      await dlg.locator("input.share-url").waitFor({ timeout: 20000 });
      shareUrlV1 = await dlg.locator("input.share-url").inputValue();
      rec("C1/C2", "share link created", /\/share\/[0-9a-f-]{36}$/.test(shareUrlV1), shareUrlV1);
      await dlg.locator('button:has-text("Done")').click();
      await dlg.waitFor({ state: "detached" });
    } catch (e) {
      fail("C1/C2", "create share link", e);
    }

    // signed-out context
    if (shareUrlV1) {
      const anon = await browser.newContext();
      const ap = await anon.newPage();
      try {
        const target = shareUrlV1.replace(/^https?:\/\/[^/]+/, BASE);
        const resp = await ap.goto(target, { waitUntil: "domcontentloaded" });
        rec("C3", "signed-out visitor loads the shared board (200)", resp.status() === 200, `status=${resp.status()}`);

        const html = await ap.content();
        const bodyText = await ap.locator("body").innerText();
        rec("C3b", "board name renders read-only", bodyText.includes(BETA));
        rec(
          "C4",
          "no edit/delete/drag/attachment affordances",
          (await ap.locator('button[aria-label^="Edit"]').count()) === 0 &&
            (await ap.locator('button[aria-label^="Delete"]').count()) === 0 &&
            (await ap.locator(".attachments, .attachment-list").count()) === 0 &&
            !/Add step/i.test(bodyText)
        );
        rec(
          "C5",
          "no user_id / share_token in page source; noindex present",
          !/user_id/.test(html) &&
            !/share_token/.test(html) &&
            /name="robots" content="noindex"/.test(html)
        );
        rec("C6", "card URL renders on the public page", (await ap.locator(`a[href="${CARD_URL}"]`).count()) > 0);
      } catch (e) {
        fail("C3-C6", "public shared board", e);
      }

      // C7 — rotate invalidates the old link
      try {
        await boardItem(page, BETA).locator('button[aria-label*="Sharing"], button[aria-label*="Share"]').click();
        dlg = page.locator('[role="dialog"]');
        await dlg.locator('button:has-text("Rotate link")').click();
        await page.waitForTimeout(1500);
        shareUrlV2 = await dlg.locator("input.share-url").inputValue();
        await dlg.locator('button:has-text("Done")').click();
        await dlg.waitFor({ state: "detached" });
        rec("C7a", "rotate issues a different token", shareUrlV2 !== shareUrlV1);

        const oldResp = await ap.goto(shareUrlV1.replace(/^https?:\/\/[^/]+/, BASE), {
          waitUntil: "domcontentloaded",
        });
        rec("C7b", "old link 404s after rotate", oldResp.status() === 404, `status=${oldResp.status()}`);
        const newResp = await ap.goto(shareUrlV2.replace(/^https?:\/\/[^/]+/, BASE), {
          waitUntil: "domcontentloaded",
        });
        rec("C7c", "rotated link works", newResp.status() === 200, `status=${newResp.status()}`);
      } catch (e) {
        fail("C7", "rotate link", e);
      }

      // C8/C9 — revoke
      try {
        await boardItem(page, BETA).locator('button[aria-label*="Sharing"], button[aria-label*="Share"]').click();
        dlg = page.locator('[role="dialog"]');
        await dlg.locator('button:has-text("Stop sharing")').click();
        await page.waitForTimeout(1500);
        const backToPrivate = (await dlg.locator('button:has-text("Create share link")').count()) > 0;
        rec("C9", "modal returns to the private state after revoke", backToPrivate);
        await dlg.locator('button:has-text("Cancel"), button:has-text("Done")').first().click();
        await dlg.waitFor({ state: "detached" });

        const revoked = await ap.goto((shareUrlV2 || shareUrlV1).replace(/^https?:\/\/[^/]+/, BASE), {
          waitUntil: "domcontentloaded",
        });
        rec("C8", "revoked link 404s", revoked.status() === 404, `status=${revoked.status()}`);
      } catch (e) {
        fail("C8/C9", "revoke link", e);
      }
      await anon.close();
    }
  } catch (e) {
    rec("FATAL", "run aborted", false, e.message.split("\n")[0]);
  } finally {
    // ---- cleanup --------------------------------------------------------
    for (const name of [ALPHA, BETA]) {
      try {
        await page.goto(BASE, { waitUntil: "domcontentloaded" });
        const item = boardItem(page, name);
        if ((await item.count()) === 0) continue;
        await item.locator('button[aria-label^="Delete"]').click();
        const d = page.locator('[role="dialog"]');
        await d.locator('button:has-text("Delete")').last().click();
        await d.waitFor({ state: "detached", timeout: 20000 });
      } catch {
        console.log(`CLEANUP WARNING: could not delete board "${name}" — remove it by hand.`);
      }
    }
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n===== ${results.length - failed.length}/${results.length} passed =====`);
  if (failed.length) {
    console.log("FAILURES:");
    for (const f of failed) console.log(`  ${f.id}: ${f.desc}${f.detail ? ` — ${f.detail}` : ""}`);
  }
  process.exit(failed.length ? 1 : 0);
}

run();
