// Builds REPORT.md purely from data.json. Run: node report.mjs
import fs from 'node:fs';
const D = JSON.parse(fs.readFileSync(new URL('data.json', import.meta.url)));
const P = D.perPackage, C = D.classifications;
const pct = (a, b) => (100 * a / b).toFixed(1) + '%';
const withDeps = P.filter(p => p.directDeps > 0);
const hasDead = P.filter(p => p.deadDeps.length), hasDying = P.filter(p => p.dyingDeps.length), hasEither = P.filter(p => p.deadDeps.length || p.dyingDeps.length);
const allDeps = new Set(P.flatMap(p => [...p.deadDeps, ...p.dyingDeps]));
const depNames = Object.keys(C).filter(n => P.some(p => 0) || true);
const uniqDeps = new Set(); // unique direct deps of the sample
// reconstruct unique deps count from usage: need per-package deps; use classifications minus sample names that are not deps -> store in data? compute from deadUsedBy only partially
const sampleSet = new Set(P.map(p => p.name));
const dead = Object.keys(D.deadUsedBy).map(n => ({n, users: D.deadUsedBy[n], c: C[n]})).sort((a, b) => b.users.length - a.users.length || a.n.localeCompare(b.n));
const why = c => c.deadReasons.map(r => r.rule).join('+');
const cnt = {}; for (const c of Object.values(C)) cnt[c.class] = (cnt[c.class] || 0) + 1;
const ruleCnt = {}; for (const n of Object.keys(D.deadUsedBy)) for (const r of C[n].deadReasons) ruleCnt[r.rule] = (ruleCnt[r.rule] || 0) + 1;
const deadSelf = P.filter(p => p.selfClass === 'dead');
const trunc = (s, n = 140) => String(s).length > n ? String(s).slice(0, n) + '...' : String(s);
const repoUrl = id => id ? 'https://' + id : null;
let m = `# Revenant ecosystem study: dead dependencies in the most-depended-on npm packages

Generated ${D.generatedAt} by \`study.mjs\` + \`report.mjs\`. Every number below is computed from \`data.json\`, which holds the raw per-package fields from public APIs.

## Headline

**${pct(hasDead.length, P.length)} (${hasDead.length} of ${P.length}) of the ${P.length} most-depended-on npm packages declare at least one *dead* direct dependency in their latest release** (${pct(hasDead.length, withDeps.length)} of the ${withDeps.length} that have any direct dependencies). Counting *dying* dependencies too, it is ${pct(hasEither.length, P.length)} (${hasEither.length} of ${P.length}).

- Unique dead packages used directly by the sample: ${Object.keys(D.deadUsedBy).length}
- Sample packages that are themselves dead by our definition: ${deadSelf.length} (${deadSelf.map(p => p.name).join(', ') || 'none'})

## Method

1. **Sample**: the first ${D.N} entries of \`npmTopDependents\` from [npm-high-impact](https://github.com/wooorm/npm-high-impact) v1.13.0 (npm package published 2026-06-08), which ranks packages by number of dependent packages on the npm registry. The exact list is committed as \`top-dependent.snapshot.js\`. Note the list ordering is by dependents, includes \`@types/*\` packages, and the dependent counts date from that package release, not from today.
2. **Direct dependencies**: for each sample package, the \`dependencies\` object (runtime only; not dev/peer/optional) of the \`dist-tags.latest\` version from the npm registry (abbreviated packument).
3. **Classification** of every sample package and every direct dependency, at its latest version, using only public APIs:
   - npm registry: \`versions[latest].deprecated\`
   - deps.dev v3 GetVersion: \`publishedAt\`, \`advisoryKeys\`, source repo (\`relatedProjects\` of type SOURCE_REPO)
   - GitHub REST \`/repos/{owner}/{repo}\`: \`archived\`, HTTP 404
   - OSV \`/v1/querybatch\` on \`{npm name, latest version}\`: known vulnerability ids
   - OpenSSF Scorecard API (api.securityscorecards.dev): \`Maintained\` check score
4. Responses are cached under \`.cache/\`; the script is deterministic given the cache. "Age" is measured against the generation timestamp above.

## Definitions

**Dead** if ANY of:
- \`deprecated\`: the latest npm version has a non-empty \`deprecated\` message.
- \`repo_archived\`: the source repo on GitHub has \`archived: true\`.
- \`repo_gone\`: the source repo URL returns HTTP 404 from GitHub.
- \`stale_and_vulnerable\`: latest version published at least ${D.defs.deadYears} years ago AND OSV lists at least one vulnerability for that version.

**Dying** (not dead, but) if ANY of: latest version published at least ${D.defs.dyingYears} years ago; or OpenSSF Scorecard \`Maintained\` = 0 and latest publish at least 1 year ago.

**Alive**: everything else. Packages with no resolvable version info are excluded from counts of classes.

Caveats: we evaluate each dependency's *latest* version, not the version a range resolves to or the one in a lockfile. Transitive dependencies are not analysed. A deprecation notice can point to a maintained successor; "dead" here means "its maintainers say stop using it or it is archived/abandoned-and-vulnerable", not "unusable". Packages with no GitHub repo link get no archived/Scorecard signal.

## Numbers

| Metric | Value |
|---|---|
| Sample size | ${P.length} |
| Sample packages with >=1 direct dep | ${withDeps.length} |
| With >=1 dead direct dep | ${hasDead.length} (${pct(hasDead.length, P.length)}) |
| With >=1 dying direct dep | ${hasDying.length} (${pct(hasDying.length, P.length)}) |
| With dead or dying | ${hasEither.length} (${pct(hasEither.length, P.length)}) |
| Unique packages classified (sample + their direct deps) | ${Object.keys(C).length} |
| ...of which dead / dying / alive | ${cnt.dead || 0} / ${cnt.dying || 0} / ${cnt.alive || 0} |
| Dead deps used by the sample, by rule (a dep may match several) | ${Object.entries(ruleCnt).map(([k, v]) => k + ' ' + v).join(', ')} |

## Sensitivity (how much the headline depends on the definition)

${(()=>{const strict=c=>c&&c.deadReasons.some(r=>r.rule==='deprecated'||r.rule==='stale_and_vulnerable');const pk=P.filter(p=>p.deadDeps.some(d=>strict(C[d])));const rec=c=>c&&c.deadReasons.length&&c.ageYears!==null&&c.ageYears>=1&&!c.deadReasons.some(r=>r.rule==='deprecated'||r.rule==='stale_and_vulnerable');const arch=Object.keys(D.deadUsedBy).filter(n=>C[n].deadReasons.every(r=>r.rule==='repo_archived'||r.rule==='repo_gone'));return `- Strict definition (only \`deprecated\` or \`stale_and_vulnerable\`, ignoring repo archived/gone): **${pct(pk.length,P.length)} (${pk.length} of ${P.length})** have at least one dead direct dependency.\n- ${arch.length} of the ${Object.keys(D.deadUsedBy).length} dead packages qualify only through an archived or missing GitHub repo (no npm deprecation, no known vuln). Some were published recently (e.g. latest publish within the last year), so "archived" means maintainers froze the repo, which may not mean the code is unusable. \`repo_gone\` (HTTP 404) can also mean a rename, transfer or private repo.`})()}

## Top 25 most-depended-on dead packages (within the sample)

"Used by" counts sample packages that list it as a direct runtime dependency.

| # | Package | Used by | Why dead (rule: source field) | Last publish | Repo |
|---|---|---|---|---|---|
`;
dead.slice(0, 25).forEach((d, i) => {
  const c = d.c; const why = c.deadReasons.map(r => `${r.rule}: ${trunc(r.value, 90).replace(/\|/g, '/')}`).join('; ');
  m += `| ${i + 1} | \`${d.n}@${c.latest}\` | ${d.users.length} | ${why} | ${c.publishedAt?.slice(0, 10) || '?'} | ${c.sourceRepo || '-'} |\n`;
});
m += `\nFields: rule \`deprecated\` = npm \`versions[latest].deprecated\`; \`repo_archived\` = GitHub \`archived\`; \`stale_and_vulnerable\` = deps.dev \`publishedAt\` + OSV ids.\n\n## Cause-of-death stories\n\nPicked mechanically: the most-used dead package for each distinct cause, in order, so nothing is hand-selected for drama.\n\n`;
const used = new Set(), stories = [];
const pick = (label, f) => { const d = dead.find(x => !used.has(x.n) && f(x.c)); if (d) { used.add(d.n); stories.push([label, d]); } };
pick('Deprecated by its maintainers', c => c.deadReasons.some(r => r.rule === 'deprecated') && !c.deadReasons.some(r => r.rule === 'repo_archived'));
pick('Archived repo, never formally deprecated', c => c.deadReasons.length && c.deadReasons.every(r => r.rule === 'repo_archived'));
pick('Deprecated AND archived', c => c.deadReasons.some(r => r.rule === 'deprecated') && c.deadReasons.some(r => r.rule === 'repo_archived'));
pick('Stale and carrying known vulnerabilities', c => c.deadReasons.some(r => r.rule === 'stale_and_vulnerable'));
pick('Next most-used dead package', () => true);
pick('Next most-used dead package', () => true);
for (const [label, d] of stories.slice(0, 5)) {
  const c = d.c;
  m += `### \`${d.n}\`: ${label}\n- Latest version \`${c.latest}\`, published ${c.publishedAt?.slice(0, 10) || 'unknown'} (${c.ageYears} years before the study date), used directly by ${d.users.length} of the ${P.length} sampled packages (e.g. ${d.users.slice(0, 5).map(u => '`' + u + '`').join(', ')}).\n`;
  for (const r of c.deadReasons) m += `- ${r.rule} (${r.field}): ${trunc(r.value, 300)}\n`;
  if (c.osvVulns.length) m += `- OSV lists ${c.osvVulns.length} vulnerability id(s) for this version: ${c.osvVulns.slice(0, 6).join(', ')}\n`;
  if (c.repoPushedAt) m += `- GitHub \`pushed_at\`: ${c.repoPushedAt}\n`;
  m += `- Links: [npm](https://www.npmjs.com/package/${d.n}) | [deps.dev](https://deps.dev/npm/${encodeURIComponent(d.n)}/${c.latest})${c.sourceRepo ? ` | [repo](${repoUrl(c.sourceRepo)})` : ''}${c.osvVulns.length ? ` | [OSV](https://osv.dev/vulnerability/${c.osvVulns[0]})` : ''}\n\n`;
}
m += `## Reproduce

\`\`\`bash
cd .conductor/study
node study.mjs ${D.N}     # needs Node 18+ and \`gh auth login\`; writes data.json, caches to .cache/
node report.mjs           # writes REPORT.md from data.json
\`\`\`

Without the cache, re-running later will give different numbers because the registries move; set \`STUDY_NOW\` to pin the age calculation. \`data.json\` + \`.cache/\` are the frozen evidence.

## Skipped / not checked

- Transitive dependencies, devDependencies, peerDependencies, optionalDependencies.
- Resolving semver ranges or lockfiles; only latest versions are evaluated.
- Non-GitHub repos get no archived flag or Scorecard (deps.dev project data, GitLab/Bitbucket not queried).
- Download counts and real-world usage weighting; "used by" is count of sampled packages only.
- Maintainer interviews / reasons beyond the deprecation message text.
`;
fs.writeFileSync(new URL('REPORT.md', import.meta.url), m);
console.log(m.split('\n').slice(0, 12).join('\n'));
