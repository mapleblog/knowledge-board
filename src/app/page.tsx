import KnowledgeBoardApp from "@/components/flow/KnowledgeBoardApp";
import {
  resolveBoardColor,
  resolveCardStatus,
  type BoardWithCards,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // proxy.ts already redirects unauthenticated requests to /login, so a
  // user is expected here.
  const supabase = await createClient();

  // These two are independent — the boards query authorizes through the
  // session cookie (RLS), not through the getUser() result — so run them
  // concurrently instead of paying two serial Supabase round-trips.
  const [
    {
      data: { user },
    },
    { data: boards, error },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("boards")
      .select("*, cards(*, attachments(*))")
      .order("created_at", { ascending: true })
      .order("order_index", { referencedTable: "cards", ascending: true }),
  ]);

  // A failed fetch must not look like "you have no boards" — throw so the
  // route's error boundary (error.tsx) shows a retry instead of the empty state.
  if (error) {
    throw new Error(`Failed to load boards: ${error.message}`);
  }

  // The DB stores color/status as text (checked by constraints); narrow them
  // to the domain unions here so the rest of the app gets real types.
  const initialBoards: BoardWithCards[] = (boards ?? []).map((board) => ({
    ...board,
    color: resolveBoardColor(board.color),
    cards: board.cards.map((card) => ({
      ...card,
      status: resolveCardStatus(card.status),
    })),
  }));

  return <KnowledgeBoardApp initialBoards={initialBoards} userEmail={user?.email} />;
}
