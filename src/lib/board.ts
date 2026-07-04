import type { Card, CardStatus } from "./types";

/** Count of done cards and total, for the "X of Y done" board label. */
export function boardProgress(cards: Pick<Card, "status">[]) {
  const total = cards.length;
  const done = cards.filter((c) => c.status === "done").length;
  const inProgress = cards.filter((c) => c.status === "in_progress").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const inProgressPct = total === 0 ? 0 : Math.round((inProgress / total) * 100);
  return { done, total, pct, inProgress, inProgressPct };
}

/** Short chip label + whether it should use the accent style, per card status. */
export function statusPill(status: CardStatus): { label: string; accent: boolean } {
  switch (status) {
    case "done":
      return { label: "✓ done", accent: true };
    case "in_progress":
      return { label: "in progress", accent: false };
    case "todo":
    default:
      return { label: "next up", accent: false };
  }
}

/**
 * Fractional order_index for a card that now sits at `movedIndex` within
 * `cards` (already reordered), so only that one row needs to be written.
 */
export function reorderIndex(
  cards: Pick<Card, "order_index">[],
  movedIndex: number
): number {
  const prev = cards[movedIndex - 1];
  const next = cards[movedIndex + 1];
  if (prev && next) return (prev.order_index + next.order_index) / 2;
  if (prev) return prev.order_index + 1;
  if (next) return next.order_index - 1;
  return 1;
}

/**
 * Common second-level labels that pair with a 2-letter ccTLD to form a
 * two-part public suffix (co.uk, com.au, ac.jp, …), so the chip shows the
 * brand label ("example"), not the suffix ("co").
 */
const SECOND_LEVEL_SUFFIXES = new Set(["co", "com", "net", "org", "gov", "edu", "ac"]);

/** A short attachment/link chip label, e.g. "🔗 mdn" or "📎 notes.md". */
export function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    let index = parts.length - 2; // default: the label left of the TLD
    if (
      parts.length >= 3 &&
      parts[parts.length - 1].length === 2 &&
      SECOND_LEVEL_SUFFIXES.has(parts[parts.length - 2])
    ) {
      index = parts.length - 3;
    }
    return `🔗 ${parts[Math.max(index, 0)]}`;
  } catch {
    return "🔗 link";
  }
}
