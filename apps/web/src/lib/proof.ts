import verification from "@/data/crypt-verification.json";

export interface SandboxProof {
  suitePass: number;
  suiteTotal: number;
  suiteOk: boolean;
  diffPassed: number | null;
  date: string;
  baseSha: string;
}

type Recipes = Record<string, { npmTest?: { ok?: boolean; summary?: string }; differential?: { ok?: boolean; output?: string } } | undefined>;

/** What the recorded sandbox run (scripts/verify-crypt.mts) says about one recipe. Read, never invented. */
export function sandboxProof(recipeId: string): SandboxProof | null {
  const r = (verification.recipes as Recipes)[recipeId];
  if (!r?.npmTest) return null;
  const sum = r.npmTest.summary ?? "";
  const total = Number(/ℹ tests (\d+)/.exec(sum)?.[1] ?? NaN);
  const pass = Number(/ℹ pass (\d+)/.exec(sum)?.[1] ?? NaN);
  if (!Number.isFinite(total) || !Number.isFinite(pass)) return null;
  const diff = Number(/Tests\s+(\d+) passed/.exec(r.differential?.output ?? "")?.[1] ?? NaN);
  return {
    suitePass: pass,
    suiteTotal: total,
    suiteOk: r.npmTest.ok === true && pass === total,
    diffPassed: r.differential?.ok === true && Number.isFinite(diff) ? diff : null,
    date: String(verification.generatedAt).slice(0, 10),
    baseSha: String(verification.baseSha).slice(0, 7),
  };
}
