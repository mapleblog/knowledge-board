"use client";

import { useEffect, useState } from "react";
import type { CardWithAttachments } from "@/lib/types";
import { linkLabel, statusPill } from "@/lib/board";
import { getAttachmentUrls } from "@/lib/attachment-actions";
import AttachmentItem from "./AttachmentItem";
import AttachmentUploader from "./AttachmentUploader";

type CardDetailModalProps = {
  card: CardWithAttachments;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Full card detail view: description, clickable URL, attachments, edit/delete. */
export default function CardDetailModal({ card, onClose, onEdit, onDelete }: CardDetailModalProps) {
  const pill = statusPill(card.status);
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  // One signed-URL fetch for all attachments; keyed on the paths (not the
  // array identity) so board refetches don't re-sign unchanged attachments.
  const pathsKey = card.attachments.map((a) => a.file_path).join("\n");

  useEffect(() => {
    // No attachments → nothing reads the map, so leftover entries are harmless.
    const paths = pathsKey ? pathsKey.split("\n") : [];
    if (paths.length === 0) return;
    let cancelled = false;
    getAttachmentUrls(paths).then((next) => {
      if (!cancelled) setUrls(next);
    });
    return () => {
      cancelled = true;
    };
  }, [pathsKey]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{card.title}</h2>
        <span className={`mini${pill.accent ? " accent" : ""}`}>{pill.label}</span>

        {card.description && <p className="tag">{card.description}</p>}

        {card.url && (
          <p>
            <a href={card.url} target="_blank" rel="noreferrer noopener">
              {linkLabel(card.url)}
            </a>
          </p>
        )}

        <div className="attachments">
          <span className="subhead">Attachments</span>
          {card.attachments.length > 0 && (
            <div className="attachment-list">
              {card.attachments.map((a) => (
                <AttachmentItem key={a.id} attachment={a} url={urls[a.file_path] ?? null} />
              ))}
            </div>
          )}
          <AttachmentUploader cardId={card.id} />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="btn ghost" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
