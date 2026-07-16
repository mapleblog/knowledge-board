/**
 * Domain types for Knowledge Board.
 * Mirrors the Supabase schema in supabase/schema.sql (see PRD §4).
 */

/** Preset accent colors a board can be tagged with (PRD acceptance criteria). */
export const BOARD_COLORS = ["#4f46e5", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

/** A card's progress through the learning path. Drives the timeline node state. */
export type CardStatus = "todo" | "in_progress" | "done";

/**
 * Narrow untrusted input (form value, DB text column) to a preset board
 * color, falling back to the default palette color.
 */
export function resolveBoardColor(value: unknown): BoardColor {
  const raw = String(value ?? "");
  return (BOARD_COLORS as readonly string[]).includes(raw)
    ? (raw as BoardColor)
    : BOARD_COLORS[0];
}

/**
 * Narrow a DB text column to a CardStatus. The `cards.status` check
 * constraint already guarantees one of the three values; "todo" is the
 * defensive fallback.
 */
export function resolveCardStatus(value: string): CardStatus {
  return value === "in_progress" || value === "done" ? value : "todo";
}

/** Caps that bound a card's tag array (enforced server-side, see card-actions). */
export const MAX_TAGS_PER_CARD = 10;
export const MAX_TAG_LENGTH = 30;

/**
 * Normalize a raw tag list: trim, lowercase, drop blanks, de-duplicate, cap
 * each tag's length and the total count. Shared by the client input (so the UI
 * previews what will be stored) and the server actions (authoritative).
 */
export function normalizeTags(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const tag = item.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS_PER_CARD) break;
  }
  return out;
}

/** Parse a comma/newline-separated tag string into a normalized tag list. */
export function parseTags(input: string): string[] {
  return normalizeTags(input.split(/[,\n]/));
}

export interface Board {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: BoardColor;
  created_at: string;
}

export interface Card {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  url: string | null;
  status: CardStatus;
  /** Free-form labels for filtering; normalized (lowercase, deduped, capped). */
  tags: string[];
  /** Fractional index used for drag-to-reorder without renumbering every row. */
  order_index: number;
  /** Optional emoji/icon shown on the card thumbnail in the timeline. */
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  card_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

/** A card plus its attachments, as passed around the board UI. */
export type CardWithAttachments = Card & { attachments: Attachment[] };

/** A board with its ordered cards + attachments, as rendered on the board view. */
export interface BoardWithCards extends Board {
  cards: CardWithAttachments[];
}
