const NETWORK = "Could not reach the server. Check your connection and try again.";

/** Ends a sentence with a full stop unless it already has terminal punctuation. */
export const withStop = (s: string): string => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** Plain-language text for a failed request. Browser strings such as "Failed to fetch" never reach the user. */
export function friendlyError(e: unknown): string {
  if (e instanceof TypeError) return NETWORK;
  if (e instanceof Error && e.message.trim()) return /^(failed to fetch|load failed|networkerror)/i.test(e.message.trim()) ? NETWORK : withStop(e.message);
  return "Could not resurrect.";
}
