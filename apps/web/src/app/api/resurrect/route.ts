import { fetchRepoSources, parseGithubUrl, RECIPES, recipeForPackage, resurrect } from "@revenant/engine";
import { allow, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface Body {
  repo?: string;
  recipeId?: string;
  version?: string | null;
  evidence?: string[];
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const gh = body.repo ? parseGithubUrl(body.repo) : null;
  // Accept a recipe id or the package it retires (moment, request, uuid).
  const recipe = typeof body.recipeId === "string" ? ((Object.hasOwn(RECIPES, body.recipeId) ? RECIPES[body.recipeId] : null) ?? recipeForPackage(body.recipeId) ?? undefined) : undefined;
  if (!gh || !recipe) {
    return Response.json({ curated: false, message: "No curated recipe yet for this package. Curated today: moment, request, uuid@3." }, { status: 400 });
  }
  if (!allow(clientIp(req), 10, 10 * 60_000)) {
    return Response.json({ message: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }
  try {
    const { files, truncated } = await fetchRepoSources(`${gh.owner}/${gh.repo}`, { token: process.env["GITHUB_TOKEN"] });
    if (!files.some((f) => f.path === "package.json")) return Response.json({ message: "package.json not found." }, { status: 404 });
    const r = resurrect({
      recipeId: recipe.id,
      files,
      fromVersion: body.version ?? null,
      evidence: (body.evidence ?? []).slice(0, 8).map((e) => String(e).slice(0, 300)),
    });
    if (truncated) r.notes.push("Only the first 60 source files (shallowest paths first) were scanned; deeper usages need a local run of `revenant resurrect`.");
    return Response.json(r);
  } catch {
    return Response.json({ message: "GitHub is rate-limiting or unreachable. Use the CLI locally: revenant resurrect scan.json <package> --from <dir>." }, { status: 502 });
  }
}
