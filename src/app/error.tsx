"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

/**
 * Route error boundary for the board view. Catches failures thrown while the
 * server component renders (e.g. the boards fetch in page.tsx) and offers a
 * retry instead of a broken/empty screen.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="surface">
      <div className="empty-state" role="alert">
          <h2>Something went wrong</h2>
          <p className="tag">
            We couldn’t load your boards. This is usually temporary — please try
            again.
          </p>
          <button className="btn" onClick={() => unstable_retry()}>
            Try again
          </button>
      </div>
    </div>
  );
}
