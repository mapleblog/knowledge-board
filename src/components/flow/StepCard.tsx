"use client";

import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardWithAttachments } from "@/lib/types";
import { linkLabel, statusPill } from "@/lib/board";

type StepCardProps = {
  card: CardWithAttachments;
  /** Advance this card's status (next up → in progress → done → next up). */
  onCycleStatus: (id: string) => void;
  onOpenDetail: (card: CardWithAttachments) => void;
  onEdit: (card: CardWithAttachments) => void;
  onDelete: (card: CardWithAttachments) => void;
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
}: StepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  // A drag ends with the pointer still over the card, which fires a click;
  // remember the drag so that click doesn't open the detail view.
  const wasDragged = useRef(false);
  useEffect(() => {
    if (isDragging) wasDragged.current = true;
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
