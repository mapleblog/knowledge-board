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
  /** null = private; a uuid = shared read-only via /share/<token>. */
  share_token: string | null;
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

/**
 * The read-only, public-safe projection returned by the `get_shared_board`
 * RPC (see supabase/schema.sql). Deliberately excludes user_id, share_token,
 * and attachments — never widen this to leak owner-only data onto share pages.
 */
export interface SharedCard {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  status: CardStatus;
  tags: string[];
  order_index: number;
}

export interface SharedBoard {
  id: string;
  name: string;
  color: BoardColor;
  description: string | null;
  cards: SharedCard[];
}

/**
 * Narrow the untyped `get_shared_board` JSON into a SharedBoard, or null if it
 * doesn't look like a board (no match, or malformed). Defensive: the RPC is a
 * trust boundary, so validate its shape rather than casting.
 */
export function parseSharedBoard(value: unknown): SharedBoard | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;
  const rawCards = Array.isArray(v.cards) ? v.cards : [];
  const cards: SharedCard[] = rawCards.map((raw) => {
    const c = (raw ?? {}) as Record<string, unknown>;
    return {
      id: String(c.id ?? ""),
      title: String(c.title ?? ""),
      description: typeof c.description === "string" ? c.description : null,
      url: typeof c.url === "string" ? c.url : null,
      status: resolveCardStatus(String(c.status ?? "todo")),
      tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
      order_index: typeof c.order_index === "number" ? c.order_index : 0,
    };
  });
  cards.sort((a, b) => a.order_index - b.order_index);
  return {
    id: v.id,
    name: v.name,
    color: resolveBoardColor(v.color),
    description: typeof v.description === "string" ? v.description : null,
    cards,
  };
}
