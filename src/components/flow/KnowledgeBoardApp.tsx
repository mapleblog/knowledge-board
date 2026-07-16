"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type {
  Board,
  BoardWithCards,
  CardStatus,
  CardWithAttachments,
} from "@/lib/types";
import { reorderIndex } from "@/lib/board";
import { moveCard, reorderCard, updateCardStatus } from "@/lib/card-actions";
import BoardList from "./BoardList";
import TimelinePath from "./TimelinePath";
import BoardModal from "./BoardModal";
import DeleteBoardModal from "./DeleteBoardModal";
import CardModal from "./CardModal";
import CardDetailModal from "./CardDetailModal";
import DeleteCardModal from "./DeleteCardModal";
import CardSearch from "./CardSearch";
import SessionMenu from "@/components/auth/SessionMenu";

/** How long to wait after the last drag move before writing the new order_index. */
const REORDER_DEBOUNCE_MS = 300;

/** Clicking a timeline node advances the card: next up → in progress → done → next up. */
const STATUS_CYCLE: Record<CardStatus, CardStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

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
  const [cardModal, setCardModal] = useState<CardWithAttachments | "new" | null>(null);
  const [cardDetail, setCardDetail] = useState<CardWithAttachments | null>(null);
  const [cardDeleteTarget, setCardDeleteTarget] = useState<CardWithAttachments | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Error from a background write (reorder / status toggle) — those have no
  // form to report into, so they surface here as a dismissible banner.
  const [saveError, setSaveError] = useState<string | null>(null);
  // Debounced order_index writes, keyed per card so dragging one card never
  // cancels another card's still-pending write.
  const pendingReorders = useRef(
    new Map<string, { timeout: ReturnType<typeof setTimeout>; orderIndex: number }>()
  );

  // Flush any still-debounced reorder writes if the component unmounts.
  useEffect(() => {
    const pending = pendingReorders.current;
    return () => {
      for (const [id, entry] of pending) {
        clearTimeout(entry.timeout);
        reorderCard(id, entry.orderIndex);
      }
      pending.clear();
    };
  }, []);

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

  function updateActiveCards(next: CardWithAttachments[]) {
    if (!activeBoard) return;
    setBoards((prev) =>
      prev.map((b) => (b.id === activeBoard.id ? { ...b, cards: next } : b))
    );
  }

  function handleReorder(next: CardWithAttachments[], movedId: string, movedIndex: number) {
    const orderIndex = reorderIndex(next, movedIndex);
    updateActiveCards(
      next.map((c) => (c.id === movedId ? { ...c, order_index: orderIndex } : c))
    );

    const existing = pendingReorders.current.get(movedId);
    if (existing) clearTimeout(existing.timeout);
    const timeout = setTimeout(() => {
      pendingReorders.current.delete(movedId);
      startTransition(async () => {
        const result = await reorderCard(movedId, orderIndex);
        setSaveError(result?.error ?? null);
      });
    }, REORDER_DEBOUNCE_MS);
    pendingReorders.current.set(movedId, { timeout, orderIndex });
  }

  function handleMoveCard(card: CardWithAttachments, destBoardId: string) {
    if (destBoardId === card.board_id) return;
    // Optimistic: drop the card from its source board and append it to the
    // destination (its new order_index = that board's current max + 1, mirroring
    // the server action). A failed write revalidates and snaps this back.
    setBoards((prev) =>
      prev.map((b) => {
        if (b.id === card.board_id) {
          return { ...b, cards: b.cards.filter((c) => c.id !== card.id) };
        }
        if (b.id === destBoardId) {
          const maxOrder = b.cards.reduce((m, c) => Math.max(m, c.order_index), 0);
          const moved = { ...card, board_id: destBoardId, order_index: maxOrder + 1 };
          return { ...b, cards: [...b.cards, moved] };
        }
        return b;
      })
    );
    setCardDetail(null);
    startTransition(async () => {
      const result = await moveCard(card.id, destBoardId);
      setSaveError(result?.error ?? null);
    });
  }

  function handleCycleStatus(id: string) {
    if (!activeBoard) return;
    let nextStatus: CardStatus = "todo";
    updateActiveCards(
      activeBoard.cards.map((c) => {
        if (c.id !== id) return c;
        nextStatus = STATUS_CYCLE[c.status];
        return { ...c, status: nextStatus };
      })
    );
    startTransition(async () => {
      const result = await updateCardStatus(id, nextStatus);
      setSaveError(result?.error ?? null);
    });
  }

  return (
    <div className="surface">
      <nav className="top">
          <div className="brand">
            <span className="m" /> Trailmark
          </div>
          <button
            type="button"
            className="nav-toggle"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={menuOpen ? "top-actions open" : "top-actions"}>
            <CardSearch
              boards={boards}
              onSelect={(boardId, card) => {
                setActiveId(boardId);
                setCardDetail(card);
                setMenuOpen(false);
              }}
            />
            {userEmail ? (
              <SessionMenu email={userEmail} />
            ) : (
              <button className="av" aria-label="Account" />
            )}
          </div>
        </nav>

        {saveError && (
          <div className="save-error" role="alert">
            <span>{saveError}</span>
            <button
              type="button"
              className="icon-btn"
              aria-label="Dismiss error"
              onClick={() => setSaveError(null)}
            >
              ✕
            </button>
          </div>
        )}

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
              onCycleStatus={handleCycleStatus}
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
          moveTargets={boards
            .filter((b) => b.id !== cardDetail.board_id)
            .map((b) => ({ id: b.id, name: b.name }))}
          onClose={() => setCardDetail(null)}
          onEdit={() => {
            setCardModal(cardDetail);
            setCardDetail(null);
          }}
          onDelete={() => {
            setCardDeleteTarget(cardDetail);
            setCardDetail(null);
          }}
          onMove={(destBoardId) => handleMoveCard(cardDetail, destBoardId)}
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
