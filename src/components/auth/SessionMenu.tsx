import { signOut } from "@/lib/auth-actions";

export default function SessionMenu({ email }: { email: string }) {
  return (
    <form action={signOut} className="session-menu">
      <span className="session-email">{email}</span>
      <button type="submit" className="btn ghost">
        Log out
      </button>
    </form>
  );
}
