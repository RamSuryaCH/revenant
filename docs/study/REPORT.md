# Revenant ecosystem study: dead dependencies in the most-depended-on npm packages

Generated 2026-11-19T14:00:31.205Z by `study.mjs` + `report.mjs`. Every number below is computed from `data.json`, which holds the raw per-package fields from public APIs.

## Headline

**14.0% (70 of 500) of the 500 most-depended-on npm packages declare at least one *dead* direct dependency in their latest release** (17.7% of the 395 that have any direct dependencies). Counting *dying* dependencies too, it is 55.0% (275 of 500).

- Unique dead packages used directly by the sample: 69
- Sample packages that are themselves dead by our definition: 69 (babel-eslint, css-loader, cross-env, babel-preset-es2015, babel-preset-env, style-loader, tslint, node-sass, file-loader, prop-types, request, eslint-plugin-standard, @babel/plugin-proposal-class-properties, url-loader, rollup-plugin-node-resolve, istanbul, rollup-plugin-terser, rollup-plugin-babel, rollup-plugin-commonjs, extract-text-webpack-plugin, eslint-loader, should, mini-css-extract-plugin, copy-webpack-plugin, uglifyjs-webpack-plugin, clean-webpack-plugin, karma-mocha, babel, codecov, @babel/plugin-proposal-object-rest-spread, @babel/polyfill, gulp-util, coffee-script, aws-sdk, @types/uuid, raw-loader, @types/react-native, @types/inquirer, @storybook/testing-library, json-loader, karma-phantomjs-launcher, fs, regenerator-runtime, eslint-plugin-babel, protractor, html-loader, q, crypto-js, friendly-errors-webpack-plugin, rollup-plugin-replace, rollup-plugin-json, webpack-hot-middleware, @babel/plugin-proposal-optional-chaining, source-map-loader, @angular/http, esm, @material-ui/core, awesome-typescript-loader, gulp-plumber, eslint-config-airbnb-typescript, postcss-flexbugs-fixes, request-promise, phantomjs-prebuilt, loader-utils, conventional-changelog-cli, karma-cli, @types/glob, @types/classnames, opn)

## Method

1. **Sample**: the first 500 entries of `npmTopDependents` from [npm-high-impact](https://github.com/wooorm/npm-high-impact) v1.13.0 (npm package published 2026-06-08), which ranks packages by number of dependent packages on the npm registry. The exact list is committed as `top-dependent.snapshot.js`. Note the list ordering is by dependents, includes `@types/*` packages, and the dependent counts date from that package release, not from today.
2. **Direct dependencies**: for each sample package, the `dependencies` object (runtime only; not dev/peer/optional) of the `dist-tags.latest` version from the npm registry (abbreviated packument).
3. **Classification** of every sample package and every direct dependency, at its latest version, using only public APIs:
   - npm registry: `versions[latest].deprecated`
   - deps.dev v3 GetVersion: `publishedAt`, `advisoryKeys`, source repo (`relatedProjects` of type SOURCE_REPO)
   - GitHub REST `/repos/{owner}/{repo}`: `archived`, HTTP 404
   - OSV `/v1/querybatch` on `{npm name, latest version}`: known vulnerability ids
   - OpenSSF Scorecard API (api.securityscorecards.dev): `Maintained` check score
4. Responses are cached under `.cache/`; the script is deterministic given the cache. "Age" is measured against the generation timestamp above.

## Definitions

**Dead** if ANY of:
- `deprecated`: the latest npm version has a non-empty `deprecated` message.
- `repo_archived`: the source repo on GitHub has `archived: true`.
- `repo_gone`: the source repo URL returns HTTP 404 from GitHub.
- `stale_and_vulnerable`: latest version published at least 3 years ago AND OSV lists at least one vulnerability for that version.

**Dying** (not dead, but) if ANY of: latest version published at least 2 years ago; or OpenSSF Scorecard `Maintained` = 0 and latest publish at least 1 year ago.

**Alive**: everything else. Packages with no resolvable version info are excluded from counts of classes.

Caveats: we evaluate each dependency's *latest* version, not the version a range resolves to or the one in a lockfile. Transitive dependencies are not analysed. A deprecation notice can point to a maintained successor; "dead" here means "its maintainers say stop using it or it is archived/abandoned-and-vulnerable", not "unusable". Packages with no GitHub repo link get no archived/Scorecard signal.

## Numbers

| Metric | Value |
|---|---|
| Sample size | 500 |
| Sample packages with >=1 direct dep | 395 |
| With >=1 dead direct dep | 70 (14.0%) |
| With >=1 dying direct dep | 262 (52.4%) |
| With dead or dying | 275 (55.0%) |
| Unique packages classified (sample + their direct deps) | 1991 |
| ...of which dead / dying / alive | 119 / 773 / 1099 |
| Dead deps used by the sample, by rule (a dep may match several) | repo_archived 39, stale_and_vulnerable 4, deprecated 27, repo_gone 9 |

## Sensitivity (how much the headline depends on the definition)

- Strict definition (only `deprecated` or `stale_and_vulnerable`, ignoring repo archived/gone): **5.6% (28 of 500)** have at least one dead direct dependency.
- 39 of the 69 dead packages qualify only through an archived or missing GitHub repo (no npm deprecation, no known vuln). Some were published recently (e.g. latest publish within the last year), so "archived" means maintainers froze the repo, which may not mean the code is unusable. `repo_gone` (HTTP 404) can also mean a rename, transfer or private repo.

## Top 25 most-depended-on dead packages (within the sample)

"Used by" counts sample packages that list it as a direct runtime dependency.

| # | Package | Used by | Why dead (rule: source field) | Last publish | Repo |
|---|---|---|---|---|---|
| 1 | `loader-utils@3.3.1` | 12 | repo_archived: github.com/webpack/loader-utils | 2024-06-05 | github.com/webpack/loader-utils |
| 2 | `prop-types@15.8.1` | 7 | repo_archived: github.com/facebook/prop-types | 2022-01-05 | github.com/facebook/prop-types |
| 3 | `rollup-pluginutils@2.8.2` | 7 | repo_archived: github.com/rollup/rollup-pluginutils | 2019-09-13 | github.com/rollup/rollup-pluginutils |
| 4 | `find-cache-dir@6.0.0` | 5 | deprecated: Renamed to `find-cache-directory`. | 2025-04-08 | github.com/sindresorhus/find-cache-dir |
| 5 | `text-table@0.2.0` | 5 | repo_gone: github.com/substack/text-table | 2013-10-05 | github.com/substack/text-table |
| 6 | `regenerator-runtime@0.14.1` | 4 | repo_archived: github.com/facebook/regenerator | 2023-12-15 | github.com/facebook/regenerator |
| 7 | `@babel/plugin-proposal-class-properties@7.18.6` | 3 | deprecated: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer... | 2022-06-27 | github.com/babel/babel |
| 8 | `css-loader@7.1.5` | 3 | repo_archived: github.com/webpack/css-loader | 2026-08-28 | github.com/webpack/css-loader |
| 9 | `mini-css-extract-plugin@2.10.2` | 3 | repo_archived: github.com/webpack/mini-css-extract-plugin | 2026-03-26 | github.com/webpack/mini-css-extract-plugin |
| 10 | `@ampproject/remapping@2.3.0` | 2 | repo_archived: github.com/ampproject/remapping | 2024-03-01 | github.com/ampproject/remapping |
| 11 | `@babel/plugin-proposal-optional-chaining@7.21.0` | 2 | deprecated: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer... | 2023-02-20 | github.com/babel/babel |
| 12 | `copy-webpack-plugin@14.0.0` | 2 | repo_archived: github.com/webpack/copy-webpack-plugin | 2026-03-02 | github.com/webpack/copy-webpack-plugin |
| 13 | `css-minimizer-webpack-plugin@8.0.0` | 2 | repo_archived: github.com/webpack/css-minimizer-webpack-plugin | 2026-03-02 | github.com/webpack/css-minimizer-webpack-plugin |
| 14 | `doctrine@3.0.0` | 2 | repo_archived: github.com/eslint/doctrine | 2018-11-10 | github.com/eslint/doctrine |
| 15 | `path-is-absolute@2.0.0` | 2 | deprecated: This package is no longer relevant as Node.js 0.12 is unmaintained.; repo_archived: github.com/sindresorhus/path-is-absolute | 2018-11-08 | github.com/sindresorhus/path-is-absolute |
| 16 | `pkg-up@5.0.0` | 2 | deprecated: Renamed to package-up | 2023-11-04 | github.com/sindresorhus/pkg-up |
| 17 | `request@2.88.2` | 2 | deprecated: request has been deprecated, see https://github.com/request/request/issues/3142; stale_and_vulnerable: 2020-02-11T16:35:36Z; GHSA-p8p7-x288-28g6 | 2020-02-11 | github.com/request/request |
| 18 | `rollup-plugin-terser@7.0.2` | 2 | deprecated: This package has been deprecated and is no longer maintained. Please use @rollup/plugin-te...; repo_archived: github.com/trysound/rollup-plugin-terser | 2020-09-04 | github.com/trysound/rollup-plugin-terser |
| 19 | `source-map-loader@5.0.0` | 2 | repo_archived: github.com/webpack-contrib/source-map-loader | 2024-01-15 | github.com/webpack-contrib/source-map-loader |
| 20 | `wordwrap@1.0.0` | 2 | repo_gone: github.com/substack/node-wordwrap | 2015-05-07 | github.com/substack/node-wordwrap |
| 21 | `@babel/plugin-proposal-nullish-coalescing-operator@7.18.6` | 1 | deprecated: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer... | 2022-06-27 | github.com/babel/babel |
| 22 | `@babel/plugin-proposal-numeric-separator@7.18.6` | 1 | deprecated: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer... | 2022-06-27 | github.com/babel/babel |
| 23 | `@babel/plugin-proposal-private-methods@7.18.6` | 1 | deprecated: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer... | 2022-06-27 | github.com/babel/babel |
| 24 | `@babel/plugin-proposal-private-property-in-object@7.21.11` | 1 | deprecated: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer... | 2023-06-05 | github.com/babel/babel |
| 25 | `@material-ui/styles@4.11.5` | 1 | deprecated: Material UI v4 doesn't receive active development since September 2021. See the guide http... | 2022-04-03 | github.com/mui-org/material-ui |

Fields: rule `deprecated` = npm `versions[latest].deprecated`; `repo_archived` = GitHub `archived`; `stale_and_vulnerable` = deps.dev `publishedAt` + OSV ids.

## Cause-of-death stories

Picked mechanically: the most-used dead package for each distinct cause, in order, so nothing is hand-selected for drama.

### `find-cache-dir`: Deprecated by its maintainers
- Latest version `6.0.0`, published 2025-04-08 (1.62 years before the study date), used directly by 5 of the 500 sampled packages (e.g. `nyc`, `rollup-plugin-typescript2`, `eslint-loader`, `gh-pages`, `uglifyjs-webpack-plugin`).
- deprecated (npm registry versions[latest].deprecated): Renamed to `find-cache-directory`.
- GitHub `pushed_at`: 2025-04-08T15:25:25Z
- Links: [npm](https://www.npmjs.com/package/find-cache-dir) | [deps.dev](https://deps.dev/npm/find-cache-dir/6.0.0) | [repo](https://github.com/sindresorhus/find-cache-dir)

### `loader-utils`: Archived repo, never formally deprecated
- Latest version `3.3.1`, published 2024-06-05 (2.46 years before the study date), used directly by 12 of the 500 sampled packages (e.g. `file-loader`, `url-loader`, `extract-text-webpack-plugin`, `eslint-loader`, `raw-loader`).
- repo_archived (GitHub /repos/{o}/{r}.archived): github.com/webpack/loader-utils
- GitHub `pushed_at`: 2024-06-05T15:13:31Z
- Links: [npm](https://www.npmjs.com/package/loader-utils) | [deps.dev](https://deps.dev/npm/loader-utils/3.3.1) | [repo](https://github.com/webpack/loader-utils)

### `path-is-absolute`: Deprecated AND archived
- Latest version `2.0.0`, published 2018-11-08 (8.03 years before the study date), used directly by 2 of the 500 sampled packages (e.g. `babel-core`, `babel-cli`).
- deprecated (npm registry versions[latest].deprecated): This package is no longer relevant as Node.js 0.12 is unmaintained.
- repo_archived (GitHub /repos/{o}/{r}.archived): github.com/sindresorhus/path-is-absolute
- GitHub `pushed_at`: 2021-01-24T05:54:02Z
- Links: [npm](https://www.npmjs.com/package/path-is-absolute) | [deps.dev](https://deps.dev/npm/path-is-absolute/2.0.0) | [repo](https://github.com/sindresorhus/path-is-absolute)

### `request`: Stale and carrying known vulnerabilities
- Latest version `2.88.2`, published 2020-02-11 (6.77 years before the study date), used directly by 2 of the 500 sampled packages (e.g. `coveralls`, `phantomjs-prebuilt`).
- deprecated (npm registry versions[latest].deprecated): request has been deprecated, see https://github.com/request/request/issues/3142
- stale_and_vulnerable (deps.dev publishedAt + OSV querybatch): 2020-02-11T16:35:36Z; GHSA-p8p7-x288-28g6
- OSV lists 1 vulnerability id(s) for this version: GHSA-p8p7-x288-28g6
- GitHub `pushed_at`: 2024-08-14T00:09:41Z
- Links: [npm](https://www.npmjs.com/package/request) | [deps.dev](https://deps.dev/npm/request/2.88.2) | [repo](https://github.com/request/request) | [OSV](https://osv.dev/vulnerability/GHSA-p8p7-x288-28g6)

### `prop-types`: Next most-used dead package
- Latest version `15.8.1`, published 2022-01-05 (4.87 years before the study date), used directly by 7 of the 500 sampled packages (e.g. `eslint-plugin-react`, `enzyme-adapter-react-16`, `@alifd/next`, `@material-ui/core`, `react-hot-loader`).
- repo_archived (GitHub /repos/{o}/{r}.archived): github.com/facebook/prop-types
- GitHub `pushed_at`: 2024-05-17T08:15:01Z
- Links: [npm](https://www.npmjs.com/package/prop-types) | [deps.dev](https://deps.dev/npm/prop-types/15.8.1) | [repo](https://github.com/facebook/prop-types)

## Reproduce

```bash
cd docs/study
node study.mjs 500     # needs Node 18+ and `gh auth login`; writes data.json, caches to .cache/
node report.mjs           # writes REPORT.md from data.json
```

Without the cache, re-running later will give different numbers because the registries move; set `STUDY_NOW` to pin the age calculation. `data.json` (1.3 MB) and `.cache/` are the frozen evidence; they are kept out of the repo to keep it small.

## Skipped / not checked

- Transitive dependencies, devDependencies, peerDependencies, optionalDependencies.
- Resolving semver ranges or lockfiles; only latest versions are evaluated.
- Non-GitHub repos get no archived flag or Scorecard (deps.dev project data, GitLab/Bitbucket not queried).
- Download counts and real-world usage weighting; "used by" is count of sampled packages only.
- Maintainer interviews / reasons beyond the deprecation message text.
