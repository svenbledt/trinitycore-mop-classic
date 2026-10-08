import { type Direction, type OpcodeEntry, group, index } from "./types";

export interface ClientOpcode { dir: Direction; value: number; rva: string }
export interface Match { name: string; value: number; dir: Direction; confidence: "high" | "low" | "override" }
export interface MatchResult { matched: Match[]; unmatchedClient: ClientOpcode[]; absent: OpcodeEntry[] }
export interface Overrides {
  names?: Record<string, number>;
  groupMap?: Partial<Record<Direction, Record<string, string>>>; // "0xWPPGROUP" -> "0xCLIENTGROUP"
}

const MIN_D = -16, MAX_D = 96;

// Monotone offset alignment of one WPP group onto one client group (see docs/mop-port/re-notes.md).
function alignGroup(ws: OpcodeEntry[], anchors: Map<string, number>, present: Set<number>, size: number, dense: boolean) {
  const n = ws.length, span = MAX_D - MIN_D + 1;
  const NEG = -1e9;
  const score = Array.from({ length: n }, () => new Float64Array(span).fill(NEG));
  const back = Array.from({ length: n }, () => new Int32Array(span).fill(-1));
  const local = (k: number, d: number) => {
    const w = index(ws[k].value), t = w + d, a = anchors.get(ws[k].name);
    if (a !== undefined) return a === t ? 100 : NEG;
    if (t < 0 || t >= size) return NEG;
    return present.has(t) && !dense ? 1 : 0;
  };
  for (let d = MIN_D; d <= MAX_D; d++) score[0][d - MIN_D] = local(0, d);
  for (let k = 1; k < n; k++) {
    let best = NEG, bestD = -1;
    for (let d = MIN_D; d <= MAX_D; d++) {
      const prev = score[k - 1][d - MIN_D] - 0.001; // changing offset later costs a little
      if (prev > best) { best = prev; bestD = d; }
      const stay = score[k - 1][d - MIN_D];
      const l = local(k, d);
      if (l <= NEG / 2) continue;
      const fromStay = stay > NEG / 2 ? stay + l : NEG;
      const fromBest = best > NEG / 2 ? best + l : NEG;
      if (fromStay >= fromBest) { score[k][d - MIN_D] = fromStay; back[k][d - MIN_D] = d; }
      else { score[k][d - MIN_D] = fromBest; back[k][d - MIN_D] = bestD; }
    }
  }
  let d = MIN_D;
  for (let x = MIN_D; x <= MAX_D; x++) if (score[n - 1][x - MIN_D] > score[n - 1][d - MIN_D]) d = x;
  if (score[n - 1][d - MIN_D] <= NEG / 2) return null;
  const offs = new Array<number>(n);
  for (let k = n - 1; k >= 0; k--) { offs[k] = d; d = back[k][d - MIN_D]; }
  return offs;
}

export function matchOpcodes(wpp: OpcodeEntry[], client: ClientOpcode[], ov: Overrides): MatchResult {
  const res: MatchResult = { matched: [], unmatchedClient: [], absent: [] };
  const names = ov.names ?? {};
  const used = new Set<string>();
  for (const dir of ["CMSG", "SMSG"] as Direction[]) {
    const gm = ov.groupMap?.[dir] ?? {};
    const wd = wpp.filter(e => e.dir === dir);
    const cd = client.filter(e => e.dir === dir);
    const inMapped = new Set<string>();
    for (const [wgS, cgS] of Object.entries(gm)) {
      const wg = parseInt(wgS, 16), cg = parseInt(cgS, 16);
      const ws = wd.filter(e => group(e.value) === wg).sort((a, b) => index(a.value) - index(b.value));
      const present = new Set(cd.filter(e => group(e.value) === cg).map(e => index(e.value)));
      if (!ws.length) continue;
      const size = present.size ? Math.max(...present) + 1 : 0;
      const dense = dir === "SMSG"; // SMSG values come from dense dispatch tables, so set membership proves nothing
      const anchors = new Map<string, number>();
      for (const e of ws)
        if (names[e.name] !== undefined && group(names[e.name]) === cg) anchors.set(e.name, index(names[e.name]));
      const offs = alignGroup(ws, anchors, present, size, dense);
      ws.forEach((e, k) => {
        inMapped.add(e.name);
        if (!offs) { res.absent.push(e); return; }
        const t = index(e.value) + offs[k], value = (cg << 16) | t;
        const confidence = anchors.has(e.name) ? "override" : (!dense && present.has(t) ? "high" : "low");
        res.matched.push({ name: e.name, value, dir, confidence });
        used.add(`${dir}:${value}`);
      });
    }
    for (const e of wd) {
      if (inMapped.has(e.name)) continue;
      if (names[e.name] !== undefined) {
        res.matched.push({ name: e.name, value: names[e.name], dir, confidence: "override" });
        used.add(`${dir}:${names[e.name]}`);
      } else res.absent.push(e);
    }
    res.unmatchedClient.push(...cd.filter(c => !used.has(`${dir}:${c.value}`)));
  }
  res.matched.sort((a, b) => a.dir.localeCompare(b.dir) || a.value - b.value);
  return res;
}

export function renderReport(r: MatchResult): string {
  const line = (m: Match) => `| ${m.name} | 0x${m.value.toString(16).toUpperCase()} | ${m.confidence} |`;
  return [
    `# Opcode match report`, ``,
    `matched: ${r.matched.length} (low: ${r.matched.filter(m => m.confidence === "low").length}), unmatched client: ${r.unmatchedClient.length}, absent in client: ${r.absent.length}`, ``,
    `## Low confidence`, `| name | value | confidence |`, `|---|---|---|`, ...r.matched.filter(m => m.confidence === "low").map(line), ``,
    `## Unmatched client values`, ...r.unmatchedClient.map(c => `- ${c.dir} 0x${c.value.toString(16).toUpperCase()} (${c.rva})`), ``,
    `## Absent in client (WPP names without a value in this build)`, ...r.absent.map(a => `- ${a.name}`),
  ].join("\n");
}

if (import.meta.main) {
  const [build] = Bun.argv.slice(2);
  const dir = import.meta.dir + "/..";
  const refs = await Bun.file(`${dir}/refs.json`).json();
  const { parseWppOpcodes } = await import("./wpp");
  const wppSrc = await Bun.file(`${dir}/refs/wpp/${refs.wpp.opcodes}`).text();
  const client = await Bun.file(`${dir}/out/${build}/opcodes.json`).json();
  const ov = await Bun.file(`${dir}/overrides/${build}.json`).json();
  const r = matchOpcodes(parseWppOpcodes(wppSrc), client, ov);
  await Bun.write(`${dir}/out/${build}/match.json`, JSON.stringify(r, null, 1));
  await Bun.write(`${dir}/out/${build}/match-report.md`, renderReport(r));
  console.log(renderReport(r).split("\n")[2]);
}
