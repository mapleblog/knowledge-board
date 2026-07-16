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
import type { CardWithAttachments } from "@/lib/types";
import StepCard from "./StepCard";

type TimelinePathProps = {
  boardId: string;
  title: string;
  cards: CardWithAttachments[];
  onReorder: (cards: CardWithAttachments[], movedId: string, movedIndex: number) => void;
  /** Advance the card's status one step (next up → in progress → done → next up). */
  onCycleStatus: (id: string) => void;
  onAddStep: () => void;
  onOpenDetail: (card: CardWithAttachments) => void;
  onEditCard: (card: CardWithAttachments) => void;
  onDeleteCard: (card: CardWithAttachments) => void;
  onFilterTag: (tag: string) => void;
  /** True while a tag filter shows a partial list — drag-reorder is disabled. */
  sortDisabled?: boolean;
};

/**
 * The right column: renders the board's cards as a top-to-bottom learning path
 * and wires up drag-to-reorder (mouse, touch, and keyboard) via @dnd-kit.
 */
export default function TimelinePath({
  boardId,
  title,
  cards,
  onReorder,
  onCycleStatus,
  onAddStep,
  onOpenDetail,
  onEditCard,
  onDeleteCard,
  onFilterTag,
  sortDisabled = false,
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
    const next = arrayMove(cards, oldIndex, newIndex);
    onReorder(next, active.id as string, newIndex);
  }

  return (
    <div className="path">
      <div className="path-head">
        <h2>{title}</h2>
        <span className="tag">— your path, top to bottom</span>
      </div>

      <DndContext
        id={`path-${boardId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <StepCard
              key={card.id}
              card={card}
              onCycleStatus={onCycleStatus}
              onOpenDetail={onOpenDetail}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
              onFilterTag={onFilterTag}
              sortDisabled={sortDisabled}
            />
          ))}
        </SortableContext>
      </DndContext>

      {cards.length === 0 && (
        <p className="path-empty">
          This path has no steps yet. Add your first one below to start building
          it.
        </p>
      )}

      <button className="add-step" onClick={onAddStep}>
        + Add a step to your path
      </button>
    </div>
  );
}
