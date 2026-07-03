"use client";

import type { Card } from "@/lib/types";
import { deleteCard } from "@/lib/card-actions";

type DeleteCardModalProps = {
  card: Card;
  onClose: () => void;
};

/** Confirmation dialog before permanently deleting a card. */
export default function DeleteCardModal({ card, onClose }: DeleteCardModalProps) {
  async function handleDelete(formData: FormData) {
    await deleteCard(formData);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Delete &ldquo;{card.title}&rdquo;?</h2>
        <p className="tag">This permanently deletes the step. This can&rsquo;t be undone.</p>
        <form action={handleDelete}>
          <input type="hidden" name="id" value={card.id} />
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger">
              Delete step
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
