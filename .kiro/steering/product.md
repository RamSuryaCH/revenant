---
inclusion: always
description: What Revenant is, who it is for, and the honesty rules that shape every feature.
---

# Product: Revenant

Revenant resurrects abandoned open-source packages. A user points it at a repository; it shows the npm dependencies as a graveyard. Dead and dying packages are tombstones with epitaphs and a cause of death. Healthy ones are living trees. For three curated packages (moment, request, uuid@3) **Resurrect** generates a Kiro spec, a `git apply` patch and differential property-based tests.

Hackathon: Kiroween 2026, category Resurrection.

## Rules that must not be broken

1. **No invented facts.** Every epitaph, cause of death and successor cites the API field it came from (`Evidence`). Curated knowledge is labelled `source: "curated"`.
2. **Honest scope.** Exactly three curated recipes. Other packages get "no curated recipe yet". Differential tests cover pure behaviour, not I/O guarantees.
3. **Default path works offline.** The judge flow loads a committed, pre-computed ScanResult in under 3 seconds. Live scans are a bonus and fall back to it visibly.
4. **No credentials from users.** Never ask for GitHub write access. Server tokens stay in env vars.
5. **Never claim what did not happen.** Docs describe how Kiro was actually used (see `KIRO_LOG.md`).
