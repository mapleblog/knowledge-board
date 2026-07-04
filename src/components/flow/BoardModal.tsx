"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { BOARD_COLORS, type Board } from "@/lib/types";
import { createBoard, updateBoard } from "@/lib/board-actions";
import Modal from "./Modal";

type BoardModalProps = {
  /** Omit to create a new board; pass a board to edit it. */
  board?: Board;
  onClose: () => void;
};

/** Modal for creating or editing a board: name, optional description, accent color. */
export default function BoardModal({ board, onClose }: BoardModalProps) {
  const [state, formAction, pending] = useActionState(
    board ? updateBoard : createBoard,
    null
  );
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
      <h2 id={titleId}>{board ? "Edit board" : "New board"}</h2>
        <form action={formAction} className="auth-form">
          {board && <input type="hidden" name="id" value={board.id} />}
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              required
              maxLength={120}
              autoFocus
              defaultValue={board?.name}
            />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <textarea name="description" rows={3} defaultValue={board?.description ?? ""} />
          </label>
          <fieldset className="color-field">
            <legend>Accent color</legend>
            <div className="color-swatches">
              {BOARD_COLORS.map((color, i) => (
                <label key={color} className="swatch" style={{ background: color }}>
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    aria-label={`Accent color ${i + 1}`}
                    defaultChecked={board ? board.color === color : i === 0}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          {state?.error && <p className="auth-error">{state.error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={pending}>
              {pending ? "Saving…" : board ? "Save changes" : "Create board"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
