import { findResurrectionPr, RECIPES, SANDBOX_REPO } from "@revenant/engine";
import { allow, clientIp } from "@/lib/rateLimit";
import { parsePrTotals, type PrTotals } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only lookup of the open Gravekeeper PR on the sandbox repo for one recipe.
 * There is deliberately no write handler: PRs are opened by a local `revenant gravekeeper` run,
 * so this deployment only ever holds the read token it uses for scans.
 */
export async function GET(req: Request) {
  const recipeId = new URL(req.url).searchParams.get("recipe") ?? "";
  if (!Object.hasOwn(RECIPES, recipeId)) return Response.json({ message: "Unknown recipe." }, { status: 400 });
  if (!allow(`gk:${clientIp(req)}`, 30, 10 * 60_000)) return Response.json({ message: "Too many lookups. Try again in a few minutes." }, { status: 429 });
  try {
    const pr = await findResurrectionPr(recipeId, { token: process.env["GITHUB_TOKEN"] });
    // The pull request's own totals (spec and tests included), read from GitHub. Omitted when unavailable, never estimated.
    let totals: PrTotals | null = null;
    if (pr) {
      const token = process.env["GITHUB_TOKEN"];
      const res = await fetch(`https://api.github.com/repos/${SANDBOX_REPO}/pulls/${pr.number}`, {
        headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      totals = res?.ok ? parsePrTotals(await res.json().catch(() => null)) : null;
    }
    return Response.json({ pr, totals }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ message: "GitHub is unreachable right now." }, { status: 502 });
  }
}
