"use client";

import type { Board } from "@/lib/types";
import { deleteBoard } from "@/lib/board-actions";

type DeleteBoardModalProps = {
  board: Board;
  cardCount: number;
  onClose: () => void;
};

/** Confirmation dialog before permanently deleting a board (cascades to its cards/attachments). */
export default function DeleteBoardModal({ board, cardCount, onClose }: DeleteBoardModalProps) {
  async function handleDelete(formData: FormData) {
    await deleteBoard(formData);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Delete &ldquo;{board.name}&rdquo;?</h2>
        <p className="tag">
          This permanently deletes the board{cardCount > 0 ? ` and its ${cardCount} card${cardCount === 1 ? "" : "s"}` : ""}. This can&rsquo;t be undone.
        </p>
        <form action={handleDelete}>
          <input type="hidden" name="id" value={board.id} />
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger">
              Delete board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
