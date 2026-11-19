import type { Recipe } from "./types.js";

export interface SpecInput {
  recipe: Recipe;
  changedFiles: string[];
  addedFiles: string[];
  notes: string[];
  scannedFiles: number;
  fromVersion: string | null;
  evidence: string[];
}

/** Kiro spec in the same shape as /.kiro/specs: EARS requirements, mermaid design, traceable tasks. */
export function buildSpec(i: SpecInput) {
  const { recipe: r } = i;
  const slug = `migrate-${r.package}-to-${r.id.split("-to-")[1] ?? "replacement"}`;
  const pkg = r.package;
  const requirements = `# Requirements: ${r.title}

## Context

${i.evidence.length ? i.evidence.map((e) => `- ${e}`).join("\n") : `- \`${pkg}\` is flagged by Revenant as abandoned or unsupported.`}

Scope: ${i.scannedFiles} source files scanned, ${i.changedFiles.length} need changes.

## User stories

- As a maintainer, I want to stop depending on \`${pkg}\` so that I no longer ship an unmaintained dependency.
- As a reviewer, I want proof that behaviour is unchanged so that I can merge with confidence.

## Acceptance criteria (EARS)

- R1.1 WHEN the migration patch is applied THE SYSTEM SHALL contain no import or require of \`${pkg}\` in the ${i.changedFiles.length} migrated files.
- R1.2 WHEN \`package.json\` is read THE SYSTEM SHALL no longer list \`${pkg}\` as a dependency, unless unmigrated usage remains.
- R2.1 WHEN the differential property-based tests run THE SYSTEM SHALL show identical observable behaviour between \`${pkg}\` and ${r.replacement} for the covered operations over at least 100 generated inputs each.
- R2.2 IF a call site uses behaviour the recipe cannot express THEN THE SYSTEM SHALL leave a \`TODO(revenant)\` comment and list it in the migration notes instead of silently changing it.
- R3.1 WHERE the project's own test suite exists THE SYSTEM SHALL pass it unchanged after the migration.
`;
  const design = `# Design: ${r.title}

## Approach

Apply the curated \`${r.id}\` recipe: a deterministic source transform, a \`package.json\` edit${i.addedFiles.length ? `, and ${i.addedFiles.length} added file(s) (${i.addedFiles.join(", ")})` : ""}. Verification is differential: the old and new implementations run side by side under fast-check.

## Flow

\`\`\`mermaid
flowchart LR
  A[Scan: ${pkg}${i.fromVersion ? "@" + i.fromVersion : ""} flagged] --> B[Recipe ${r.id}]
  B --> C[Patch: ${i.changedFiles.length} files]
  B --> D[Differential PBT]
  C --> E{Tests green?}
  D --> E
  E -- yes --> F[Open PR]
  E -- no --> G[Review TODO notes]
\`\`\`

## Known limits

${r.limits.map((l) => `- ${l}`).join("\n")}

## Files changed

${i.changedFiles.map((f) => `- \`${f}\``).join("\n") || "- none detected"}
${i.addedFiles.map((f) => `- \`${f}\` (new)`).join("\n")}
`;
  const tasks = `# Tasks: ${r.title}

- [ ] 1. Apply the patch (\`git apply ${slug}.patch\`)
  - [ ] 1.1 Review every \`TODO(revenant)\` comment
  - [ ] 1.2 Install the replacement${r.package === "moment" ? " (\`dayjs\`)" : ""}
  - _Requirements: R1.1, R1.2, R2.2_
- [ ] 2. Run the differential property-based tests (\`${r.testFile.path}\`)
  - [ ] 2.1 Install test deps: \`${r.testFile.deps.join(" ")}\`
  - [ ] 2.2 Confirm at least 100 runs per property pass
  - _Requirements: R2.1_
- [ ] 3. Run the project's own test suite and fix any regression
  - _Requirements: R3.1_
${i.notes.length ? `- [ ] 4. Resolve migration notes\n${i.notes.map((n) => `  - [ ] ${n}`).join("\n")}\n  - _Requirements: R2.2_\n` : ""}`;
  return { slug, requirements, design, tasks };
}
