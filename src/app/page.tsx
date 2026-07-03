import KnowledgeBoardApp from "@/components/flow/KnowledgeBoardApp";
import { SAMPLE_BOARDS } from "@/lib/sample-data";

export default function Home() {
  // Scaffold: renders seed data. Replace with a Supabase query for the
  // signed-in user's boards once auth + DB are wired up (see src/lib/supabase).
  return <KnowledgeBoardApp initialBoards={SAMPLE_BOARDS} />;
}
