import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSharedBoard } from "@/lib/types";
import SharedBoardView from "@/components/flow/SharedBoardView";

// Shared boards must never be indexed — they're unlisted, link-only.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Shared board · Trailmark",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public, unauthenticated read-only board view. The only DB access is the
 * `get_shared_board` RPC (security-definer, token-matched, safe-fields-only);
 * table RLS stays owner-only. A missing/revoked/rotated token 404s with no
 * data leak or enumeration signal.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Guard the shape before touching the DB (a non-uuid would just error).
  if (!UUID_RE.test(token)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_board", {
    share_token: token,
  });
  if (error) notFound();

  const board = parseSharedBoard(data);
  if (!board) notFound();

  return <SharedBoardView board={board} />;
}
