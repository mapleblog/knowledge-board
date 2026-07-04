"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  ATTACHMENTS_BUCKET,
  MAX_ATTACHMENT_SIZE,
} from "@/lib/attachment-constraints";

export type AttachmentActionState = { error?: string } | null;
export type UploadTarget = { path: string; token: string };

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file";
}

/**
 * Validates the incoming file (type/size) and the caller's ownership of the
 * card, then hands back a one-time signed URL the browser can upload
 * directly to Supabase Storage.
 */
export async function createUploadTarget(
  cardId: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<UploadTarget | { error: string }> {
  if (!cardId) {
    return { error: "Missing card." };
  }
  if (!(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { error: "Only PNG, JPG, WEBP, and PDF files are supported." };
  }
  if (fileSize > MAX_ATTACHMENT_SIZE) {
    return { error: "Files must be 5MB or smaller." };
  }

  const supabase = await createClient();
  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .maybeSingle();
  if (!card) {
    return { error: "Card not found." };
  }

  const path = `${cardId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { error: "Could not prepare upload. Please try again." };
  }

  return { path: data.path, token: data.token };
}

/**
 * Called after the browser finishes uploading to the signed URL. Re-checks
 * the object actually in storage (authoritative size/type) before trusting
 * it, then persists the `attachments` row.
 */
export async function confirmAttachment(
  cardId: string,
  path: string,
  fileName: string
): Promise<AttachmentActionState> {
  if (!cardId || !path) {
    return { error: "Missing upload." };
  }

  const supabase = await createClient();

  const lastSlash = path.lastIndexOf("/");
  const folder = path.slice(0, lastSlash);
  const objectName = path.slice(lastSlash + 1);

  const { data: listing, error: listError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .list(folder, { search: objectName });
  const object = listing?.find((o) => o.name === objectName);

  if (listError || !object) {
    return { error: "Upload could not be verified. Please try again." };
  }

  const size = object.metadata?.size as number | undefined;
  const mimeType = object.metadata?.mimetype as string | undefined;

  if (!size || size > MAX_ATTACHMENT_SIZE) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
    return { error: "File is too large." };
  }
  if (!mimeType || !(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
    return { error: "Unsupported file type." };
  }

  const { error } = await supabase.from("attachments").insert({
    card_id: cardId,
    file_path: path,
    file_name: fileName,
    file_size: size,
    mime_type: mimeType,
  });

  if (error) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
    return { error: "Could not save attachment. Please try again." };
  }

  revalidatePath("/");
  return null;
}

export async function deleteAttachment(
  _prevState: AttachmentActionState,
  formData: FormData
): Promise<AttachmentActionState> {
  const id = String(formData.get("id") ?? "");
  const filePath = String(formData.get("file_path") ?? "");
  if (!id) {
    return { error: "Missing attachment." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("attachments").delete().eq("id", id);
  if (error) {
    return { error: "Could not delete attachment. Please try again." };
  }
  if (filePath) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([filePath]);
  }

  revalidatePath("/");
  return null;
}

/**
 * Short-lived signed URLs for previewing/downloading private attachments,
 * keyed by file path. One storage call for the whole card, not one per
 * attachment; paths that fail to sign map to null.
 */
export async function getAttachmentUrls(
  filePaths: string[]
): Promise<Record<string, string | null>> {
  const paths = filePaths.filter(Boolean);
  if (paths.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrls(paths, 3600);

  const urls: Record<string, string | null> = {};
  for (const path of paths) urls[path] = null;
  if (!error && data) {
    for (const entry of data) {
      if (entry.path && !entry.error) urls[entry.path] = entry.signedUrl;
    }
  }
  return urls;
}
