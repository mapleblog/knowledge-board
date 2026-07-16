import Link from "next/link";
import type { SharedBoard } from "@/lib/types";
import { isSafeHttpUrl, linkLabel, statusPill } from "@/lib/board";
import Markdown from "./Markdown";

/**
 * Read-only render of a shared board (the /share/[token] page). Purely
 * presentational — no server actions, no edit/drag/status/delete affordances,
 * and no attachments (the get_shared_board RPC never returns them). Server
 * component; Markdown is safe (no rehype-raw, javascript: links stripped).
 */
export default function SharedBoardView({ board }: { board: SharedBoard }) {
  return (
    <div className="surface share-page">
      <nav className="top">
        <div className="brand">
          <span className="m" /> Trailmark
        </div>
        <span className="tag">Shared board · read-only</span>
      </nav>

      <div className="path">
        <div className="path-head">
          <h2>{board.name}</h2>
          <span className="tag">— a learning path, top to bottom</span>
        </div>

        {board.description && <Markdown>{board.description}</Markdown>}

        {board.cards.length === 0 ? (
          <p className="path-empty">This path has no steps yet.</p>
        ) : (
          board.cards.map((card) => {
            const pill = statusPill(card.status);
            const stepClass =
              card.status === "done"
                ? " done"
                : card.status === "in_progress"
                  ? " in-progress"
                  : "";
            return (
              <div key={card.id} className={`step${stepClass}`}>
                <span className="node" aria-hidden="true" />
                <div className="card share-card">
                  <div className="r">
                    <h5>{card.title}</h5>
                  </div>
                  {card.description && <Markdown>{card.description}</Markdown>}
                  <div className="foot">
                    <span className={`mini status-${card.status.replace("_", "-")}`}>
                      {pill.label}
                    </span>
                    {card.url && isSafeHttpUrl(card.url) && (
                      <a
                        className="mini mini-action"
                        href={card.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {linkLabel(card.url)}
                      </a>
                    )}
                    {card.tags.map((tag) => (
                      <span className="mini share-tag" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <p className="share-footer">
          Read-only shared board · <Link href="/">Create your own on Trailmark</Link>
        </p>
      </div>
    </div>
  );
}
