"use client";

import { startTransition, useMemo, useRef, useState } from "react";
import type { Attachment, Board, BoardWithCards, Card, CardStatus } from "@/lib/types";
import { reorderIndex } from "@/lib/board";
import { reorderCard, updateCardStatus } from "@/lib/card-actions";
import BoardList from "./BoardList";
import TimelinePath from "./TimelinePath";
import BoardModal from "./BoardModal";
import DeleteBoardModal from "./DeleteBoardModal";
import CardModal from "./CardModal";
import CardDetailModal from "./CardDetailModal";
import DeleteCardModal from "./DeleteCardModal";
import SessionMenu from "@/components/auth/SessionMenu";

type PathCard = Card & { attachments: Attachment[] };

/** How long to wait after the last drag move before writing the new order_index. */
const REORDER_DEBOUNCE_MS = 300;

/**
 * Top-level client shell for the Flow board view. Board and card mutations
 * are persisted via Server Actions (src/lib/board-actions.ts, src/lib/card-actions.ts).
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
  const [cardModal, setCardModal] = useState<PathCard | "new" | null>(null);
  const [cardDetail, setCardDetail] = useState<PathCard | null>(null);
  const [cardDeleteTarget, setCardDeleteTarget] = useState<PathCard | null>(null);
  const reorderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync when the server refetches boards after a create/edit/delete
  // (adjusting state during render, per https://react.dev/learn/you-might-not-need-an-effect).
  const [prevInitialBoards, setPrevInitialBoards] = useState(initialBoards);
  if (initialBoards !== prevInitialBoards) {
    setPrevInitialBoards(initialBoards);
    setBoards(initialBoards);
    setActiveId((prev) =>
      initialBoards.some((b) => b.id === prev) ? prev : initialBoards[0]?.id ?? ""
    );
    setCardDetail((prev) =>
      prev
        ? initialBoards.flatMap((b) => b.cards).find((c) => c.id === prev.id) ?? null
        : prev
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

  function handleReorder(next: PathCard[], movedId: string, movedIndex: number) {
    const orderIndex = reorderIndex(next, movedIndex);
    updateActiveCards(
      next.map((c) => (c.id === movedId ? { ...c, order_index: orderIndex } : c))
    );

    if (reorderTimeout.current) clearTimeout(reorderTimeout.current);
    reorderTimeout.current = setTimeout(() => {
      startTransition(() => {
        reorderCard(movedId, orderIndex);
      });
    }, REORDER_DEBOUNCE_MS);
  }

  function handleToggleDone(id: string) {
    if (!activeBoard) return;
    let nextStatus: CardStatus = "todo";
    updateActiveCards(
      activeBoard.cards.map((c) => {
        if (c.id !== id) return c;
        nextStatus = c.status === "done" ? "todo" : "done";
        return { ...c, status: nextStatus };
      })
    );
    startTransition(() => {
      updateCardStatus(id, nextStatus);
    });
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
              boardId={activeBoard.id}
              title={activeBoard.name}
              cards={activeBoard.cards}
              onReorder={handleReorder}
              onToggleDone={handleToggleDone}
              onAddStep={() => setCardModal("new")}
              onOpenDetail={setCardDetail}
              onEditCard={setCardModal}
              onDeleteCard={setCardDeleteTarget}
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
      {cardModal && activeBoard && (
        <CardModal
          boardId={activeBoard.id}
          card={cardModal === "new" ? undefined : cardModal}
          onClose={() => setCardModal(null)}
        />
      )}
      {cardDetail && (
        <CardDetailModal
          card={cardDetail}
          onClose={() => setCardDetail(null)}
          onEdit={() => {
            setCardModal(cardDetail);
            setCardDetail(null);
          }}
          onDelete={() => {
            setCardDeleteTarget(cardDetail);
            setCardDetail(null);
          }}
        />
      )}
      {cardDeleteTarget && (
        <DeleteCardModal
          card={cardDeleteTarget}
          onClose={() => setCardDeleteTarget(null)}
        />
      )}
    </div>
  );
}
