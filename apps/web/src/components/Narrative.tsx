import type { Resurrection, ScanResult } from "@revenant/engine";
import cursed from "../../public/samples/cursed.scan.json";
import requestFetch from "../../public/samples/request-to-fetch.json";
import { narrativeFacts } from "@/lib/narrative";
import { Reveal } from "./Reveal";

const f = narrativeFacts(cursed as unknown as ScanResult, requestFetch as unknown as Resurrection);
const PR_URL = "https://github.com/RamSuryaCH/revenant-crypt/pull/2";

/** Server-rendered three-beat story under the hero. Each beat shows one artifact read from the bundled sample. */
export function Narrative() {
  return (
    <section className="narr" aria-labelledby="how-title">
      <div className="mx-auto max-w-[1280px] px-[var(--pad)]">
        <p className="t-label text-moon">How it works</p>
        <h2 id="how-title" className="t-display mt-3 max-w-[16ch]">Three steps from rot to a pull request.</h2>
        <ol className="beats mt-16 lg:mt-24">
          <Reveal index={0}>
            <div className="beat-copy">
              <span className="beat-n" aria-hidden="true">01</span>
              <h3 className="t-title">Scan</h3>
              <p>Paste a repository. Revenant reads its package.json and asks five public sources about every dependency.</p>
            </div>
            <figure className="artifact" aria-label="Scan result of the cached sample">
              <p className="big-num"><span>{f.scan.total}</span> packages</p>
              <p className="t-evidence text-mist">{f.scan.dead} dead, {f.scan.dying} dying, {f.scan.living} alive, in the cached sample app.</p>
              <ul className="src-ledger mt-5">
                {f.scan.sources.map((s) => (
                  <li key={s.id}>
                    <span style={{ minWidth: 150, color: "var(--color-bone)" }}>{s.label}</span>
                    <span className="text-dim">cited by {s.packages} {s.packages === 1 ? "package" : "packages"}</span>
                  </li>
                ))}
              </ul>
            </figure>
          </Reveal>

          <Reveal index={1}>
            <div className="beat-copy">
              <span className="beat-n" aria-hidden="true">02</span>
              <h3 className="t-title">Epitaph</h3>
              <p>Every dead package gets a sentence, and the sentence names the field and the source it was read from.</p>
            </div>
            <figure className="artifact epitaph-plate">
              <p className="t-label text-dim">Here lies {f.epitaph.name} {f.epitaph.version}</p>
              <blockquote className="t-pull mt-3 wrap-any" style={{ fontSize: 22 }}>{f.epitaph.text}</blockquote>
              <dl className="mt-5 grid gap-2 t-evidence">
                <div><dt className="text-dim">field</dt><dd className="text-moon wrap-any">{f.epitaph.field}</dd></div>
                <div>
                  <dt className="text-dim">source</dt>
                  <dd>{f.epitaph.url ? <a className="text-moon underline underline-offset-4" href={f.epitaph.url} target="_blank" rel="noreferrer">{f.epitaph.sourceLabel} (raw JSON, opens in a new tab)</a> : f.epitaph.sourceLabel}</dd>
                </div>
              </dl>
            </figure>
          </Reveal>

          <Reveal index={2}>
            <div className="beat-copy">
              <span className="beat-n" aria-hidden="true">03</span>
              <h3 className="t-title">Resurrect</h3>
              <p>One click turns the epitaph into a Kiro spec, a patch and property tests. On the sandbox repo the result is a real pull request.</p>
            </div>
            <figure className="artifact prshot">
              <p className="t-label text-ember">Recorded run on the sandbox repo</p>
              <p className="t-pull mt-2">Resurrect {f.resurrect.name}: migrate to {f.resurrect.replacement.replace(/ \(.*\)$/, "")}</p>
              <ul className="t-evidence mt-4 grid gap-1 text-mist">
                <li>Patch to source files: <span className="add">+{f.resurrect.added}</span> <span className="del">−{f.resurrect.removed}</span> in {f.resurrect.files} {f.resurrect.files === 1 ? "file" : "files"}</li>
                <li>Kiro spec: .kiro/specs/{f.resurrect.specSlug}/</li>
                {f.resurrect.suite && <li>Sandbox suite: {f.resurrect.suite} pass{f.resurrect.recordedOn ? ` (recorded ${f.resurrect.recordedOn})` : ""}</li>}
                {f.resurrect.differential !== null && <li>Differential property tests: {f.resurrect.differential} pass</li>}
              </ul>
              <a className="btn-ghost mt-5 inline-flex items-center" href={PR_URL} target="_blank" rel="noreferrer">Open pull request #2 on GitHub (new tab)</a>
            </figure>
          </Reveal>
        </ol>
      </div>
    </section>
  );
}
