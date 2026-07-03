"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Attachment, Card } from "@/lib/types";
import StepCard from "./StepCard";

type PathCard = Card & { attachments: Attachment[] };

type TimelinePathProps = {
  title: string;
  cards: PathCard[];
  onReorder: (cards: PathCard[]) => void;
  onToggleDone: (id: string) => void;
  onAddStep: () => void;
};

/**
 * The right column: renders the board's cards as a top-to-bottom learning path
 * and wires up drag-to-reorder (mouse, touch, and keyboard) via @dnd-kit.
 */
export default function TimelinePath({
  title,
  cards,
  onReorder,
  onToggleDone,
  onAddStep,
}: TimelinePathProps) {
  const sensors = useSensors(
    // A small drag distance keeps card clicks (e.g. the done node) responsive.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(cards, oldIndex, newIndex));
  }

  return (
    <div className="path">
      <div className="path-head">
        <h2>{title}</h2>
        <span className="tag">— your path, top to bottom</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <StepCard key={card.id} card={card} onToggleDone={onToggleDone} />
          ))}
        </SortableContext>
      </DndContext>

      <button className="add-step" onClick={onAddStep}>
        + Add a step to your path
      </button>
    </div>
  );
}
