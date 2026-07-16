"use client";

import { useId, useState } from "react";
import type { Board } from "@/lib/types";
import { revokeShareLink, setShareToken } from "@/lib/board-actions";
import Modal from "./Modal";

/**
 * Owner-side share management for a board: create / copy / rotate / revoke the
 * public read-only link. The link points at /share/<token>; rotating assigns a
 * new token so any previously shared URL stops working.
 */
export default function ShareBoardModal({
  board,
  onClose,
}: {
  board: Board;
  onClose: () => void;
}) {
  const titleId = useId();
  const [token, setToken] = useState<string | null>(board.share_token);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/share/${token}`
      : "";

  async function create() {
    setPending(true);
    setError(null);
    const res = await setShareToken(board.id);
    if (res?.error) setError(res.error);
    else if (res?.token) setToken(res.token);
    setPending(false);
  }

  async function revoke() {
    setPending(true);
    setError(null);
    const res = await revokeShareLink(board.id);
    if (res?.error) setError(res.error);
    else setToken(null);
    setPending(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy — select the link and copy it manually.");
    }
  }

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId}>Share “{board.name}”</h2>

      {token ? (
        <>
          <p className="tag">
            Anyone with this link can view this board read-only — no sign-in
            needed. Attachments are not shared.
          </p>
          <div className="share-row">
            <input
              className="share-url"
              readOnly
              value={shareUrl}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="btn" onClick={copy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div className="modal-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={revoke}
              disabled={pending}
            >
              Stop sharing
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={create}
              disabled={pending}
              title="Assign a new link and invalidate the current one"
            >
              {pending ? "…" : "Rotate link"}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="tag">
            This board is private. Create a link to let anyone view it read-only
            (no sign-in needed). Attachments are not shared, and you can revoke
            the link anytime.
          </p>
          {error && <p className="auth-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              onClick={create}
              disabled={pending}
            >
              {pending ? "Creating…" : "Create share link"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
