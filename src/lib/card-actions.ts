"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CardStatus } from "@/lib/types";

export type CardActionState = { error?: string } | null;

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

export async function deleteCard(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("cards").delete().eq("id", id);

  revalidatePath("/");
}

/** Persists a single card's new position after a drag-reorder. */
export async function reorderCard(id: string, orderIndex: number): Promise<void> {
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("cards").update({ order_index: orderIndex }).eq("id", id);

  revalidatePath("/");
}

export async function updateCardStatus(id: string, status: CardStatus): Promise<void> {
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("cards").update({ status }).eq("id", id);

  revalidatePath("/");
}
