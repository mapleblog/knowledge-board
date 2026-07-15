import LoginForm from "./LoginForm";

const ERROR_MESSAGES: Record<string, string> = {
  "confirmation-failed":
    "That confirmation link is invalid or has expired. Please sign up again or request a new link.",
  "sign-out-failed": "Something went wrong signing you out. Please try again.",
  "oauth-failed": "Google sign-in didn’t complete. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <div className="surface">
      <div className="auth-panel">
        <div className="brand">
          <span className="m" />
          Trailmark
        </div>
        <h1>Log in</h1>
        <p className="tag">Pick up where you left off.</p>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}

        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
