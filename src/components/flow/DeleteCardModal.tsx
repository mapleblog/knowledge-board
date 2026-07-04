"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import type { Card } from "@/lib/types";
import { deleteCard } from "@/lib/card-actions";
import Modal from "./Modal";

type DeleteCardModalProps = {
  card: Card;
  onClose: () => void;
};

/** Confirmation dialog before permanently deleting a card. */
export default function DeleteCardModal({ card, onClose }: DeleteCardModalProps) {
  const [state, formAction, pending] = useActionState(deleteCard, null);
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
      <h2 id={titleId}>Delete &ldquo;{card.title}&rdquo;?</h2>
        <p className="tag">This permanently deletes the step. This can&rsquo;t be undone.</p>
        <form action={formAction}>
          <input type="hidden" name="id" value={card.id} />
          {state?.error && <p className="auth-error">{state.error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={pending}>
              {pending ? "Deleting…" : "Delete step"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
