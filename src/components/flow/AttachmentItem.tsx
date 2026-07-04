"use client";

import { useActionState } from "react";
import type { Attachment } from "@/lib/types";
import { deleteAttachment } from "@/lib/attachment-actions";

type AttachmentItemProps = {
  attachment: Attachment;
  /** Signed URL for preview/download, fetched in one batch by the card detail modal. */
  url: string | null;
};

/** One attachment row: image preview (if applicable), download link, delete. */
export default function AttachmentItem({ attachment, url }: AttachmentItemProps) {
  const [deleteState, deleteAction, deleting] = useActionState(deleteAttachment, null);
  const isImage = attachment.mime_type.startsWith("image/");

  return (
    <div className="attachment-item">
      {isImage && url ? (
        <a href={url} target="_blank" rel="noreferrer noopener">
          <img src={url} alt={attachment.file_name} className="attachment-thumb" />
        </a>
      ) : (
        <span className="mini">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer noopener">
              📎 {attachment.file_name}
            </a>
          ) : (
            <>📎 {attachment.file_name}</>
          )}
        </span>
      )}
      <form action={deleteAction}>
        <input type="hidden" name="id" value={attachment.id} />
        <input type="hidden" name="file_path" value={attachment.file_path} />
        <button
          type="submit"
          className="icon-btn"
          aria-label={`Delete ${attachment.file_name}`}
          disabled={deleting}
        >
          🗑
        </button>
      </form>
      {deleteState?.error && <p className="auth-error">{deleteState.error}</p>}
    </div>
  );
}
