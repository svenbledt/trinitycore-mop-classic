// Extracts per-creature spawn state and patrol paths of the Wandering Isle (map 860) from retail 5.5.4.70449 sniffs
// into data/wandering_isle_audit.json, which gen_wandering_isle_audit.ts applies (docs/mop-port/wandering-isle-sniff-diff.md).
// usage: bun tools/mop-content/sniff_wandering_isle_audit.ts <uf-parsed m1> <uf-parsed m2> -- <full-parsed m1> <full-parsed m2>
// uf-parsed = WPP 554 update-field reader output; full-parsed = WPP 5.5.3 parse of the relabelled .pkt (SMSG_ON_MONSTER_MOVE).
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2), sep = args.indexOf("--");
if (sep < 1) throw new Error("usage: sniff_wandering_isle_audit.ts <uf m1> <uf m2> -- <full m1> <full m2>");
const ufFiles = args.slice(0, sep), fullFiles = args.slice(sep + 1);
const out = new URL("./data/wandering_isle_audit.json", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const tagOf = (f: string) => f.replace(/\\/g, "/").split("/").pop()!.replace(/r?_parsed\.txt$/, "");
const r3 = (v: number) => Math.round(v * 1000) / 1000;

// ---- CreateObject of map-860 units: first sighting per GUID ----------------------------------------------------------
type Create = { g: string; tag: string; e: number; type: string; p: number[]; o: number; summoned: boolean; f: Record<string, string> };
const creates = new Map<string, Create>();
const UF = /^\[\d+\] (WalkSpeed|RunSpeed|MaxHealth|Health|Level|FactionTemplate|NpcFlags|SummonedBy|CreatedBy|EmoteState|StandState|SheatheState|AnimTier): (.*)$/;
for (const file of ufFiles) {
  const tag = tagOf(file);
  let cur: Create | null = null;
  const flush = () => { if (cur && cur.p.length && !creates.has(cur.g)) creates.set(cur.g, cur); cur = null; };
  for (const l of readFileSync(file, "utf8").split(/\r?\n/)) {
    let m;
    if (/^(ServerToClient|ClientToServer): /.test(l)) { flush(); continue; }
    if ((m = l.match(/^\[\d+\] UpdateType: (\w+)/))) { flush(); if (m[1].startsWith("Create")) cur = { g: "", tag, e: 0, type: "", p: [], o: 0, summoned: false, f: {} }; continue; }
    if (!cur) continue;
    if (!cur.g && (m = l.match(/^\[\d+\] Object Guid: Full: (0x[0-9A-F]+) (Creature|Vehicle)\/0 R\d+\/S\d+ Map: 860 Entry: (\d+)/))) { cur.g = m[1]; cur.type = m[2]; cur.e = +m[3]; continue; }
    if (!cur.g) { if (/Object Guid:/.test(l)) cur = null; continue; }
    if (!cur.p.length && (m = l.match(/^\[\d+\] Position: X: (\S+) Y: (\S+) Z: (\S+)/))) { cur.p = [+m[1], +m[2], +m[3]]; continue; }
    if (!cur.o && (m = l.match(/^\[\d+\] Orientation: (\S+)/))) { cur.o = +m[1]; continue; }
    if ((m = l.match(UF)) && cur.f[m[1]] === undefined) cur.f[m[1]] = m[2].split(" (")[0];
  }
  flush();
}
for (const c of creates.values()) c.summoned = [c.f.SummonedBy, c.f.CreatedBy].some(v => v && v !== "Full: 0x0");

// ---- SMSG_ON_MONSTER_MOVE, SMSG_LOOT_RESPONSE -------------------------------------------------------------------------
type Move = { t: number; pos: number[]; dest: number[]; len: number; moveTime: number };
const moves = new Map<string, Move[]>();
const loot: Record<string, { loots: number; items: Record<number, number> }> = {};
for (const file of fullFiles) {
  const txt = readFileSync(file, "utf8");
  for (const b of txt.split("\r\n\r\n")) {
    if (!b.startsWith("ServerToClient: SMSG_LOOT_RESPONSE")) continue;
    const o = b.match(/Owner: Full: 0x[0-9A-F]+ (Creature|Vehicle|GameObject)\/0 R\d+\/S\d+ Map: 860 Entry: (\d+)/); if (!o) continue;
    const k = `${o[1] === "GameObject" ? "go" : "cr"}${o[2]}`, r = (loot[k] ??= { loots: 0, items: {} }); r.loots++;
    for (const m of new Set([...b.matchAll(/ItemID: (\d+)/g)].map(m => +m[1]))) r.items[m] = (r.items[m] ?? 0) + 1;
  }
  let i = 0;
  while ((i = txt.indexOf("ServerToClient: SMSG_ON_MONSTER_MOVE", i)) >= 0) {
    const end = txt.indexOf("\r\n\r\n", i), b = txt.slice(i, end < 0 ? undefined : end); i = end < 0 ? txt.length : end;
    const g = b.match(/MoverGUID: Full: (0x[0-9A-F]+) \w+\/0 R\d+\/S\d+ Map: 860 /); if (!g) continue;
    const h = b.match(/Time: \S+ (\d+):(\d+):([\d.]+) Number/)!;
    const p = (s: string) => (s.match(/X: (\S+) Y: (\S+) Z: (\S+)/)?.slice(1) ?? []).map(Number);
    const pos = p(b.match(/^Position: (.*)$/m)?.[1] ?? "");
    const pts = [...b.matchAll(/\[\d+\] Points: (.*)/g)].map(m => p(m[1])), wps = [...b.matchAll(/\[\d+\] WayPoints: (.*)/g)].map(m => p(m[1]));
    const path = (wps.length && pts.length === 1 ? [...wps, ...pts] : pts.length ? pts : wps).filter(x => x.length === 3);
    if (!path.length || pos.length !== 3) continue;
    let len = 0, prev = pos; for (const x of path) { len += Math.hypot(x[0] - prev[0], x[1] - prev[1], x[2] - prev[2]); prev = x; }
    const list = moves.get(g[1]) ?? moves.set(g[1], []).get(g[1])!;
    list.push({ t: ((+h[1] * 60 + +h[2]) * 60 + +h[3]) * 1000, pos, dest: path.at(-1)!, len, moveTime: +(b.match(/MoveTime: (\d+)/)?.[1] ?? 0) });
  }
}

// ---- patrols: destinations that repeat with a fixed period (k ~ k+P for >= max(3,P) moves in a row) ------------------------
const d3 = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const patrols: unknown[] = [];
for (const [g, ms] of moves) {
  const c = creates.get(g); if (!c || c.summoned) continue;
  let best: { P: number; run: number; at: number } | null = null;
  for (let P = 2; P <= Math.min(60, ms.length >> 1) && !best; P++) {
    let run = 0, max = 0, at = -1;
    for (let k = 0; k + P < ms.length; k++) { if (d3(ms[k].dest, ms[k + P].dest) < 1) { if (++run > max) { max = run; at = k - run + 1; } } else run = 0; }
    if (max >= Math.max(3, P)) best = { P, run: max, at };
  }
  if (!best) continue;
  const nodes = [];
  for (let k = 0; k < best.P; k++) {
    const reps: number[] = []; for (let j = best.at + k; j < Math.min(ms.length, best.at + best.run + best.P); j += best.P) reps.push(j);
    // wait at a node = next move start - arrival; > 60 s means the creature was out of sight, not waiting
    const waits = reps.filter(j => j + 1 < ms.length).map(j => ms[j + 1].t - (ms[j].t + ms[j].moveTime)).filter(w => w < 60000).sort((a, b) => a - b);
    const speeds = reps.map(j => ms[j].moveTime ? ms[j].len / (ms[j].moveTime / 1000) : 0).sort((a, b) => a - b);
    const w = waits[waits.length >> 1] ?? 0;
    nodes.push({ p: ms[best.at + k].dest.map(r3), wait: w < 600 ? 0 : Math.round(w / 100) * 100, speed: r3(speeds[speeds.length >> 1]) });
  }
  let len = 0; for (let k = 0; k < nodes.length; k++) len += d3(nodes[k].p, nodes[(k + 1) % nodes.length].p);
  if (len < 10) continue;   // turning/emote moves on the spot
  patrols.push({ g, tag: c.tag, e: c.e, home: c.p.map(r3), run: best.run, len: Math.round(len), nodes, times: ms.slice(best.at, best.at + best.P).map(m => m.t) });
}

const creatures = [...creates.values()].map(c => ({ g: c.g, tag: c.tag, e: c.e, type: c.type, p: c.p.map(r3), o: r3(c.o), summoned: c.summoned,
  level: +c.f.Level, maxHealth: +c.f.MaxHealth, healthPct: c.f.MaxHealth && +c.f.MaxHealth ? Math.round(100 * +c.f.Health / +c.f.MaxHealth) : 100,
  walk: c.f.WalkSpeed ? r3(+c.f.WalkSpeed / 2.5) : null, run: c.f.RunSpeed ? Math.round(+c.f.RunSpeed / 7 * 100000) / 100000 : null,
  npcflag: +(c.f.NpcFlags ?? 0), faction: +(c.f.FactionTemplate ?? 0), emote: +(c.f.EmoteState ?? 0), stand: +(c.f.StandState ?? 0),
  sheath: +(c.f.SheatheState ?? 1), animTier: +(c.f.AnimTier ?? 0) }));
writeFileSync(out, JSON.stringify({ source: [...ufFiles, ...fullFiles].map(f => f.replace(/\\/g, "/").split("/").pop()), creatures, patrols, loot }) + "\n");
console.log(`${creatures.length} creatures, ${patrols.length} patrols, ${Object.keys(loot).length} looted entries -> ${out}`);
