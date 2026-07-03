"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BOARD_COLORS, type BoardColor } from "@/lib/types";

export type BoardActionState = { error?: string } | null;

function resolveColor(raw: FormDataEntryValue | null): BoardColor {
  const value = String(raw ?? "");
  return (BOARD_COLORS as readonly string[]).includes(value)
    ? (value as BoardColor)
    : BOARD_COLORS[0];
}

export async function createBoard(
  _prevState: BoardActionState,
  formData: FormData
): Promise<BoardActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = resolveColor(formData.get("color"));

  if (!name) {
    return { error: "Board name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase.from("boards").insert({
    user_id: user.id,
    name,
    description: description || null,
    color,
  });

  if (error) {
    return { error: "Could not create board. Please try again." };
  }

  revalidatePath("/");
  return null;
}

export async function updateBoard(
  _prevState: BoardActionState,
  formData: FormData
): Promise<BoardActionState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = resolveColor(formData.get("color"));

  if (!id) {
    return { error: "Missing board." };
  }
  if (!name) {
    return { error: "Board name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("boards")
    .update({ name, description: description || null, color })
    .eq("id", id);

  if (error) {
    return { error: "Could not save changes. Please try again." };
  }

  revalidatePath("/");
  return null;
}

export async function deleteBoard(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("boards").delete().eq("id", id);

  revalidatePath("/");
}
