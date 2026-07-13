"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET } from "@/lib/attachment-constraints";
import type { CardStatus } from "@/lib/types";

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
    .update({ title, description: description || null, url: url || null })
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
