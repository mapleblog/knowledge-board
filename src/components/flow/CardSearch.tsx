"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import type { BoardWithCards, CardWithAttachments } from "@/lib/types";

type CardSearchProps = {
  boards: BoardWithCards[];
  onSelect: (boardId: string, card: CardWithAttachments) => void;
};

/** Which field a result matched on, for the snippet label. */
type MatchField = "title" | "description" | "url";

type SearchResult = {
  boardId: string;
  boardName: string;
  boardColor: string;
  card: CardWithAttachments;
  field: MatchField;
  /** The value of the matched field, windowed for display. */
  text: string;
};

/** Characters of context to show on either side of a match in a long field. */
const SNIPPET_RADIUS = 32;

/** Escape a user string so it can be used literally inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Window a long field around the first case-insensitive match so the snippet
 * stays short. Short fields (title, url) are returned whole.
 */
function windowText(text: string, query: string): string {
  if (text.length <= SNIPPET_RADIUS * 2) return text;
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return text.slice(0, SNIPPET_RADIUS * 2);
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + query.length + SNIPPET_RADIUS);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

/** Split text on the query and wrap the matches in <mark> for highlighting. */
function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : (
      part
    )
  );
}

/**
 * Client-side search over every card already loaded into the board view.
 * Matches title / description / url (case-insensitive substring); selecting a
 * result switches to that board and opens the card's detail modal.
 */
export default function CardSearch({ boards, onSelect }: CardSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const trimmed = query.trim();

  const results = useMemo<SearchResult[]>(() => {
    if (!trimmed) return [];
    const q = trimmed.toLowerCase();
    const out: SearchResult[] = [];
    for (const board of boards) {
      for (const card of board.cards) {
        const fields: [MatchField, string | null][] = [
          ["title", card.title],
          ["description", card.description],
          ["url", card.url],
        ];
        const hit = fields.find(([, value]) => value?.toLowerCase().includes(q));
        if (!hit) continue;
        const [field, value] = hit;
        out.push({
          boardId: board.id,
          boardName: board.name,
          boardColor: board.color,
          card,
          field,
          text: windowText(value ?? "", trimmed),
        });
      }
    }
    return out;
  }, [boards, trimmed]);

  // Results grouped by board, preserving board order and the flat index each
  // row occupies (for keyboard navigation across groups).
  const groups = useMemo(() => {
    const byBoard: { boardId: string; boardName: string; boardColor: string; rows: { result: SearchResult; index: number }[] }[] = [];
    results.forEach((result, index) => {
      let group = byBoard.find((g) => g.boardId === result.boardId);
      if (!group) {
        group = {
          boardId: result.boardId,
          boardName: result.boardName,
          boardColor: result.boardColor,
          rows: [],
        };
        byBoard.push(group);
      }
      group.rows.push({ result, index });
    });
    return byBoard;
  }, [results]);

  // Reset the highlighted row whenever the query changes (adjusting state
  // during render, per https://react.dev/learn/you-might-not-need-an-effect).
  const [prevTrimmed, setPrevTrimmed] = useState(trimmed);
  if (trimmed !== prevTrimmed) {
    setPrevTrimmed(trimmed);
    setActiveIndex(0);
  }

  // Global shortcut: "/" or Cmd/Ctrl+K focuses search (unless already typing).
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (cmdK || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function choose(result: SearchResult) {
    onSelect(result.boardId, result.card);
    close();
  }

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (trimmed) {
        setQuery("");
      } else {
        inputRef.current?.blur();
        setOpen(false);
      }
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const result = results[activeIndex];
      if (result) choose(result);
    }
  }

  const showPanel = open && trimmed.length > 0;

  return (
    <div
      className="card-search"
      ref={containerRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        className="card-search-input"
        placeholder="Search cards…"
        aria-label="Search cards"
        aria-expanded={showPanel}
        aria-controls={listId}
        autoComplete="off"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onInputKeyDown}
      />

      {showPanel && (
        <div className="card-search-panel" id={listId} role="listbox">
          {results.length === 0 ? (
            <p className="card-search-empty">No cards match “{trimmed}”</p>
          ) : (
            groups.map((group) => (
              <div key={group.boardId} className="card-search-group">
                <div className="card-search-group-head">
                  <span
                    className="card-search-dot"
                    style={{ background: group.boardColor }}
                  />
                  {group.boardName}
                </div>
                {group.rows.map(({ result, index }) => (
                  <button
                    key={result.card.id}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`card-search-row${index === activeIndex ? " on" : ""}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(result)}
                  >
                    <span className="card-search-title">
                      {highlight(result.card.title, trimmed)}
                    </span>
                    {result.field !== "title" && (
                      <span className="card-search-snippet">
                        {highlight(result.text, trimmed)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
