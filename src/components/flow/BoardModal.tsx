"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
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

  // Track name + color so the left rail previews the board as it's built.
  const [name, setName] = useState(board?.name ?? "");
  const [color, setColor] = useState(board?.color ?? BOARD_COLORS[0]);
  const trimmed = name.trim();
  const initial = trimmed.charAt(0).toUpperCase();

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      onClose();
    }
    wasPending.current = pending;
  }, [pending, state, onClose]);

  return (
    <Modal onClose={onClose} labelledBy={titleId} className="board-modal-split">
      <aside className="split-rail" style={{ "--rail": color } as CSSProperties}>
        <span className="rail-ring">{initial}</span>
        <span className={`rail-name${trimmed ? "" : " is-placeholder"}`}>
          {trimmed || "Your board"}
        </span>
      </aside>
      <div className="split-body">
        <h2 id={titleId}>{board ? "Edit board" : "New board"}</h2>
        <form action={formAction} className="auth-form board-form">
          {board && <input type="hidden" name="id" value={board.id} />}
          <label className="field">
            <input
              type="text"
              name="name"
              required
              maxLength={120}
              autoFocus
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span>Name</span>
          </label>
          <label className="field">
            <textarea
              name="description"
              rows={3}
              placeholder=" "
              defaultValue={board?.description ?? ""}
            />
            <span>Description (optional)</span>
          </label>
          <fieldset className="color-field">
            <legend>Accent color</legend>
            <div className="color-swatches">
              {BOARD_COLORS.map((c, i) => (
                <label key={c} className="swatch" style={{ background: c }}>
                  <input
                    type="radio"
                    name="color"
                    value={c}
                    aria-label={`Accent color ${i + 1}`}
                    checked={color === c}
                    onChange={() => setColor(c)}
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
      </div>
    </Modal>
  );
}
