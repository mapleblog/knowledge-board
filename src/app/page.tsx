import KnowledgeBoardApp from "@/components/flow/KnowledgeBoardApp";
import { SAMPLE_BOARDS } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // proxy.ts already redirects unauthenticated requests to /login, so a
  // user is expected here.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Scaffold: renders seed data. Replace with a Supabase query for the
  // signed-in user's boards once board/card CRUD is wired up (Phase 2/3).
  return (
    <KnowledgeBoardApp initialBoards={SAMPLE_BOARDS} userEmail={user?.email} />
  );
}
