"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders trusted-*source* / untrusted-*content* markdown (a card description).
 *
 * Security: react-markdown escapes raw HTML by default — we deliberately do NOT
 * add `rehype-raw`, so `<img onerror=…>` etc. render inert as text. Its default
 * `urlTransform` also strips dangerous link protocols (`javascript:`), so we
 * keep that default on too. The only override is forcing links to open safely
 * in a new tab (mirrors the existing `card.url` anchor). This matters more once
 * v2 shareable board links let non-owners view descriptions.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ node, ...props }) {
            // `node` is react-markdown's AST node — drop it so it isn't spread
            // onto the DOM element; force safe new-tab opening on the rest.
            void node;
            return <a {...props} target="_blank" rel="noreferrer noopener" />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
