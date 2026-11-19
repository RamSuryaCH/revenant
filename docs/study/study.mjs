// Revenant ecosystem study. Run: node study.mjs [N=500]   (needs Node 18+, `gh` logged in for GitHub token)
// Stages are cached on disk under .cache/ so reruns are cheap and reproducible from the cache.
import fs from 'node:fs'; import path from 'node:path'; import {execSync} from 'node:child_process';
import {topDependent} from './top-dependent.snapshot.js';
const N = Number(process.argv[2] || 500);
const NOW = new Date(process.env.STUDY_NOW || Date.now());
const YEAR = 365.25 * 864e5;
const CACHE = new URL('.cache/', import.meta.url).pathname; fs.mkdirSync(CACHE, {recursive: true});
const TOKEN = process.env.GH_TOKEN || execSync('gh auth token').toString().trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const key = s => s.replace(/[^a-zA-Z0-9._-]/g, '_');
async function cached(name, fn) {
  const f = path.join(CACHE, key(name) + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const v = await fn(); fs.writeFileSync(f, JSON.stringify(v)); return v;
}
async function http(url, opts = {}, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {...opts, signal: AbortSignal.timeout(30000)});
      if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
      if (r.status === 403 && r.headers.get('x-ratelimit-remaining') === '0') {
        const wait = Math.max(5, Number(r.headers.get('x-ratelimit-reset')) - Date.now() / 1000);
        console.error('GitHub rate limit; sleeping', Math.ceil(wait), 's'); await sleep(wait * 1000); continue;
      }
      return {status: r.status, body: r.status === 200 ? await r.json() : null};
    } catch (e) { await sleep(1000 * (i + 1)); }
  }
  return {status: 0, body: null};
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({length: n}, async () => { while (i < items.length) { const x = items[i++]; await fn(x); } })); }
const enc = encodeURIComponent;

// 1. npm registry (abbreviated packument): latest version, deprecated, direct deps
async function npmInfo(name) {
  return cached('npm_' + name, async () => {
    const r = await http('https://registry.npmjs.org/' + name.replace('/', '%2F'), {headers: {accept: 'application/vnd.npm.install-v1+json'}});
    if (!r.body) return {name, status: r.status};
    const latest = r.body['dist-tags']?.latest, v = r.body.versions?.[latest] || {};
    return {name, status: 200, latest, deprecated: v.deprecated ?? null, dependencies: v.dependencies || {}, modified: r.body.modified};
  });
}
// 2. deps.dev version: publishedAt, advisories, source repo
async function depsdev(name, ver) {
  return cached(`dd_${name}@${ver}`, async () => {
    const r = await http(`https://api.deps.dev/v3/systems/npm/packages/${enc(name)}/versions/${enc(ver)}`);
    if (!r.body) return {status: r.status};
    const b = r.body, rp = (b.relatedProjects || []).find(p => p.relationType === 'SOURCE_REPO');
    return {status: 200, publishedAt: b.publishedAt, isDeprecated: b.isDeprecated, deprecatedReason: b.deprecatedReason,
      advisoryKeys: (b.advisoryKeys || []).map(a => a.id), sourceRepo: rp?.projectKey?.id || null};
  });
}
// 3. GitHub archived flag
async function ghRepo(id) {
  return cached('gh_' + id, async () => {
    const m = id.match(/^github\.com\/([^/]+)\/([^/]+)$/); if (!m) return {status: -1};
    const r = await http(`https://api.github.com/repos/${m[1]}/${m[2]}`, {headers: {authorization: 'Bearer ' + TOKEN, accept: 'application/vnd.github+json', 'user-agent': 'revenant-study'}});
    if (!r.body) return {status: r.status};
    const b = r.body; return {status: 200, archived: b.archived, disabled: b.disabled, pushed_at: b.pushed_at, full_name: b.full_name, stars: b.stargazers_count, html_url: b.html_url};
  });
}
// 4. OpenSSF Scorecard
async function scorecard(id) {
  return cached('sc_' + id, async () => {
    const r = await http('https://api.securityscorecards.dev/projects/' + id);
    if (!r.body) return {status: r.status};
    const m = (r.body.checks || []).find(c => c.name === 'Maintained');
    return {status: 200, date: r.body.date, score: r.body.score, maintained: m ? m.score : null, maintainedReason: m?.reason};
  });
}
// 5. OSV querybatch
async function osv(pairs) {
  const out = {}; const todo = [];
  for (const [n, v] of pairs) { const f = path.join(CACHE, key(`osv_${n}@${v}`) + '.json'); if (fs.existsSync(f)) out[`${n}@${v}`] = JSON.parse(fs.readFileSync(f)); else todo.push([n, v]); }
  for (let i = 0; i < todo.length; i += 500) {
    const chunk = todo.slice(i, i + 500);
    const r = await fetch('https://api.osv.dev/v1/querybatch', {method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({queries: chunk.map(([n, v]) => ({package: {name: n, ecosystem: 'npm'}, version: v}))})}).then(r => r.json());
    chunk.forEach(([n, v], j) => { const ids = (r.results[j].vulns || []).map(x => x.id); out[`${n}@${v}`] = ids; fs.writeFileSync(path.join(CACHE, key(`osv_${n}@${v}`) + '.json'), JSON.stringify(ids)); });
  }
  return out;
}

const sample = topDependent.slice(0, N);
console.error('sample', sample.length);
const info = {}; await pool(sample, 10, async n => { info[n] = await npmInfo(n); });
const depSet = new Set(); for (const n of sample) for (const d of Object.keys(info[n].dependencies || {})) depSet.add(d);
const deps = [...depSet]; console.error('unique direct deps', deps.length);
await pool(deps, 10, async n => { info[n] ??= await npmInfo(n); });
const all = [...new Set([...sample, ...deps])];
const dd = {}; await pool(all, 8, async n => { const v = info[n].latest; if (v) dd[n] = await depsdev(n, v); });
const osvRes = await osv(all.filter(n => info[n].latest).map(n => [n, info[n].latest]));
const repos = [...new Set(Object.values(dd).map(x => x.sourceRepo).filter(Boolean))]; console.error('repos', repos.length);
const gh = {}; await pool(repos, 6, async id => { gh[id] = await ghRepo(id); });
const sc = {}; await pool(repos.filter(id => gh[id]?.status === 200 || id.startsWith('github.com/')), 8, async id => { sc[id] = await scorecard(id); });

// Classification
const DEAD_YEARS = 3, DYING_YEARS = 2;
function classify(n) {
  const i = info[n], d = dd[n] || {}, repo = d.sourceRepo, g = repo ? gh[repo] : null, s = repo ? sc[repo] : null;
  const vulns = osvRes[`${n}@${i.latest}`] || [];
  const ageY = d.publishedAt ? (NOW - new Date(d.publishedAt)) / YEAR : null;
  const reasons = [];
  if (i.deprecated) reasons.push({rule: 'deprecated', field: 'npm registry versions[latest].deprecated', value: i.deprecated});
  if (g?.status === 200 && g.archived) reasons.push({rule: 'repo_archived', field: 'GitHub /repos/{o}/{r}.archived', value: repo});
  if (g?.status === 404 && repo) reasons.push({rule: 'repo_gone', field: 'GitHub /repos/{o}/{r} HTTP 404', value: repo});
  if (ageY !== null && ageY >= DEAD_YEARS && vulns.length) reasons.push({rule: 'stale_and_vulnerable', field: 'deps.dev publishedAt + OSV querybatch', value: `${d.publishedAt}; ${vulns.join(',')}`});
  let cls = 'alive', dyingWhy = [];
  if (reasons.length) cls = 'dead';
  else {
    if (ageY !== null && ageY >= DYING_YEARS) dyingWhy.push({rule: 'no_publish_2y', field: 'deps.dev publishedAt', value: d.publishedAt});
    if (s?.status === 200 && s.maintained === 0 && ageY !== null && ageY >= 1) dyingWhy.push({rule: 'scorecard_maintained_0', field: 'OpenSSF Scorecard Maintained', value: s.maintainedReason});
    if (dyingWhy.length) cls = 'dying';
  }
  return {name: n, latest: i.latest, publishedAt: d.publishedAt || null, ageYears: ageY === null ? null : +ageY.toFixed(2), deprecated: i.deprecated, sourceRepo: repo || null,
    repoArchived: g?.status === 200 ? g.archived : null, repoHttp: g?.status ?? null, repoPushedAt: g?.pushed_at || null, osvVulns: vulns, scorecard: s?.status === 200 ? {score: s.score, maintained: s.maintained, date: s.date} : null,
    class: cls, deadReasons: reasons, dyingReasons: dyingWhy, npmStatus: i.status};
}
const cls = {}; for (const n of all) if (info[n].latest) cls[n] = classify(n);
const per = sample.map((n, idx) => {
  const ds = Object.keys(info[n].dependencies || {});
  const dead = ds.filter(x => cls[x]?.class === 'dead'), dying = ds.filter(x => cls[x]?.class === 'dying');
  return {rank: idx + 1, name: n, selfClass: cls[n]?.class || 'unknown', directDeps: ds.length, deadDeps: dead, dyingDeps: dying};
});
const usedBy = {}; for (const p of per) for (const d of p.deadDeps) (usedBy[d] ||= []).push(p.name);
const out = {generatedAt: NOW.toISOString(), sampleSource: 'npm-high-impact@1.13.0 npmTopDependents (top-dependent.snapshot.js)', N, defs: {deadYears: DEAD_YEARS, dyingYears: DYING_YEARS}, perPackage: per, classifications: cls, deadUsedBy: usedBy};
fs.writeFileSync(new URL('data.json', import.meta.url).pathname, JSON.stringify(out, null, 1));
console.error('done; data.json written');
