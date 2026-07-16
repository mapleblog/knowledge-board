"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET } from "@/lib/attachment-constraints";
import { parseTags, type CardStatus } from "@/lib/types";

export type CardActionState = { error?: string } | null;

/**
 * Only http(s) URLs may be stored. The <input type="url"> check is
 * client-side only; a stored javascript: href becomes XSS the moment boards
 * are viewable by anyone but their owner (v2 shareable links).
 */
function isSafeHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export async function createCard(
  _prevState: CardActionState,
  formData: FormData
): Promise<CardActionState> {
  const boardId = String(formData.get("board_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const tags = parseTags(String(formData.get("tags") ?? ""));

  if (!boardId) {
    return { error: "Missing board." };
  }
  if (!title) {
    return { error: "Card title is required." };
  }
  if (url && !isSafeHttpUrl(url)) {
    return { error: "The URL must start with http:// or https://." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: last } = await supabase
    .from("cards")
    .select("order_index")
    .eq("board_id", boardId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const order_index = (last?.order_index ?? 0) + 1;

  const { error } = await supabase.from("cards").insert({
    board_id: boardId,
    title,
    description: description || null,
    url: url || null,
    tags,
    order_index,
  });

  if (error) {
    return { error: "Could not create card. Please try again." };
  }

  revalidatePath("/");
  return null;
}

export async function updateCard(
  _prevState: CardActionState,
  formData: FormData
): Promise<CardActionState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const tags = parseTags(String(formData.get("tags") ?? ""));

  if (!id) {
    return { error: "Missing card." };
  }
  if (!title) {
    return { error: "Card title is required." };
  }
  if (url && !isSafeHttpUrl(url)) {
    return { error: "The URL must start with http:// or https://." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({ title, description: description || null, url: url || null, tags })
    .eq("id", id);

  if (error) {
    return { error: "Could not save changes. Please try again." };
  }

  revalidatePath("/");
  return null;
}

export async function deleteCard(
  _prevState: CardActionState,
  formData: FormData
): Promise<CardActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Missing card." };
  }

  const supabase = await createClient();

  // Remove the card's storage objects first: the DB cascade only deletes the
  // attachments *rows*, and the storage delete policy traces ownership
  // through the cards row, so it must still exist when remove() runs.
  const { data: attachments } = await supabase
    .from("attachments")
    .select("file_path")
    .eq("card_id", id);
  const paths = (attachments ?? []).map((a) => a.file_path);
  if (paths.length > 0) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("cards").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete card. Please try again." };
  }

  revalidatePath("/");
  return null;
}

/** Persists a single card's new position after a drag-reorder. */
export async function reorderCard(id: string, orderIndex: number): Promise<CardActionState> {
  if (!id) {
    return { error: "Missing card." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({ order_index: orderIndex })
    .eq("id", id);

  // Revalidate even on failure so the optimistic client order snaps back to
  // the server's truth instead of silently keeping an unsaved order.
  revalidatePath("/");

  if (error) {
    return { error: "Could not save the new order. Please try again." };
  }
  return null;
}

/**
 * Moves a card to another of the user's boards, appended to that board's end.
 * The card's attachments follow automatically — they reference `card_id`
 * (unchanged) and their Storage objects are pathed by `card_id`, so nothing in
 * Storage moves. RLS already guards both sides (the update's `using` checks the
 * source board's ownership and its `with check` the destination's); the explicit
 * destination-ownership read below gives a clean error and the next order_index.
 */
export async function moveCard(cardId: string, destBoardId: string): Promise<CardActionState> {
  if (!cardId || !destBoardId) {
    return { error: "Missing card or destination board." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: destBoard } = await supabase
    .from("boards")
    .select("id")
    .eq("id", destBoardId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!destBoard) {
    return { error: "Destination board not found." };
  }

  const { data: last } = await supabase
    .from("cards")
    .select("order_index")
    .eq("board_id", destBoardId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_index = (last?.order_index ?? 0) + 1;

  const { error } = await supabase
    .from("cards")
    .update({ board_id: destBoardId, order_index })
    .eq("id", cardId);

  // Revalidate even on failure so the optimistic client move snaps back.
  revalidatePath("/");

  if (error) {
    return { error: "Could not move the card. Please try again." };
  }
  return null;
}

export async function updateCardStatus(
  id: string,
  status: CardStatus
): Promise<CardActionState> {
  if (!id) {
    return { error: "Missing card." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cards").update({ status }).eq("id", id);

  // Revalidate even on failure so the optimistic toggle snaps back.
  revalidatePath("/");

  if (error) {
    return { error: "Could not update the step's status. Please try again." };
  }
  return null;
}
