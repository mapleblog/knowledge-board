"use client";

import { useMemo, useState } from "react";
import type { Attachment, Board, BoardWithCards, Card, CardStatus } from "@/lib/types";
import BoardList from "./BoardList";
import TimelinePath from "./TimelinePath";
import BoardModal from "./BoardModal";
import DeleteBoardModal from "./DeleteBoardModal";
import SessionMenu from "@/components/auth/SessionMenu";

type PathCard = Card & { attachments: Attachment[] };

/**
 * Top-level client shell for the Flow board view. Board CRUD is persisted via
 * Server Actions (src/lib/board-actions.ts); card mutations below are still
 * local-only pending Phase 3.
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
  const [modalBoard, setModalBoard] = useState<Board | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);

  // Re-sync when the server refetches boards after a create/edit/delete
  // (adjusting state during render, per https://react.dev/learn/you-might-not-need-an-effect).
  const [prevInitialBoards, setPrevInitialBoards] = useState(initialBoards);
  if (initialBoards !== prevInitialBoards) {
    setPrevInitialBoards(initialBoards);
    setBoards(initialBoards);
    setActiveId((prev) =>
      initialBoards.some((b) => b.id === prev) ? prev : initialBoards[0]?.id ?? ""
    );
  }

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeId) ?? boards[0],
    [boards, activeId]
  );

  function updateActiveCards(next: PathCard[]) {
    if (!activeBoard) return;
    setBoards((prev) =>
      prev.map((b) => (b.id === activeBoard.id ? { ...b, cards: next } : b))
    );
  }

  function handleReorder(next: PathCard[]) {
    // Persist positions as evenly spaced order_index values (1..n).
    updateActiveCards(next.map((c, i) => ({ ...c, order_index: i + 1 })));
  }

  function handleToggleDone(id: string) {
    if (!activeBoard) return;
    updateActiveCards(
      activeBoard.cards.map((c) => {
        if (c.id !== id) return c;
        const status: CardStatus = c.status === "done" ? "todo" : "done";
        return { ...c, status };
      })
    );
  }

  function handleAddStep() {
    if (!activeBoard) return;
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

  return (
    <div className="flow">
      <div className="surface">
        <div className="top">
          <div className="brand">
            <span className="m" /> Trailmark
          </div>
          <button className="btn" onClick={() => setModalBoard("new")}>
            + New board
          </button>
          {userEmail ? (
            <SessionMenu email={userEmail} />
          ) : (
            <button className="av" aria-label="Account" />
          )}
        </div>

        {activeBoard ? (
          <div className="cols">
            <BoardList
              boards={boards}
              activeId={activeBoard.id}
              onSelect={setActiveId}
              onNewBoard={() => setModalBoard("new")}
              onEditBoard={setModalBoard}
              onDeleteBoard={setDeleteTarget}
            />
            <TimelinePath
              title={activeBoard.name}
              cards={activeBoard.cards}
              onReorder={handleReorder}
              onToggleDone={handleToggleDone}
              onAddStep={handleAddStep}
            />
          </div>
        ) : (
          <div className="empty-state">
            <h2>Start your first board</h2>
            <p className="tag">
              A board is a learning path — create one, then add the steps you want to work through.
            </p>
            <button className="btn" onClick={() => setModalBoard("new")}>
              + New board
            </button>
          </div>
        )}
      </div>

      {modalBoard && (
        <BoardModal
          board={modalBoard === "new" ? undefined : modalBoard}
          onClose={() => setModalBoard(null)}
        />
      )}
      {deleteTarget && (
        <DeleteBoardModal
          board={deleteTarget}
          cardCount={
            boards.find((b) => b.id === deleteTarget.id)?.cards.length ?? 0
          }
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
