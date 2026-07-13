"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  onClose: () => void;
  /** id of the heading that names the dialog (for aria-labelledby). */
  labelledBy: string;
  /** Extra class on the dialog box, for per-modal layout variants. */
  className?: string;
  children: ReactNode;
};

// Elements that can receive keyboard focus, excluding hidden form inputs and
// anything explicitly removed from the tab order.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog shell shared by every modal. Handles the concerns that are
 * easy to get wrong per-modal: a dialog role/label, Escape-to-close, a focus
 * trap so Tab can't leave the dialog, and restoring focus to the triggering
 * element on close. Render the dialog's own heading/body/actions as children.
 */
export default function Modal({ onClose, labelledBy, className, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without making it an effect dependency — the setup
  // (focus capture, listener) must run once on mount, not on every parent
  // re-render, or the cleanup would yank focus back to the trigger mid-edit.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the dialog unless a child already grabbed it (e.g. an
    // input with autoFocus). Focusing the container keeps the initial focus off
    // any destructive action button.
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        // Nothing to tab to — keep focus on the dialog itself.
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={className ? `modal ${className}` : "modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
