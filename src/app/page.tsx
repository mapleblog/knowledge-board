import KnowledgeBoardApp from "@/components/flow/KnowledgeBoardApp";
import type { BoardWithCards } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // proxy.ts already redirects unauthenticated requests to /login, so a
  // user is expected here.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: boards } = await supabase
    .from("boards")
    .select("*, cards(*, attachments(*))")
    .order("created_at", { ascending: true })
    .order("order_index", { referencedTable: "cards", ascending: true });

  return (
    <KnowledgeBoardApp
      initialBoards={(boards as BoardWithCards[]) ?? []}
      userEmail={user?.email}
    />
  );
}
