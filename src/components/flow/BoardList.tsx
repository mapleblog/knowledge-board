"use client";

import type { CSSProperties } from "react";
import type { Board, BoardWithCards } from "@/lib/types";
import { boardProgress } from "@/lib/board";

type BoardListProps = {
  boards: BoardWithCards[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewBoard: () => void;
  onEditBoard: (board: Board) => void;
  onDeleteBoard: (board: Board) => void;
};

/** Left column: the user's boards, each with an accent ring and progress bar. */
export default function BoardList({
  boards,
  activeId,
  onSelect,
  onNewBoard,
  onEditBoard,
  onDeleteBoard,
}: BoardListProps) {
  return (
    <div>
      <div className="subhead">Boards</div>
      <div className="board-list">
        <button className="new-board" onClick={onNewBoard}>
          + New board
        </button>

        {boards.map((board) => {
          const { done, total, pct, inProgressPct } = boardProgress(board.cards);
          return (
            <div
              key={board.id}
              className={`b-item${board.id === activeId ? " on" : ""}`}
              style={{ "--b-color": board.color } as CSSProperties}
            >
              <button type="button" className="b-item-main" onClick={() => onSelect(board.id)}>
                <span className="ring" style={{ background: board.color }}>
                  {board.name.charAt(0).toUpperCase()}
                </span>
                <div style={{ flex: 1 }}>
                  <h4>{board.name}</h4>
                  <p>
                    {done} of {total} done
                  </p>
                  <div className="progress">
                    {inProgressPct > 0 && (
                      <i
                        className="in-progress"
                        style={{ width: `${inProgressPct}%` }}
                      />
                    )}
                    <i style={{ width: `${pct}%`, background: board.color }} />
                  </div>
                </div>
              </button>
              <div className="b-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit ${board.name}`}
                  onClick={() => onEditBoard(board)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Delete ${board.name}`}
                  onClick={() => onDeleteBoard(board)}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
