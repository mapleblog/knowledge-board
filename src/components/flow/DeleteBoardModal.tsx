"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import type { Board } from "@/lib/types";
import { deleteBoard } from "@/lib/board-actions";
import Modal from "./Modal";

type DeleteBoardModalProps = {
  board: Board;
  cardCount: number;
  onClose: () => void;
};

/** Confirmation dialog before permanently deleting a board (cascades to its cards/attachments). */
export default function DeleteBoardModal({ board, cardCount, onClose }: DeleteBoardModalProps) {
  const [state, formAction, pending] = useActionState(deleteBoard, null);
  const wasPending = useRef(false);
  const titleId = useId();

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      onClose();
    }
    wasPending.current = pending;
  }, [pending, state, onClose]);

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId}>Delete &ldquo;{board.name}&rdquo;?</h2>
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
    </Modal>
  );
}
