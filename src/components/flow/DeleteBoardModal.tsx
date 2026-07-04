"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Board } from "@/lib/types";
import { deleteBoard } from "@/lib/board-actions";

type DeleteBoardModalProps = {
  board: Board;
  cardCount: number;
  onClose: () => void;
};

/** Confirmation dialog before permanently deleting a board (cascades to its cards/attachments). */
export default function DeleteBoardModal({ board, cardCount, onClose }: DeleteBoardModalProps) {
  const [state, formAction, pending] = useActionState(deleteBoard, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      onClose();
    }
    wasPending.current = pending;
  }, [pending, state, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Delete &ldquo;{board.name}&rdquo;?</h2>
        <p className="tag">
          This permanently deletes the board{cardCount > 0 ? ` and its ${cardCount} card${cardCount === 1 ? "" : "s"}` : ""}. This can&rsquo;t be undone.
        </p>
        <form action={formAction}>
          <input type="hidden" name="id" value={board.id} />
          {state?.error && <p className="auth-error">{state.error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={pending}>
              {pending ? "Deleting…" : "Delete board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
