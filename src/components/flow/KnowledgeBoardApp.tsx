"use client";

import { useMemo, useState } from "react";
import type { Attachment, BoardWithCards, Card, CardStatus } from "@/lib/types";
import BoardList from "./BoardList";
import TimelinePath from "./TimelinePath";
import SessionMenu from "@/components/auth/SessionMenu";

type PathCard = Card & { attachments: Attachment[] };

/**
 * Top-level client shell for the Flow board view. Holds board/card state
 * locally for the scaffold; swap the mutations for Supabase server actions
 * (with optimistic UI) when the backend is wired up.
 */
export default function KnowledgeBoardApp({
  initialBoards,
  userEmail,
}: {
  initialBoards: BoardWithCards[];
  userEmail?: string;
}) {
  const [boards, setBoards] = useState(initialBoards);
  const [activeId, setActiveId] = useState(initialBoards[0]?.id ?? "");

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeId) ?? boards[0],
    [boards, activeId]
  );

  function updateActiveCards(next: PathCard[]) {
    setBoards((prev) =>
      prev.map((b) => (b.id === activeBoard.id ? { ...b, cards: next } : b))
    );
  }

  function handleReorder(next: PathCard[]) {
    // Persist positions as evenly spaced order_index values (1..n).
    updateActiveCards(next.map((c, i) => ({ ...c, order_index: i + 1 })));
  }

  function handleToggleDone(id: string) {
    updateActiveCards(
      activeBoard.cards.map((c) => {
        if (c.id !== id) return c;
        const status: CardStatus = c.status === "done" ? "todo" : "done";
        return { ...c, status };
      })
    );
  }

  function handleAddStep() {
    const id = `card-${Date.now()}`;
    const next: PathCard = {
      id,
      board_id: activeBoard.id,
      title: "New step",
      description: null,
      url: null,
      status: "todo",
      order_index: activeBoard.cards.length + 1,
      icon: "📝",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachments: [],
    };
    updateActiveCards([...activeBoard.cards, next]);
  }

  function handleNewBoard() {
    // Placeholder: real flow opens a "new board" modal (name + accent color).
    // Left as a no-op stub in the scaffold.
  }

  if (!activeBoard) return null;

  return (
    <div className="flow">
      <div className="surface">
        <div className="top">
          <div className="brand">
            <span className="m" /> Trailmark
          </div>
          <button className="btn" onClick={handleNewBoard}>
            + New board
          </button>
          {userEmail ? (
            <SessionMenu email={userEmail} />
          ) : (
            <button className="av" aria-label="Account" />
          )}
        </div>

        <div className="cols">
          <BoardList
            boards={boards}
            activeId={activeBoard.id}
            onSelect={setActiveId}
            onNewBoard={handleNewBoard}
          />
          <TimelinePath
            title={activeBoard.name}
            cards={activeBoard.cards}
            onReorder={handleReorder}
            onToggleDone={handleToggleDone}
            onAddStep={handleAddStep}
          />
        </div>
      </div>
    </div>
  );
}
