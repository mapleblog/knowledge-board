"use client";

import { useEffect, useState } from "react";
import type { Attachment } from "@/lib/types";
import { deleteAttachment, getAttachmentUrl } from "@/lib/attachment-actions";

type AttachmentItemProps = {
  attachment: Attachment;
};

/** One attachment row: image preview (if applicable), download link, delete. */
export default function AttachmentItem({ attachment }: AttachmentItemProps) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = attachment.mime_type.startsWith("image/");

  useEffect(() => {
    let cancelled = false;
    getAttachmentUrl(attachment.file_path).then((signedUrl) => {
      if (!cancelled) setUrl(signedUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [attachment.file_path]);

  async function handleDelete(formData: FormData) {
    await deleteAttachment(formData);
  }

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
      <form action={handleDelete}>
        <input type="hidden" name="id" value={attachment.id} />
        <input type="hidden" name="file_path" value={attachment.file_path} />
        <button type="submit" className="icon-btn" aria-label={`Delete ${attachment.file_name}`}>
          🗑
        </button>
      </form>
    </div>
  );
}
