"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Attachment, Card } from "@/lib/types";
import { linkLabel, statusPill } from "@/lib/board";

type PathCard = Card & { attachments: Attachment[] };

type StepCardProps = {
  card: PathCard;
  /** Toggle this card between done / not-done (fills the timeline node). */
  onToggleDone: (id: string) => void;
  onOpenDetail: (card: PathCard) => void;
  onEdit: (card: PathCard) => void;
  onDelete: (card: PathCard) => void;
};

/**
 * One row of the learning-path timeline: a node dot on the rail plus a
 * draggable knowledge card. The grip (⋮⋮) is the drag handle so the rest of
 * the card stays clickable.
 */
export default function StepCard({
  card,
  onToggleDone,
  onOpenDetail,
  onEdit,
  onDelete,
}: StepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const pill = statusPill(card.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`step${card.status === "done" ? " done" : ""}`}
    >
      <span className="node" onClick={() => onToggleDone(card.id)} title="Toggle done" />
      <div
        className={`card${isDragging ? " dragging" : ""}`}
        onClick={() => onOpenDetail(card)}
      >
        <div className="r">
          <span
            className="grip"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to reorder"
          >
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
          <span className={`mini${pill.accent ? " accent" : ""}`}>{pill.label}</span>
          {card.url ? <span className="mini">{linkLabel(card.url)}</span> : null}
          {card.attachments.map((a) => (
            <span className="mini" key={a.id}>
              📎 {a.file_name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
