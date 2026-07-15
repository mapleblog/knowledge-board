"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import type { Card } from "@/lib/types";
import { createCard, updateCard } from "@/lib/card-actions";
import Modal from "./Modal";

type CardModalProps = {
  boardId: string;
  /** Omit to create a new card; pass a card to edit it. */
  card?: Card;
  onClose: () => void;
};

/** Modal for creating or editing a card: title, optional description, optional URL. */
export default function CardModal({ boardId, card, onClose }: CardModalProps) {
  const [state, formAction, pending] = useActionState(
    card ? updateCard : createCard,
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
      <h2 id={titleId}>{card ? "Edit step" : "New step"}</h2>
        <form action={formAction} className="auth-form">
          {card ? (
            <input type="hidden" name="id" value={card.id} />
          ) : (
            <input type="hidden" name="board_id" value={boardId} />
          )}
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              name="title"
              required
              maxLength={200}
              autoFocus
              defaultValue={card?.title}
            />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <textarea name="description" rows={4} defaultValue={card?.description ?? ""} />
            <span className="field-hint">Markdown supported</span>
          </label>
          <label className="field">
            <span>URL (optional)</span>
            <input type="url" name="url" placeholder="https://…" defaultValue={card?.url ?? ""} />
          </label>

          {state?.error && <p className="auth-error">{state.error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={pending}>
              {pending ? "Saving…" : card ? "Save changes" : "Add step"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
