// Builds tools/mop-content/data/wandering_isle_script.json (second half of the Wandering Isle, quests 29422-29800)
// from a retail 5.5.4.70449 sniff. gen_wandering_isle.ts merges the JSON into the world update.
// usage: bun tools/mop-content/gen_wandering_isle_script.ts <full WPP parse> <update-field WPP parse> <db2 dir> [out.json] [container]
// Full parse: relabel553.mjs + WowPacketParser; update parse: to553.mjs + WowPacketParser (5.5.4 update fields).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { readDb2 } from "./src/db2.ts";

const [fullFile, updFile, db2Dir, outFile = "tools/mop-content/data/wandering_isle_script.json", container = "tc-mop-db-1"] = process.argv.slice(2);
if (!fullFile || !updFile || !db2Dir) throw new Error("usage: gen_wandering_isle_script.ts <full parse> <update parse> <db2 dir> [out.json] [container]");
const DBD = new URL("../mop-re/refs/wowdbdefs/definitions/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const spellIds = new Set(readDb2(`${db2Dir}/SpellName.db2`, `${DBD}SpellName.dbd`).rows.map(r => r.ID as number));
const vehicleIds = new Set(readDb2(`${db2Dir}/Vehicle.db2`, `${DBD}Vehicle.dbd`).rows.map(r => r.ID as number));

type Row = Record<string, string | number>;
function q(sql: string): string[][] {
  const r = Bun.spawnSync(["docker", "exec", "-i", container, "mysql", "-uroot", "-proot", "-N", "-B"], { stdin: Buffer.from(sql) });
  if (r.exitCode !== 0) throw new Error(`${sql}\n${r.stderr.toString()}`);
  return r.stdout.toString().split("\n").filter(Boolean).map(l => l.split("\t"));
}
const log = (s: string) => console.error(s);

// ---- sniff events ---------------------------------------------------------------------------------------------------
type Ev = { n: number; t: number; op: string; b: string };
const toS = (h: string, m: string, s: string) => +h * 3600 + +m * 60 + +s;
const events: Ev[] = [];
for (const b of readFileSync(fullFile, "utf8").split(/\r?\n\r?\n/)) {
  const h = b.match(/^(?:ServerToClient|ClientToServer): (\w+).*Time: [\d/]+ (\d+):(\d+):([\d.]+) Number: (\d+)/);
  if (h) events.push({ n: +h[5], t: toS(h[2], h[3], h[4]), op: h[1], b });
}
const created = new Map<string, number>();   // "entry:low" -> first CreateObject time
const createdType = new Map<number, string>();
for (const p of readFileSync(updFile, "utf8").split(/\r?\n(?=ServerToClient: )/)) {
  const tm = p.match(/Time: [\d/]+ (\d+):(\d+):([\d.]+)/); if (!tm) continue;
  for (const m of p.matchAll(/UpdateType: CreateObject\d\r?\n\[\d+\] Object Guid: Full: \S+ (\w+)\/0 \S+ Map: 860 Entry: (\d+) Low: (\d+)/g)) {
    createdType.set(+m[2], m[1]);
    const k = `${m[2]}:${m[3]}`; if (!created.has(k)) created.set(k, toS(tm[1], tm[2], tm[3]));
  }
}
const unitOf = (s?: string) => s?.match(/Entry: (\d+) Low: (\d+)/);
type Chat = { t: number; n: number; entry: number; low: string; type: number; lang: number; text: string };
type Cast = { t: number; n: number; entry: number; low: string; spell: number; atPlayer: boolean };
const chatTypes: Record<string, number> = { MonsterSay: 12, MonsterYell: 14, MonsterEmote: 16, MonsterWhisper: 15, RaidBossEmote: 41, RaidBossWhisper: 42 };
const chats: Chat[] = [], casts: Cast[] = [];
for (const e of events) {
  if (e.op === "SMSG_CHAT") {
    const u = unitOf(e.b.match(/SenderGUID: (.*)/)?.[1]); const c = e.b.match(/SlashCmd: \d+ \((\w+)\)/)?.[1];
    if (!u || !c || !(c in chatTypes)) continue;
    chats.push({ t: e.t, n: e.n, entry: +u[1], low: u[2], type: chatTypes[c], lang: +(e.b.match(/Language: (\d+)/)?.[1] ?? 0), text: e.b.match(/Text: (.*)/)?.[1] ?? "" });
  } else if (e.op === "SMSG_SPELL_GO") {
    const u = unitOf(e.b.match(/\(Cast\) CasterUnit: (.*)/)?.[1]); if (!u) continue;
    casts.push({ t: e.t, n: e.n, entry: +u[1], low: u[2], spell: +(e.b.match(/\(Cast\) SpellID: (\d+)/)?.[1] ?? 0), atPlayer: /HitTarget: .*Player\//.test(e.b) || /\(Target\) Unit: .*Player\//.test(e.b) });
  }
}
// Monster splines (escort paths): start position, points, duration
type Move = { t: number; entry: number; low: string; from: number[]; pts: number[][]; ms: number; v: number };
const moves: Move[] = [];
for (const e of events) {
  if (e.op !== "SMSG_ON_MONSTER_MOVE") continue;
  const u = unitOf(e.b.match(/^MoverGUID: (.*)$/m)?.[1]); const from = e.b.match(/^Position: X: (\S+) Y: (\S+) Z: (\S+)/m);
  if (!u || !from) continue;
  const pts = [...e.b.matchAll(/\] (?:Points|WayPoints): X: (\S+) Y: (\S+) Z: (\S+)/g)].map(p => [+p[1], +p[2], +p[3]]);
  moves.push({ t: e.t, entry: +u[1], low: u[2], from: [+from[1], +from[2], +from[3]], pts, ms: +(e.b.match(/\(MovementSpline\) MoveTime: (\d+)/)?.[1] ?? 0), v: +(e.b.match(/Computed Speed: ([\d.]+)/)?.[1] ?? 0) });
}
const waypointPaths: Row[] = [], waypointNodes: Row[] = [];
const atEvents = events.filter(e => e.op === "CMSG_AREA_TRIGGER").map(e => ({ t: e.t, n: e.n, id: +e.b.match(/AreaTriggerID: (\d+)/)![1], enter: /Entered: True/.test(e.b) }));
log(`sniff: ${events.length} packets, ${chats.length} creature chats, ${casts.length} creature casts, ${created.size} creatures created`);

// ---- creature_text: every distinct line of the actors, one group per line in sniff order ------------------------------------
const texts = new Map<number, { text: string; type: number; lang: number; n: number }[]>();
const groupOf = (entry: number, text: string) => {
  const list = texts.get(entry) ?? texts.set(entry, []).get(entry)!;
  let i = list.findIndex(x => x.text === text);
  if (i < 0) { const c = chats.find(x => x.entry === entry && x.text === text)!; list.push({ text, type: c.type, lang: c.lang, n: c.n }); i = list.length - 1; }
  return i;
};

// ---- SmartAI builders ------------------------------------------------------------------------------------------------
const smart: Row[] = [], conditions: Row[] = [], updates: object[] = [], atScripts: Row[] = [];
const sai = (r: Partial<Record<string, string | number>>): Row => ({
  entryorguid: 0, source_type: 0, id: 0, link: 0, Difficulties: "", event_type: 0, event_phase_mask: 0, event_chance: 100, event_flags: 0,
  event_param1: 0, event_param2: 0, event_param3: 0, event_param4: 0, event_param5: 0, event_param_string: "",
  action_type: 0, action_param1: 0, action_param2: 0, action_param3: 0, action_param4: 0, action_param5: 0, action_param6: 0, action_param7: 0, action_param_string: "",
  target_type: 0, target_param1: 0, target_param2: 0, target_param3: 0, target_param4: 0, target_param_string: "",
  target_x: 0, target_y: 0, target_z: 0, target_o: 0, comment: "", ...r,
} as Row);
const smartAi = new Set<number>();
const TRIGGERED = 2;
type Step = { at: number; row: Partial<Record<string, string | number>> };

// One timed action list per actor instance, anchored at its creation (or at a trigger time), delays from the sniff.
function actionList(listId: number, steps: Step[], what: string) {
  steps.sort((a, b) => a.at - b.at);
  let prev = 0;
  steps.forEach((s, i) => {
    const delay = Math.max(0, Math.round((s.at - prev) * 1000)); prev = s.at;
    smart.push(sai({ entryorguid: listId, source_type: 9, id: i, event_param1: delay, event_param2: delay, ...s.row, comment: `${what} - step ${i} (+${s.at.toFixed(1)} s)` }));
  });
}
function sceneSteps(anchorTime: number, until: number, actors: number[], castIds: number[], self: number, lowOf: Map<number, string>) {
  const steps: Step[] = [];
  for (const c of chats) {
    if (!actors.includes(c.entry) || c.t < anchorTime - 0.5 || c.t > until || (lowOf.has(c.entry) && lowOf.get(c.entry) !== c.low)) continue;
    const g = groupOf(c.entry, c.text);
    steps.push({ at: Math.max(0, c.t - anchorTime), row: c.entry === self
      ? { action_type: 1, action_param1: g, target_type: 7, comment: "" }
      : { action_type: 1, action_param1: g, target_type: 19, target_param1: c.entry, target_param2: 100 } });
  }
  for (const c of casts) {
    if (c.entry !== self || !castIds.includes(c.spell) || c.t < anchorTime - 0.5 || c.t > until || (lowOf.has(self) && lowOf.get(self) !== c.low)) continue;
    if (!spellIds.has(c.spell)) { log(`spell ${c.spell} not in SpellName.db2, skipped`); continue; }
    steps.push({ at: Math.max(0, c.t - anchorTime), row: { action_type: 11, action_param1: c.spell, action_param2: TRIGGERED, target_type: c.atPlayer ? 7 : 1 } });
  }
  return steps;
}
type Scene = { anchor: number; quest: string; members?: number[]; casts?: number[]; follow?: boolean; path?: boolean; window: number; extra?: Step[]; firstTextOnly?: boolean };
// One waypoint path per escort from its sniffed splines; pauses between splines become node delays
function sniffPath(entry: number, low: string, quest: string): { id: number; start: number } | undefined {
  const list = moves.filter(m => m.entry === entry && m.low === low && m.pts.length);
  if (!list.length) return undefined;
  const id = entry * 100 + 90, nodes: { p: number[]; delay: number }[] = [];
  list.forEach((m, i) => {
    for (const p of m.pts) {
      const last = nodes[nodes.length - 1]?.p;
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) >= 1.5) nodes.push({ p, delay: 0 });
    }
    const next = list[i + 1];
    if (next && nodes.length) nodes[nodes.length - 1].delay = Math.max(0, Math.round((next.t - (m.t + m.ms / 1000)) * 1000));
  });
  const v = list.map(m => m.v).filter(Boolean).sort((a, b) => a - b)[Math.floor(list.length / 2)] ?? 0;
  waypointPaths.push({ PathId: id, MoveType: v > 5 ? 1 : 0, Flags: 0, Velocity: null, Comment: `${quest} (${entry}) from sniff m2 splines` });
  nodes.forEach((n, i) => waypointNodes.push({ PathId: id, NodeId: i, PositionX: +n.p[0].toFixed(3), PositionY: +n.p[1].toFixed(3), PositionZ: +n.p[2].toFixed(3), Orientation: 0, Delay: n.delay < 500 ? 0 : n.delay }));
  return { id, start: list[0].t };
}
function summonedScene(s: Scene) {
  // The instance with the most sniffed lines/casts is the one the player interacted with
  const score = (low: string) => chats.filter(c => c.entry === s.anchor && c.low === low).length + casts.filter(c => c.entry === s.anchor && c.low === low).length
    + moves.filter(m => m.entry === s.anchor && m.low === low).length;
  const inst = [...created].filter(([k]) => k.startsWith(`${s.anchor}:`)).sort((a, b) => score(b[0].split(":")[1]) - score(a[0].split(":")[1]) || a[1] - b[1])[0];
  if (!inst) { log(`scene ${s.anchor}: no CreateObject in the sniff`); return; }
  const [key, t0] = inst; const low = key.split(":")[1];
  const lowOf = new Map([[s.anchor, low]]);
  let steps = sceneSteps(t0, t0 + s.window, [s.anchor, ...(s.members ?? [])], s.casts ?? [], s.anchor, lowOf);
  if (s.firstTextOnly) steps = steps.filter((x, i, a) => x.row.action_type !== 1 || a.findIndex(y => y.row.action_type === 1) === i);
  steps.push(...(s.extra ?? []));
  if (s.path) {
    const p = sniffPath(s.anchor, low, s.quest);
    if (p) steps.push({ at: Math.max(0, p.start - t0), row: { action_type: 53, action_param1: 1, action_param2: p.id, target_type: 1 } });
    else log(`scene ${s.anchor}: no splines for a path`);
  }
  const listId = s.anchor * 100 + 50;
  if (steps.length) smart.push(sai({ entryorguid: s.anchor, source_type: 0, id: 100, event_type: 54, action_type: 80, action_param1: listId, action_param2: 2, target_type: 1,
    comment: `${s.quest}: on summon run the sniffed timeline` }));
  if (s.follow) smart.push(sai({ entryorguid: s.anchor, source_type: 0, id: 101, event_type: 54, action_type: 29, action_param1: 2, target_type: 7, comment: `${s.quest}: follow the summoner` }));
  if (steps.length) actionList(listId, steps, `${s.quest} (${s.anchor})`);
  smartAi.add(s.anchor);
}
function atRule(at: number, enter: boolean, quest: number, condType: number, comment: string, actions: Partial<Record<string, string | number>>[], extraCond: [number, number][] = []) {
  const base = smart.filter(r => r.entryorguid === at && r.source_type === 2).length;
  actions.forEach((a, i) => {
    const id = base + i;
    smart.push(sai({ entryorguid: at, source_type: 2, id, event_type: enter ? 46 : 88, ...a, comment: `${comment} - ${i}` }));
    for (const [ct, v] of [[condType, quest] as [number, number], ...extraCond])
      conditions.push({ SourceTypeOrReferenceId: 22, SourceGroup: id + 1, SourceEntry: at, SourceId: 2, ElseGroup: 0, ConditionTypeOrReference: ct, ConditionTarget: 0,
        ConditionValue1: v, ConditionValue2: 0, ConditionValue3: 0, ConditionStringValue1: "", NegativeCondition: 0, ErrorType: 0, ErrorTextId: 0, ScriptName: "", Comment: `${comment}: quest ${v}` });
  });
  if (!atScripts.some(r => r.entry === at)) atScripts.push({ entry: at, ScriptName: "SmartTrigger" });
}
const CQ_TAKEN = 9, CQ_REWARDED = 8;
const firstAt = (id: number, enter = true) => atEvents.find(a => a.id === id && a.enter === enter);
const textAt = (entry: number, after: number) => { const c = chats.find(x => x.entry === entry && x.t >= after - 0.5); return c ? groupOf(entry, c.text) : -1; };

// ---- scenes (each comment names the sniff evidence) ------------------------------------------------------------------
// 29422/29423: Huo follows the player to the temple (128700 from quest 29423, m2 #6496)
summonedScene({ anchor: 54958, quest: "29423 Huo", follow: true, window: 0 });
// AT 7835 (temple, m2 #8071): 118499 + 118500 summon the welcome actors, 105090 credits 61128; Shang Xi greets Huo
{
  const at = firstAt(7835)!;
  atRule(7835, true, 29423, CQ_TAKEN, "29423 temple of five dawns", [
    { action_type: 134, action_param1: 118499, action_param2: TRIGGERED, target_type: 7 },
    { action_type: 134, action_param1: 118500, action_param2: TRIGGERED, target_type: 7 },
    { action_type: 134, action_param1: 105090, action_param2: TRIGGERED, target_type: 7 },
    { action_type: 1, action_param1: textAt(54786, at.t), target_type: 19, target_param1: 54786, target_param2: 60 },
  ]);
  const out = firstAt(7835, false)!;
  atRule(7835, false, 29423, CQ_REWARDED, "29423 temple exit", [{ action_type: 1, action_param1: textAt(54786, out.t), target_type: 19, target_param1: 54786, target_param2: 60 }], [[CQ_TAKEN, 29521]]);
}
// AT 7784 (bridge, m2 #8321): 116190 (+116191) summon Cai and Deng, who chat for 36 s
atRule(7784, true, 29521, CQ_TAKEN, "29521 bridge kids", [{ action_type: 134, action_param1: 116190, action_param2: TRIGGERED, target_type: 7 }]);
summonedScene({ anchor: 60250, quest: "29521 Cai and Deng", members: [60249], window: 40 });
// AT 7783 (Shu's pool, m2 #16948): 108590 credits 57476
atRule(7783, true, 29678, CQ_TAKEN, "29678 Shu found", [{ action_type: 134, action_param1: 108590, action_param2: TRIGGERED, target_type: 7 }]);
// 29679: Shu (55213) follows after the last spout (103538, m2 #17850)
summonedScene({ anchor: 55213, quest: "29679 Shu", follow: true, window: 0 });
// 29774: Wugou (55558, from gossip spell 104017) wakes up and credits 55547 after 14 s (m2 #28922-#29145)
summonedScene({ anchor: 55558, quest: "29774 Wugou", casts: [105890, 118027, 118034, 104023, 118035], follow: true, window: 20 });
summonedScene({ anchor: 60916, quest: "29774 Shu", follow: true, window: 0 });
// 29776: Ji waits at the upper ledge (m2 #30997)
summonedScene({ anchor: 55694, quest: "29776 Ji", path: true, window: 25, firstTextOnly: true });
// 29779-29781: the Huojin monk (65558, spell_area 105306 in area 5831) fights alongside
summonedScene({ anchor: 65558, quest: "29779 Huojin Monk", follow: true, window: 2, firstTextOnly: true });
// AT 7041/7042/7037 (Dafeng's cove, m2 #48560-#49452)
{
  const a1 = firstAt(7041)!, a2 = firstAt(7042)!;
  atRule(7041, true, 29785, CQ_TAKEN, "29785 wind gust warning", [
    { action_type: 1, action_param1: textAt(55744, a1.t), target_type: 19, target_param1: 55744, target_param2: 60 },
    { action_type: 86, action_param1: 104593, action_param2: TRIGGERED, action_param3: 19, action_param4: 55665, action_param5: 60, target_type: 7 },
  ]);
  atRule(7042, true, 29785, CQ_TAKEN, "29785 second gust", [
    { action_type: 1, action_param1: textAt(55744, a2.t), target_type: 19, target_param1: 55744, target_param2: 60 },
    { action_type: 86, action_param1: 104614, action_param2: TRIGGERED, action_param3: 19, action_param4: 55665, action_param5: 60, target_type: 7 },
  ]);
  // TODO(verify): 104616 has no credit effect; the 55666 credit arrives in the same packet burst (m2 #49455-#49457)
  atRule(7037, true, 29785, CQ_TAKEN, "29785 Dafeng found", [
    { action_type: 86, action_param1: 104616, action_param2: TRIGGERED, action_param3: 19, action_param4: 55592, action_param5: 60, target_type: 7 },
    { action_type: 33, action_param1: 55666, target_type: 7 },
  ]);
}
// 29787: Master Shang Xi (56159, from 105333) walks with the player (m2 #51546)
summonedScene({ anchor: 56159, quest: "29787 Master Shang Xi", path: true, window: 2 });
// 29790: Master Shang Xi's last lesson (56686, from 106623): five lines, credit 106625 at +82 s (m2 #55917-#56901)
summonedScene({ anchor: 56686, quest: "29790 Passing Wisdom", casts: [56913, 128850, 128851, 109336, 106625], window: 90 });
// 29791: balloon dialogue of Aysa (56661), Ji (56660) and Shen-zin Su (56676), anchored at Aysa's summon (m2 #57297-#58276)
summonedScene({ anchor: 56661, quest: "29791 balloon", members: [56660, 56676], window: 230 });
// AT 7710 (m2 #59356): 115332/115335/115337 summon Aysa, Ji and Jojo; 59986 credits 59946 (115442)
atRule(7710, true, 29792, CQ_TAKEN, "29792 friends join", [
  { action_type: 134, action_param1: 115332, action_param2: TRIGGERED, target_type: 7 },
  { action_type: 134, action_param1: 115335, action_param2: TRIGGERED, target_type: 7 },
  { action_type: 134, action_param1: 115337, action_param2: TRIGGERED, target_type: 7 },
]);
{
  const gate = firstAt(7709)!;
  summonedScene({ anchor: 59986, quest: "29792 Aysa", casts: [115442], path: true, window: gate.t - (created.get([...created.keys()].find(k => k.startsWith("59986:"))!) ?? gate.t) - 1 });
  summonedScene({ anchor: 59988, quest: "29792 Ji", path: true, window: 0 });
  summonedScene({ anchor: 59989, quest: "29792 Jojo", path: true, window: 0 });
  // AT 7709 (gate, m2 #59707): the jammed gate dialogue, Jojo breaks it and credits 59947 (115443)
  const end = firstAt(7981)?.t ?? gate.t + 40;
  const steps = sceneSteps(gate.t, end + 2, [59986, 59988, 59989], [115443], 59989, new Map());
  actionList(59989 * 100 + 51, steps, "29792 gate");
  atRule(7709, true, 29792, CQ_TAKEN, "29792 jammed gate", [{ action_type: 80, action_param1: 59989 * 100 + 51, action_param2: 2, target_type: 19, target_param1: 59989, target_param2: 60 }]);
}
// 30589: Ji (60900, from 117973) leads to the engineer (m2 #64995)
summonedScene({ anchor: 60900, quest: "30589 Ji", path: true, window: 2 });
// 30767: Aysa (56416) starts the scene on accept (117499 -> 117497, m2 #80958)
smart.push(sai({ entryorguid: 56416, source_type: 0, id: 100, event_type: 19, event_param1: 30767, action_type: 11, action_param1: 117499, action_param2: TRIGGERED, target_type: 7,
  comment: "30767 Risking It All: Aysa sends the player after Ji" }));
smartAi.add(56416);
summonedScene({ anchor: 60729, quest: "30767 Aysa", casts: [117600], path: true, window: 70 });
{
  const jiCast = casts.find(c => c.entry === 60741 && c.spell === 117610)!;
  const ji0 = created.get([...created.keys()].find(k => k.startsWith("60741:"))!)!;
  const off = jiCast.t - ji0;
  // 117610 roots the player (106037); the ship movie 117 starts 2 s later and 117615 credits 60727 and teleports (m2 #81449, #81568)
  summonedScene({ anchor: 60741, quest: "30767 Ji", casts: [117610], window: off + 1, extra: [
    { at: off + 2.0, row: { action_type: 68, action_param1: 117, target_type: 7 } },
    { at: off + 4.1, row: { action_type: 86, action_param1: 117615, action_param2: TRIGGERED, action_param3: 7, target_type: 7 } },
  ] });
}
// 29791: the parked balloon (55918) hands the rider over to the flying one (128815 -> 105002, m2 #57196)
smart.push(sai({ entryorguid: 55918, source_type: 0, id: 100, event_type: 27, action_type: 11, action_param1: 128815, action_param2: TRIGGERED, target_type: 7,
  comment: "29791: summon the flying balloon for the rider" }));
smartAi.add(55918);

// ---- rows ------------------------------------------------------------------------------------------------------------
const creatureText: Row[] = [];
for (const [entry, list] of texts) list.forEach((t, g) => creatureText.push({ CreatureID: entry, GroupID: g, ID: 0, Text: t.text, Type: t.type, Language: t.lang, Probability: 100,
  Emote: 0, Duration: 0, Sound: 0, SoundPlayType: 0, BroadcastTextId: 0, TextRange: entry === 56676 ? 1 : 0, comment: `sniff m2 #${t.n}` }));
// 29794: the three thank-you lines of the rescued sailor (56236, m2 #72978-#74119) form one random group
{
  const lines = [...new Set(chats.filter(c => c.entry === 56236).map(c => c.text))];
  lines.forEach((t, i) => creatureText.push({ CreatureID: 56236, GroupID: 0, ID: i, Text: t, Type: 12, Language: 0, Probability: 100, Emote: 0, Duration: 0, Sound: 0,
    SoundPlayType: 0, BroadcastTextId: 0, TextRange: 0, comment: "sniff m2 AT 7087" }));
}
const clicks: [number, number, number, string][] = [
  [54993, 102717, 1, "#11428"], [57431, 102717, 1, "#11386"], [55083, 102717, 1, "#11662"], [55918, 56685, 1, "#57194"],
  [55999, 105520, 3, "#72470 (clicker becomes the vehicle carrying 56236)"], [64507, 125961, 1, "#49847"],
];
const spellclick = clicks.map(([npc, spell, flags, src]) => ({ npc_entry: npc, spell_id: spell, cast_flags: flags, user_type: 0, _source: `sniff m2 ${src}` }));
for (const c of clicks) if (!spellIds.has(c[1])) throw new Error(`spellclick spell ${c[1]} not in SpellName.db2`);
// 104855/125969 hit the nearby entry: Zhao-Ren
for (const s of [104855, 125969]) conditions.push({ SourceTypeOrReferenceId: 13, SourceGroup: 1, SourceEntry: s, SourceId: 0, ElseGroup: 0, ConditionTypeOrReference: 31, ConditionTarget: 0,
  ConditionValue1: 3, ConditionValue2: 55786, ConditionValue3: 0, ConditionStringValue1: "", NegativeCondition: 0, ErrorType: 0, ErrorTextId: 0, ScriptName: "", Comment: "29786 fireworks hit Zhao-Ren" });
atScripts.push({ entry: 7087, ScriptName: "at_none_left_behind" });

const scriptNames: [number, string][] = [[65493, "npc_shu_water_spouts"], [60488, "npc_water_spout_bunny"], [55556, "npc_shu_wake_wugou"], [55786, "boss_zhao_ren"],
  [55649, "npc_shang_xi_hot_air_balloon"], [55685, "npc_uplifting_draft"], [55999, "npc_injured_sailor"]];
for (const [entry, name] of scriptNames) updates.push({ table: "creature_template", where: { entry }, set: { AIName: "", ScriptName: name }, source: "zone_the_wandering_isle.cpp" });
for (const entry of smartAi) updates.push({ table: "creature_template", where: { entry }, set: { AIName: "SmartAI", ScriptName: "" }, source: "SmartAI timeline from sniff m2" });
// Vehicle kits from the sniff (CreateObject VehicleRecID)
for (const [entry, id] of [[55649, 1820], [55685, 1800]] as const) {
  if (!vehicleIds.has(id)) throw new Error(`vehicle ${id} not in Vehicle.db2`);
  updates.push({ table: "creature_template", where: { entry }, set: { VehicleId: id }, source: "sniff m2 CreateObject VehicleRecID" });
}

// Entries the sniff shows on map 860 that the world import does not spawn (summons, vehicles, controllers)
const spawned = new Set(q("SELECT DISTINCT id FROM world.creature WHERE map=860").map(r => +r[0]));
const spawnedGo = new Set(q("SELECT DISTINCT id FROM world.gameobject WHERE map=860").map(r => +r[0]));
const seen = [...new Set([...created.keys()].map(k => +k.split(":")[0]))];
const extraCreatures = seen.filter(e => ["Creature", "Vehicle"].includes(createdType.get(e)!) && !spawned.has(e)).sort((a, b) => a - b);
const extraGameObjects = seen.filter(e => createdType.get(e) === "GameObject" && !spawnedGo.has(e)).sort((a, b) => a - b);
const masterHas = new Set(q(`SELECT entry FROM ref_master.creature_template WHERE entry IN (${extraCreatures.join(",")})`).map(r => +r[0]));
for (const e of extraCreatures) if (!masterHas.has(e)) log(`sniff creature ${e}: no master template`);

const json = {
  generated_by: "tools/mop-content/gen_wandering_isle_script.ts",
  sources: ["retail sniff m2.pkt (5.5.4.70449)", "client DB2 5.5.4 (SpellName, Vehicle)", "ref_master (template presence)"],
  extra_creature_entries: extraCreatures.filter(e => masterHas.has(e)),
  extra_gameobject_entries: extraGameObjects,
  rows: {
    creature_text: creatureText,
    smart_scripts: smart,
    conditions,
    areatrigger_scripts: atScripts,
    npc_spellclick_spells: spellclick,
    spell_script_names: [
      { spell_id: 102522, ScriptName: "spell_huo_offering" }, { spell_id: 125961, ScriptName: "spell_firework_launcher_click" },
      { spell_id: 117783, ScriptName: "spell_healing_shen_zin_su_bar" },
    ],
    vehicle_template_accessory: [56660, 65476, 65477].map((a, i) => ({ entry: 55649, accessory_entry: a, seat_id: i + 2, minion: 1, description: "29791 balloon (sniff m2 TransportEnter)", summontype: 8, summontimer: 0, RideSpellID: null })),
    waypoint_path: waypointPaths,
    waypoint_path_node: waypointNodes,
    spell_target_position: [{ ID: 117615, EffectIndex: 1, OrderIndex: 0, MapID: 860, PositionX: 250.757, PositionY: 3932.67, PositionZ: 66.408, Orientation: 0.9166365, VerifiedBuild: 70449, _source: "sniff m2 #81566 MOVE_TELEPORT" }],
  },
  updates,
  quest_source_spells_from_sniff: { 29423: 128700, 29776: 104396, 29784: 116992, 29786: 126043, 29787: 105333, 29790: 106623, 30589: 117973 },
  notes: "Second half of the Wandering Isle. Quest SourceSpellIDs (PlayerCastOnAccept, first player cast after accept in m2) are listed for the quest-data owner, not applied here. BroadcastTextId 0: fork A matches broadcast texts.",
};
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(json, null, 1) + "\n");
log(`wrote ${outFile}: ${creatureText.length} texts, ${smart.length} SmartAI rows, ${conditions.length} conditions, ${extraCreatures.length} extra entries`);
