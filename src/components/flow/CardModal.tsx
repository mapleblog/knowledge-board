"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  MAX_TAGS_PER_CARD,
  normalizeTags,
  parseTags,
  type Card,
} from "@/lib/types";
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
  const tagsId = useId();
  const [tags, setTags] = useState<string[]>(card?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const atTagLimit = tags.length >= MAX_TAGS_PER_CARD;

  function commitDraft() {
    const merged = normalizeTags([...tags, ...parseTags(tagDraft)]);
    setTags(merged);
    setTagDraft("");
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      // Enter would submit the form; comma is our separator — handle both here.
      e.preventDefault();
      if (tagDraft.trim()) commitDraft();
    } else if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

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

          <div className="field">
            <span id={tagsId}>Tags (optional)</span>
            {/* The tag list is managed in state; this hidden field is what the
                server action reads (re-normalized authoritatively there). */}
            <input type="hidden" name="tags" value={tags.join(",")} />
            <div className="tag-input">
              {tags.map((tag) => (
                <span className="tag-chip" key={tag}>
                  {tag}
                  <button
                    type="button"
                    className="tag-chip-x"
                    aria-label={`Remove tag ${tag}`}
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                  >
                    ✕
                  </button>
                </span>
              ))}
              {!atTagLimit && (
                <input
                  type="text"
                  className="tag-draft"
                  aria-labelledby={tagsId}
                  placeholder={tags.length ? "Add tag…" : "e.g. react, basics"}
                  value={tagDraft}
                  maxLength={30}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={onTagKeyDown}
                  onBlur={() => tagDraft.trim() && commitDraft()}
                />
              )}
            </div>
            <span className="field-hint">
              {atTagLimit
                ? `Tag limit reached (${MAX_TAGS_PER_CARD})`
                : "Press Enter or comma to add · click a tag on a card to filter"}
            </span>
          </div>

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
