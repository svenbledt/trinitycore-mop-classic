// usage: bun check.mjs <pkt...> [--only REGEX] [--show N] [--trace file@idx] [--old]
// `fixed` exports are TC's layouts since 0f8ac50489 (default); --old checks the pre-fix layouts.
// Runs every TC-layout spec against matching sniff packets; a packet passes only if the
// spec consumes exactly all bytes without reading past the end.
import { loadOpcodeNames, loadPkt, Reader, ParseError, hex } from "./lib.mjs";
import { specs as mv } from "./specs_movement.mjs";
import { specs as sp, fixed as spFixed } from "./specs_spell.mjs";
import { specs as sp2, fixed as sp2Fixed } from "./specs_spell2.mjs";
import { specs as misc, fixed as miscFixed } from "./specs_misc.mjs";
import { specs as misc2, fixed as misc2Fixed } from "./specs_misc2.mjs";
import { specs as spot, fixed as spotFixed } from "./specs_spot.mjs";
import { specs as spot2, fixed as spot2Fixed } from "./specs_spot2.mjs";
import { specs as spot3, fixed as spot3Fixed } from "./specs_spot3.mjs";

const useFixed = !process.argv.includes("--old");
const specs = { ...mv, ...sp, ...sp2, ...misc, ...misc2, ...spot, ...spot2, ...spot3, ...(useFixed ? { ...spot3Fixed, ...spFixed, ...sp2Fixed, ...miscFixed, ...misc2Fixed, ...spotFixed, ...spot2Fixed } : {}) };
const args = process.argv.slice(2);
const files = [], opt = { show: 1 };
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--only") opt.only = new RegExp(args[++i]);
  else if (args[i] === "--show") opt.show = +args[++i];
  else if (args[i] === "--trace") opt.trace = args[++i];
  else if (args[i] === "--list" || args[i] === "--fixed" || args[i] === "--old") {}
  else files.push(args[i]);
}
const { names } = loadOpcodeNames();

if (opt.trace !== undefined) {
  // --trace file:idx  -> field-by-field decode of one packet
  const [f, idx] = opt.trace.split("@");
  const p = loadPkt(f, names)[+idx];
  console.log(p.d, p.name, "size", p.data.length);
  console.log(hex(p.data, 1024));
  const r = new Reader(p.data); r.tracing = true;
  let err = "";
  try { specs[p.name](r); } catch (e) { err = e.message; }
  console.log(r.trace.join("\n"));
  console.log(err ? "ERROR " + err : `consumed ${r.pos()} / ${p.data.length} (left ${r.left()})`);
  process.exit(0);
}

const res = new Map();
for (const f of files) {
  const short = f.replace(/.*[\\/]/, "");
  for (const p of loadPkt(f, names)) {
    const spec = specs[p.name];
    if (!spec || (opt.only && !opt.only.test(p.name))) continue;
    const e = res.get(p.name) ?? { n: 0, ok: 0, left: new Map(), err: new Map(), ex: [] };
    e.n++;
    const r = new Reader(p.data);
    let kind;
    try { spec(r); kind = r.left() === 0 ? "ok" : `left ${r.left()}`; }
    catch (x) { if (!(x instanceof ParseError)) throw x; kind = "overrun"; }
    if (kind === "ok") e.ok++;
    else {
      const m = kind === "overrun" ? e.err : e.left;
      m.set(kind, (m.get(kind) ?? 0) + 1);
      if (e.ex.length < opt.show) e.ex.push(`${short}@${p.idx} size ${p.data.length} ${kind}`);
    }
    res.set(p.name, e);
  }
}
for (const [n, e] of [...res].sort((a, b) => b[1].n - a[1].n)) {
  const bad = e.n - e.ok;
  const tag = bad === 0 ? "MATCH" : e.ok === 0 ? "FAIL" : "PARTIAL";
  const lefts = [...e.left].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}x${v}`).join(",");
  const errs = [...e.err].map(([k, v]) => `${k}x${v}`).join(",");
  console.log(`${tag.padEnd(7)} ${n} ${e.ok}/${e.n}${lefts ? " " + lefts : ""}${errs ? " " + errs : ""}${bad ? "  e.g. " + e.ex.join("; ") : ""}`);
}
