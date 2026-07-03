"use client";

import type { BoardWithCards } from "@/lib/types";
import { boardProgress } from "@/lib/board";

type BoardListProps = {
  boards: BoardWithCards[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewBoard: () => void;
};

/** Left column: the user's boards, each with an accent ring and progress bar. */
export default function BoardList({
  boards,
  activeId,
  onSelect,
  onNewBoard,
}: BoardListProps) {
  return (
    <div>
      <div className="subhead">Boards</div>
      <div className="board-list">
        {boards.map((board) => {
          const { done, total, pct } = boardProgress(board.cards);
          return (
            <button
              key={board.id}
              className={`b-item${board.id === activeId ? " on" : ""}`}
              onClick={() => onSelect(board.id)}
            >
              <span className="ring" style={{ background: board.color }}>
                {board.name.charAt(0).toUpperCase()}
              </span>
              <div style={{ flex: 1 }}>
                <h4>{board.name}</h4>
                <p>
                  {done} of {total} done
                </p>
                <div className="progress">
                  <i style={{ width: `${pct}%`, background: board.color }} />
                </div>
              </div>
            </button>
          );
        })}

        <button className="new-board" onClick={onNewBoard}>
          + New board
        </button>
      </div>
    </div>
  );
}
