"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmAttachment, createUploadTarget } from "@/lib/attachment-actions";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE } from "@/lib/attachment-constraints";

type AttachmentUploaderProps = {
  cardId: string;
};

const ALLOWED_MIME_SET: readonly string[] = ALLOWED_ATTACHMENT_MIME_TYPES;

/** File picker + client-side validation + signed-upload flow for a card's attachments. */
export default function AttachmentUploader({ cardId }: AttachmentUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);

    if (!ALLOWED_MIME_SET.includes(file.type)) {
      setError("Only PNG, JPG, WEBP, and PDF files are supported.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError("Files must be 5MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const target = await createUploadTarget(cardId, file.name, file.type, file.size);
      if ("error" in target) {
        setError(target.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .uploadToSignedUrl(target.path, target.token, file);
      if (uploadError) {
        setError("Upload failed. Please try again.");
        return;
      }

      const result = await confirmAttachment(cardId, target.path, file.name);
      if (result?.error) {
        setError(result.error);
        return;
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="attach-upload">
      <button
        type="button"
        className="btn ghost"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading…" : "+ Add attachment"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        onChange={handleChange}
        hidden
      />
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
