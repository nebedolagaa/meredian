import "server-only";

/**
 * Convert an unknown error (Supabase/PostgREST error, thrown `Error`, etc.) into
 * a safe, user-facing message.
 *
 * Raw database/driver messages can leak schema details (table/column/constraint
 * names, RLS hints), so they are logged server-side and replaced with a generic
 * string. The sentinel "Not authenticated" is preserved so the UI can still
 * react to an expired/absent session.
 */
export function safeActionError(scope: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Not authenticated") return message;
  console.error(`[${scope}]`, error);
  return "Something went wrong. Please try again.";
}
