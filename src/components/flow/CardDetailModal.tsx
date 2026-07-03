"use client";

import type { Attachment, Card } from "@/lib/types";
import { linkLabel, statusPill } from "@/lib/board";
import AttachmentItem from "./AttachmentItem";
import AttachmentUploader from "./AttachmentUploader";

type CardDetailModalProps = {
  card: Card & { attachments: Attachment[] };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Full card detail view: description, clickable URL, attachments, edit/delete. */
export default function CardDetailModal({ card, onClose, onEdit, onDelete }: CardDetailModalProps) {
  const pill = statusPill(card.status);

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
                <AttachmentItem key={a.id} attachment={a} />
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
