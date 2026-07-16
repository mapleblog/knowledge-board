"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Attachment, CardWithAttachments } from "@/lib/types";
import { linkLabel, statusPill } from "@/lib/board";
import { getAttachmentUrls } from "@/lib/attachment-actions";

type StepCardProps = {
  card: CardWithAttachments;
  /** Advance this card's status (next up → in progress → done → next up). */
  onCycleStatus: (id: string) => void;
  onOpenDetail: (card: CardWithAttachments) => void;
  onEdit: (card: CardWithAttachments) => void;
  onDelete: (card: CardWithAttachments) => void;
  onFilterTag: (tag: string) => void;
  /** Disable drag-reorder (e.g. while a tag filter shows a partial list). */
  sortDisabled?: boolean;
};

/**
 * One row of the learning-path timeline: a node dot on the rail plus a
 * draggable knowledge card. The whole card is the drag handle (the sensors'
 * activation constraints keep plain clicks working); the grip (⋮⋮) is a
 * visual affordance only.
 */
export default function StepCard({
  card,
  onCycleStatus,
  onOpenDetail,
  onEdit,
  onDelete,
  onFilterTag,
  sortDisabled = false,
}: StepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: sortDisabled });

  // Attachments are private; fetch a signed URL on click and open it. The blank
  // tab is opened synchronously so the pop-up isn't blocked, then pointed at the
  // URL once it resolves.
  const [openingId, setOpeningId] = useState<string | null>(null);
  async function openAttachment(
    e: React.MouseEvent,
    attachment: Attachment
  ) {
    e.stopPropagation();
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setOpeningId(attachment.id);
    try {
      const urls = await getAttachmentUrls([attachment.file_path]);
      const url = urls[attachment.file_path];
      if (url && tab) {
        tab.location.href = url;
      } else if (url) {
        window.location.assign(url);
      } else {
        tab?.close();
      }
    } catch {
      tab?.close();
    } finally {
      setOpeningId(null);
    }
  }

  // A drag ends with the pointer still over the card, which fires a click;
  // remember the drag so that click doesn't open the detail view.
  const wasDragged = useRef(false);
  useEffect(() => {
    if (isDragging) {
      wasDragged.current = true;
      return;
    }
    // Clear the flag once the drop's click (if any) has fired: a keyboard
    // drag produces no click at all, and without this the stale flag would
    // swallow the next genuine click on the card.
    const timeout = setTimeout(() => {
      wasDragged.current = false;
    });
    return () => clearTimeout(timeout);
  }, [isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const pill = statusPill(card.status);
  const stepClass =
    card.status === "done"
      ? " done"
      : card.status === "in_progress"
        ? " in-progress"
        : "";
  const nextLabel =
    card.status === "todo"
      ? "Mark in progress"
      : card.status === "in_progress"
        ? "Mark done"
        : "Mark not started";

  return (
    <div ref={setNodeRef} style={style} className={`step${stepClass}`}>
      <button
        type="button"
        className="node"
        onClick={() => onCycleStatus(card.id)}
        aria-label={nextLabel}
        title={nextLabel}
      />
      <div
        className={`card${isDragging ? " dragging" : ""}`}
        {...attributes}
        {...listeners}
        onClick={() => {
          if (wasDragged.current) {
            wasDragged.current = false;
            return;
          }
          onOpenDetail(card);
        }}
      >
        <div className="r">
          <span className="grip" aria-hidden="true">
            ⋮⋮
          </span>
          <h5>{card.title}</h5>
          {card.icon ? <span className="thumb">{card.icon}</span> : null}
          <button
            type="button"
            className="icon-btn"
            aria-label={`Edit ${card.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
          >
            ✎
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Delete ${card.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card);
            }}
          >
            🗑
          </button>
        </div>
        {card.description ? <p>{card.description}</p> : null}
        <div className="foot">
          <span className={`mini status-${card.status.replace("_", "-")}`}>
            {pill.label}
          </span>
          {card.url ? (
            <a
              className="mini mini-action"
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {linkLabel(card.url)}
            </a>
          ) : null}
          {card.attachments.map((a) => (
            <button
              type="button"
              className="mini mini-action"
              key={a.id}
              onClick={(e) => openAttachment(e, a)}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={openingId === a.id}
            >
              📎 {openingId === a.id ? "Opening…" : a.file_name}
            </button>
          ))}
          {card.tags.map((tag) => (
            <button
              type="button"
              className="mini tag-chip-action"
              key={tag}
              onClick={(e) => {
                e.stopPropagation();
                onFilterTag(tag);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Filter by tag ${tag}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
