import type { Card, CardStatus } from "./types";

/** Count of done cards and total, for the "X of Y done" board label. */
export function boardProgress(cards: Pick<Card, "status">[]) {
  const total = cards.length;
  const done = cards.filter((c) => c.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
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

/** A short attachment/link chip label, e.g. "🔗 mdn" or "📎 notes.md". */
export function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const short = host.split(".").slice(-2, -1)[0] ?? host;
    return `🔗 ${short}`;
  } catch {
    return "🔗 link";
  }
}
