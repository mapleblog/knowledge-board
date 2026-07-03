/**
 * Domain types for Knowledge Board.
 * Mirrors the Supabase schema in supabase/schema.sql (see PRD §4).
 */

/** Preset accent colors a board can be tagged with (PRD acceptance criteria). */
export const BOARD_COLORS = ["#4f46e5", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

/** A card's progress through the learning path. Drives the timeline node state. */
export type CardStatus = "todo" | "in_progress" | "done";

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

/** A board with its ordered cards + attachments, as rendered on the board view. */
export interface BoardWithCards extends Board {
  cards: (Card & { attachments: Attachment[] })[];
}
