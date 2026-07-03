"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Attachment, Card } from "@/lib/types";
import { linkLabel, statusPill } from "@/lib/board";

type StepCardProps = {
  card: Card & { attachments: Attachment[] };
  /** Toggle this card between done / not-done (fills the timeline node). */
  onToggleDone: (id: string) => void;
};

/**
 * One row of the learning-path timeline: a node dot on the rail plus a
 * draggable knowledge card. The grip (⋮⋮) is the drag handle so the rest of
 * the card stays clickable.
 */
export default function StepCard({ card, onToggleDone }: StepCardProps) {
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
      <div className={`card${isDragging ? " dragging" : ""}`}>
        <div className="r">
          <span
            className="grip"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            ⋮⋮
          </span>
          <h5>{card.title}</h5>
          {card.icon ? <span className="thumb">{card.icon}</span> : null}
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
