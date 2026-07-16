"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET } from "@/lib/attachment-constraints";
import { resolveBoardColor } from "@/lib/types";

export type BoardActionState = { error?: string } | null;
export type ShareActionState = { error?: string; token?: string } | null;

/**
 * Enable (or rotate) a board's public read-only share link by assigning a fresh
 * random token. Rotating invalidates any previously shared URL. The redundant
 * `user_id` filter is defense-in-depth on top of the owner-only RLS.
 */
export async function setShareToken(boardId: string): Promise<ShareActionState> {
  if (!boardId) {
    return { error: "Missing board." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const token = crypto.randomUUID();
  const { error } = await supabase
    .from("boards")
    .update({ share_token: token })
    .eq("id", boardId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Could not create the share link. Please try again." };
  }

  revalidatePath("/");
  return { token };
}

/** Revoke a board's share link (set the token back to null → link 404s). */
export async function revokeShareLink(boardId: string): Promise<ShareActionState> {
  if (!boardId) {
    return { error: "Missing board." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("boards")
    .update({ share_token: null })
    .eq("id", boardId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Could not stop sharing. Please try again." };
  }

  revalidatePath("/");
  return null;
}

export async function createBoard(
  _prevState: BoardActionState,
  formData: FormData
): Promise<BoardActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = resolveBoardColor(formData.get("color"));

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
  const color = resolveBoardColor(formData.get("color"));

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

export async function deleteBoard(
  _prevState: BoardActionState,
  formData: FormData
): Promise<BoardActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Missing board." };
  }

  const supabase = await createClient();

  // Remove all attachment storage objects under this board's cards first:
  // the DB cascade only deletes the attachments *rows*, and the storage
  // delete policy traces ownership through the cards rows, so they must
  // still exist when remove() runs.
  const { data: attachments } = await supabase
    .from("attachments")
    .select("file_path, cards!inner(board_id)")
    .eq("cards.board_id", id);
  const paths = (attachments ?? []).map((a) => a.file_path);
  if (paths.length > 0) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("boards").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete board. Please try again." };
  }

  revalidatePath("/");
  return null;
}
