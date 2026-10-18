// Generates the Wandering Isle (map 860) audit fixes on top of 2026_10_18_02 (gen_wandering_isle.ts) and the 2026_10_19 health files:
// gaps found by replaying the retail 5.5.4.70449 sniffs against the live world DB (docs/mop-port/wandering-isle-sniff-diff.md, "Audit").
// usage: bun tools/mop-content/gen_wandering_isle_audit.ts <db2 dir> [world.sql] [hotfixes.sql] [mysql container]
// Inputs: data/wandering_isle_audit.json (sniff_wandering_isle_audit.ts), the world DB, ref_master (TC master TDB 1210), ref_sfdb (SkyFire 5.4.8).
import { readFileSync, writeFileSync } from "node:fs";
import { readDb2 } from "./src/db2.ts";

const [db2Dir, outFile = "sql/updates/world/mop_classic/2026_10_19_10_world.sql", hotfixFile = "sql/updates/hotfixes/mop_classic/2026_10_19_10_hotfixes.sql",
  container = "tc-mop-db-1"] = process.argv.slice(2);
if (!db2Dir) throw new Error("usage: gen_wandering_isle_audit.ts <db2 dir> [world.sql] [hotfixes.sql] [container]");
const root = (p: string) => new URL(`../../${p}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const DBD = root("tools/mop-re/refs/wowdbdefs/definitions/");
const db2 = (name: string) => readDb2(`${db2Dir}/${name}.db2`, `${DBD}${name}.dbd`).rows;
const SNIFF = JSON.parse(readFileSync(root("tools/mop-content/data/wandering_isle_audit.json"), "utf8"));
const cpp = readFileSync(root("src/server/scripts/Pandaria/zone_the_wandering_isle.cpp"), "utf8");
const log = (s: string) => console.error(s);
const MAP = 860;

type Row = Record<string, string | null>;
function q(sql: string): Row[] {
  const r = Bun.spawnSync(["docker", "exec", "-i", container, "mysql", "-uroot", "-proot", "-B", "--default-character-set=utf8mb4"], { stdin: Buffer.from(sql) });
  if (r.exitCode !== 0) throw new Error(`${sql.slice(0, 400)}\n${r.stderr.toString()}`);
  const lines = r.stdout.toString().split("\n").filter(l => l.length);
  if (!lines.length) return [];
  const head = lines[0].split("\t");
  const unesc = (s: string) => s.replace(/\\(.)/g, (_, c) => (c === "n" ? "\n" : c === "t" ? "\t" : c === "0" ? "\0" : c));
  return lines.slice(1).map(l => { const v = l.split("\t"), o: Row = {}; head.forEach((h, i) => { o[h] = v[i] === "NULL" ? null : unesc(v[i]); }); return o; });
}
const list = (xs: Iterable<number | string>) => { const a = [...new Set(xs)]; return a.length ? a.join(",") : "NULL"; };
const n = (v: string | null | undefined) => Number(v ?? 0);
const colInfo = new Map<string, { name: string; numeric: boolean }[]>();
for (const r of q(`SELECT TABLE_SCHEMA s, TABLE_NAME t, COLUMN_NAME c, DATA_TYPE d FROM information_schema.columns WHERE TABLE_SCHEMA IN ('world','hotfixes') ORDER BY TABLE_NAME, ORDINAL_POSITION`)) {
  const k = `${r.s}.${r.t}`; (colInfo.get(k) ?? colInfo.set(k, []).get(k)!).push({ name: r.c!, numeric: /int|float|double|decimal/.test(r.d!) });
}
const sqlLit = (v: unknown) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`);

const out: string[] = [], hot: string[] = [], summary: string[] = [];
function emit(table: string, rows: Row[], del: string, note: string, db = "world", sink = out) {
  const cols = colInfo.get(`${db}.${table}`);
  if (!cols) throw new Error(`${db} has no table ${table}`);
  summary.push(`${table}: ${rows.length}`);
  sink.push(`-- ${table}: ${note} (${rows.length} rows)`);
  if (del) sink.push(`DELETE FROM \`${table}\` WHERE ${del};`);
  if (!rows.length) { sink.push(""); return; }
  const use = cols.filter(c => rows.some(r => c.name in r));
  const lit = (c: { numeric: boolean }, v: string | null | undefined) =>
    v === undefined ? "DEFAULT" : v === null ? "NULL" : c.numeric ? (/^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(v) ? v : String(Number(v))) : sqlLit(v);
  for (let i = 0; i < rows.length; i += 500) {
    sink.push(`INSERT INTO \`${table}\` (${use.map(c => `\`${c.name}\``).join(",")}) VALUES`);
    sink.push(rows.slice(i, i + 500).map(r => `(${use.map(c => lit(c, r[c.name])).join(",")})`).join(",\n") + ";");
  }
  sink.push("");
}
function update(table: string, set: Record<string, unknown>, where: Record<string, unknown>, note = "") {
  out.push(`UPDATE \`${table}\` SET ${Object.entries(set).map(([k, v]) => `\`${k}\`=${sqlLit(v)}`).join(", ")} WHERE ${Object.entries(where).map(([k, v]) => `\`${k}\`=${sqlLit(v)}`).join(" AND ")};${note ? ` -- ${note}` : ""}`);
}

// ---- client data and island scope ------------------------------------------------------------------------------
const spellNames = new Set(db2("SpellName").map(r => r.ID as number));
const items = new Set(db2("Item").map(r => r.ID as number));
const emotes = new Set(db2("Emotes").map(r => r.ID as number));
const effects = db2("SpellEffect");
const effBy = new Map<number, typeof effects>();
for (const e of effects) effBy.set(e.SpellID as number, [...(effBy.get(e.SpellID as number) ?? []), e]);
type Sniffed = { g: string; tag: string; e: number; type: string; p: number[]; o: number; summoned: boolean; level: number; maxHealth: number; healthPct: number;
  walk: number | null; run: number | null; npcflag: number; faction: number; emote: number; stand: number; sheath: number; animTier: number };
const sniffed = SNIFF.creatures as Sniffed[];
const spawns = q(`SELECT c.guid, c.id, c.position_x x, c.position_y y, c.position_z z, c.MovementType mt, c.curHealthPct hp, a.guid aguid, IFNULL(a.PathId,0) path
  FROM world.creature c LEFT JOIN world.creature_addon a ON a.guid=c.guid WHERE c.map=${MAP}`);
const islandEntries = new Set([...spawns.map(r => n(r.id)), ...sniffed.map(c => c.e)]);
const tmpl = new Map(q(`SELECT entry, name, AIName, ScriptName, speed_walk, speed_run, npcflag, faction FROM world.creature_template WHERE entry IN (${list(islandEntries)})`).map(r => [n(r.entry), r]));
const spawnsOf = new Map<number, Row[]>(); for (const s of spawns) spawnsOf.set(n(s.id), [...(spawnsOf.get(n(s.id)) ?? []), s]);
const d2 = (a: number[], s: Row) => Math.hypot(a[0] - n(s.x), a[1] - n(s.y));
const mode = <T,>(xs: T[]) => { const m = new Map<string, [T, number]>(); for (const x of xs) { const k = JSON.stringify(x); m.set(k, [x, (m.get(k)?.[1] ?? 0) + 1]); } return [...m.values()].sort((a, b) => b[1] - a[1])[0]; };

// Spells the island uses: SmartAI, spellclick, quests, script constants, island quest items, and what they trigger.
const islandSpells = new Set<number>();
{
  const sai = q(`SELECT action_type a, action_param1 p, event_type e, event_param1 ep FROM world.smart_scripts WHERE (source_type=0 AND entryorguid IN (${list(islandEntries)}))
    OR (source_type=0 AND entryorguid<0 AND -entryorguid IN (SELECT guid FROM world.creature WHERE map=${MAP})) OR (source_type=1 AND entryorguid IN (SELECT id FROM world.gameobject WHERE map=${MAP}))
    OR source_type=2 OR (source_type=9 AND entryorguid DIV 100 IN (${list(islandEntries)}))`);
  for (const r of sai) { if ([11, 85, 86, 134, 75].includes(n(r.a))) islandSpells.add(n(r.p)); if ([8, 31].includes(n(r.e))) islandSpells.add(n(r.ep)); }
  for (const r of q(`SELECT spell_id s FROM world.npc_spellclick_spells WHERE npc_entry IN (${list(islandEntries)})`)) islandSpells.add(n(r.s));
  for (const m of cpp.matchAll(/\bSPELL_\w+\s*=\s*(\d{4,7})\b/g)) islandSpells.add(+m[1]);
  const quests = q(`SELECT ID, StartItem FROM world.quest_template WHERE QuestSortID=5736`);
  for (const r of q(`SELECT SourceSpellID s FROM world.quest_template_addon WHERE ID IN (${list(quests.map(r => n(r.ID)))})`)) islandSpells.add(n(r.s));
  const qItems = new Set([...quests.map(r => n(r.StartItem)), ...q(`SELECT ObjectID FROM world.quest_objectives WHERE Type=1 AND QuestID IN (${list(quests.map(r => n(r.ID)))})`).map(r => n(r.ObjectID))]);
  for (const e of db2("ItemEffect")) if (qItems.has(e.ParentItemID as number)) islandSpells.add(e.SpellID as number);
  const todo = [...islandSpells];
  while (todo.length) for (const e of effBy.get(todo.pop()!) ?? []) if (e.EffectTriggerSpell && !islandSpells.has(e.EffectTriggerSpell as number)) { islandSpells.add(e.EffectTriggerSpell as number); todo.push(e.EffectTriggerSpell as number); }
  islandSpells.delete(0);
}
log(`island spells: ${islandSpells.size}`);

// ---- 1. spell implicit-target conditions master has (gen_wandering_isle.ts only exported gossip/quest/phase/SAI ones) --------
{
  const keys = `(SourceTypeOrReferenceId,SourceGroup,SourceEntry,SourceId,ElseGroup,ConditionTypeOrReference,ConditionTarget,ConditionValue1,ConditionValue2,ConditionValue3)`;
  const master = q(`SELECT * FROM ref_master.conditions WHERE SourceTypeOrReferenceId=13 AND SourceEntry IN (${list(islandSpells)})
    AND ${keys} NOT IN (SELECT ${keys.slice(1, -1)} FROM world.conditions WHERE SourceTypeOrReferenceId=13)`);
  // Sniff m1 (Cave of Meditation): Aysa's 114710 makes only the player cast 114698 (two SPELL_GO by the player per cast).
  const sniffRows: Row[] = [{ SourceTypeOrReferenceId: "13", SourceGroup: "3", SourceEntry: "114710", SourceId: "0", ElseGroup: "0", ConditionTypeOrReference: "51",
    ConditionTarget: "0", ConditionValue1: "6", ConditionValue2: "0", ConditionValue3: "0", NegativeCondition: "0", Comment: "Summon Amberleaf Troublemaker Force Cast - players only (sniff m1)" }];
  const rows = [...master, ...sniffRows];
  emit("conditions", rows, `SourceTypeOrReferenceId=13 AND SourceEntry IN (${list(rows.map(r => n(r.SourceEntry)))})`, "ref_master spell target conditions world lacks; 114710 from the sniff");
}

// ---- 2. guid SmartAI master has on island spawns whose template was kept from world (generator skipped them) -------------
{
  const OFFSET = 9_000_000;
  const rows = q(`SELECT s.* FROM ref_master.smart_scripts s JOIN ref_master.creature c ON c.guid=-s.entryorguid AND c.map=${MAP}
    WHERE s.source_type=0 AND s.entryorguid<0 AND NOT EXISTS (SELECT 1 FROM world.smart_scripts w WHERE w.source_type=0 AND w.entryorguid=s.entryorguid-${OFFSET})`)
    .map(r => ({ ...r, entryorguid: String(n(r.entryorguid) - OFFSET) }));
  const entries = q(`SELECT DISTINCT c.id FROM ref_master.creature c WHERE c.guid IN (${list(rows.map(r => -n(r.entryorguid) - OFFSET))})`).map(r => n(r.id));
  emit("smart_scripts", rows, rows.length ? `source_type=0 AND entryorguid IN (${list(rows.map(r => r.entryorguid!))})` : "0", "ref_master guid scripts of world-kept entries (guid + 9000000)");
  for (const e of entries) if (!tmpl.get(e)?.AIName && !tmpl.get(e)?.ScriptName) update("creature_template", { AIName: "SmartAI" }, { entry: e }, "as ref_master: guid SmartAI needs it");
  out.push("");
}

// ---- 3. creature loot: master has none for most island mobs; SkyFire's, with the sniff's drop rates where it looted enough --
{
  const sniffLoot = SNIFF.loot as Record<string, { loots: number; items: Record<string, number> }>;
  const diff = q(`SELECT d.Entry, d.LootID, d.GoldMin, d.GoldMax, t.lootid sfloot, t.mingold, t.maxgold FROM world.creature_template_difficulty d
    JOIN ref_sfdb.creature_template t ON t.entry=d.Entry WHERE d.DifficultyID=0 AND d.Entry IN (${list(islandEntries)}) AND d.LootID=0 AND t.lootid<>0`);
  const sf = q(`SELECT entry, item, ChanceOrQuestChance c, lootmode, groupid, mincountOrRef, maxcount FROM ref_sfdb.creature_loot_template WHERE entry IN (${list(diff.map(r => n(r.sfloot)))})`);
  const rows: Row[] = [];
  for (const d of diff) {
    const e = n(d.Entry), sl = sniffLoot[`cr${e}`];
    for (const r of sf.filter(r => n(r.entry) === n(d.sfloot))) {
      if (n(r.mincountOrRef) < 0) { log(`creature ${e}: SkyFire loot reference ${r.mincountOrRef} not imported`); continue; }
      if (!items.has(n(r.item))) continue;
      const quest = Number(r.c) < 0;
      let chance = Math.abs(Number(r.c));
      // Retail drop rate where the sniff looted the entry >= 10 times (quest items only drop while the quest is open).
      if (sl && sl.loots >= 10 && !quest && sl.items[r.item!] !== undefined) chance = Math.round(1000 * 100 * sl.items[r.item!] / sl.loots) / 1000;
      rows.push({ Entry: String(e), ItemType: "0", Item: r.item, Chance: String(chance), QuestRequired: quest ? "1" : "0", LootMode: r.lootmode, GroupId: r.groupid,
        MinCount: r.mincountOrRef, MaxCount: r.maxcount, Comment: sl && sl.loots >= 10 && !quest && sl.items[r.item!] !== undefined ? "sniff rate" : "ref_sfdb" });
    }
    // Quest items the sniff saw drop that SkyFire's table lacks.
    for (const [item, cnt] of Object.entries(sl?.items ?? {})) {
      if (rows.some(x => n(x.Entry) === e && x.Item === item) || !items.has(+item)) continue;
      const isQuest = q(`SELECT 1 FROM world.quest_objectives WHERE Type=1 AND ObjectID=${item} LIMIT 1`).length > 0;
      if (!isQuest) continue;
      rows.push({ Entry: String(e), ItemType: "0", Item: item, Chance: "100", QuestRequired: "1", LootMode: "1", GroupId: "0", MinCount: "1", MaxCount: "1", Comment: `sniff (${cnt}/${sl!.loots})` });
    }
  }
  const ids = list(new Set(rows.map(r => n(r.Entry))));
  emit("creature_loot_template", rows, `Entry IN (${ids})`, "ref_sfdb creature loot for island creatures without loot; drop rate from the sniff where looted >= 10 times");
  for (const d of diff) if (rows.some(r => n(r.Entry) === n(d.Entry)) || n(d.mingold))
    update("creature_template_difficulty", { LootID: rows.some(r => n(r.Entry) === n(d.Entry)) ? n(d.Entry) : 0, ...(n(d.GoldMin) || n(d.GoldMax) ? {} : { GoldMin: n(d.mingold), GoldMax: n(d.maxgold) }) },
      { Entry: n(d.Entry), DifficultyID: 0 });
  out.push("");
}

// ---- 4. template values the sniff shows for every sighting: speeds, npcflag, faction -------------------------------------
{
  const byEntry = new Map<number, Sniffed[]>(); for (const c of sniffed) byEntry.set(c.e, [...(byEntry.get(c.e) ?? []), c]);
  let speeds = 0, flags = 0;
  for (const [e, cs] of [...byEntry].sort((a, b) => a[0] - b[0])) {
    const t = tmpl.get(e); if (!t) continue;
    const sp = mode(cs.filter(c => c.walk !== null && c.run !== null).map(c => [c.walk!, c.run!]));
    const set: Record<string, unknown> = {};
    if (sp && (Math.abs(sp[0][0] - Number(t.speed_walk)) > 0.002 || Math.abs(sp[0][1] - Number(t.speed_run)) > 0.002)) { set.speed_walk = sp[0][0]; set.speed_run = sp[0][1]; speeds++; }
    // npcflag/faction only when every sighting agrees; spellclick (0x1000000) is granted per player, summons inherit their owner's faction
    const nf = new Set(cs.map(c => c.npcflag)), fa = new Set(cs.filter(c => !c.summoned).map(c => c.faction));
    if (nf.size === 1 && cs[0].npcflag !== n(t.npcflag) && ((cs[0].npcflag ^ n(t.npcflag)) & 0x1000000) === 0) { set.npcflag = cs[0].npcflag; flags++; }
    if (fa.size === 1 && cs.every(c => !c.summoned) && [...fa][0] !== n(t.faction) && [...fa][0] !== 2395) { set.faction = [...fa][0]; flags++; }
    if (Object.keys(set).length) update("creature_template", set, { entry: e }, `${t.name}: sniff (${cs.length} sightings)`);
  }
  summary.push(`creature_template speeds: ${speeds}, npcflag/faction: ${flags}`);
  out.push("");
}

// ---- 5. spawn state: health, emote/stand/sheath/anim tier of the nearest spawn (non-summons, every sighting agrees) ---------
const patrolGuids = new Set((SNIFF.patrols as { g: string }[]).map(p => p.g));
{
  const near = new Map<number, Sniffed[]>(); // spawn guid -> sightings
  for (const c of sniffed) {
    if (c.summoned || patrolGuids.has(c.g)) continue;
    const best = (spawnsOf.get(c.e) ?? []).map(s => ({ s, d: d2(c.p, s) })).sort((a, b) => a.d - b.d)[0];
    if (best && best.d < 5) near.set(n(best.s.guid), [...(near.get(n(best.s.guid)) ?? []), c]);
  }
  const addon = new Map(q(`SELECT * FROM world.creature_addon WHERE guid IN (${list(near.keys())})`).map(r => [n(r.guid), r]));
  const tAddon = new Map(q(`SELECT * FROM world.creature_template_addon WHERE entry IN (${list(islandEntries)})`).map(r => [n(r.entry), r]));
  const health: Row[] = [], states: Row[] = [];
  // Spawn health only where every sighting of the entry shows the same wounded value (a single hurt sighting is a fight).
  const pctOf = new Map<number, Set<number>>();
  for (const c of sniffed) if (!c.summoned && c.maxHealth) (pctOf.get(c.e) ?? pctOf.set(c.e, new Set()).get(c.e)!).add(c.healthPct);
  for (const [guid, cs] of near) {
    const s = spawns.find(x => n(x.guid) === guid)!, e = n(s.id), pct = pctOf.get(e)!;
    if (pct.size === 1 && cs[0].healthPct < 100 && cs[0].healthPct > 0 && n(s.hp ?? "100") !== cs[0].healthPct) health.push({ guid: String(guid), pct: String(cs[0].healthPct) });
    const st = new Set(cs.map(c => `${c.emote}:${c.stand}:${c.sheath}:${c.animTier}`));
    if (st.size !== 1) continue;
    const c = cs[0], a = addon.get(guid) ?? tAddon.get(e);
    const cur = { emote: n(a?.emote), StandState: n(a?.StandState), SheathState: a ? n(a.SheathState) : 1, AnimTier: n(a?.AnimTier) };
    const want = { emote: emotes.has(c.emote) || c.emote === 0 ? c.emote : cur.emote, StandState: c.stand, SheathState: c.sheath, AnimTier: c.animTier };
    if (JSON.stringify(cur) === JSON.stringify(want)) continue;
    const base: Row = addon.get(guid) ?? { ...(tAddon.get(e) ?? {}), guid: String(guid) };
    delete base.entry;
    states.push({ ...base, guid: String(guid), emote: String(want.emote), StandState: String(want.StandState), SheathState: String(want.SheathState), AnimTier: String(want.AnimTier) });
  }
  for (const h of health) update("creature", { curHealthPct: n(h.pct) }, { guid: n(h.guid) }, "sniff health");
  out.push("");
  emit("creature_addon", states.map(r => ({ ...r, PathId: r.PathId ?? "0" })), states.length ? `guid IN (${list(states.map(r => r.guid!))})` : "0",
    "nearest spawn of each sniffed creature: emote/stand/sheath/anim tier as retail (other columns kept from the spawn or template addon)");
}

// ---- 6. patrols from the sniff splines --------------------------------------------------------------------------------
{
  type Node = { p: number[]; wait: number; speed: number };
  type Patrol = { g: string; tag: string; e: number; home: number[]; run: number; len: number; nodes: Node[]; times: number[] };
  const patrols = (SNIFF.patrols as Patrol[]).filter(p => tmpl.has(p.e));
  const saiPaths = new Set(q(`SELECT DISTINCT entryorguid e FROM world.smart_scripts WHERE source_type IN (0,9) AND action_type IN (53,113)`).map(r => n(r.e)));
  const used = new Set<number>(), assigned = new Map<Patrol, Row>();
  for (const p of patrols.sort((x, y) => y.run - x.run)) {
    const t = tmpl.get(p.e)!;
    if (t.ScriptName || saiPaths.has(p.e)) { log(`patrol ${p.e} ${t.name}: scripted (${t.ScriptName || "SmartAI path"}), skipped`); continue; }
    const best = (spawnsOf.get(p.e) ?? []).filter(s => !used.has(n(s.guid)) && n(s.mt) !== 2 && !n(s.path) && !saiPaths.has(-n(s.guid)))
      .map(s => ({ s, d: Math.min(d2(p.home, s), ...p.nodes.map(x => d2(x.p, s))) })).sort((a, b) => a.d - b.d)[0];
    if (!best || best.d > 25) { log(`patrol ${p.e} ${t.name} (${p.tag} ${p.g.slice(-8)}): no free spawn within 25 yd`); continue; }
    used.add(n(best.s.guid)); assigned.set(p, best.s);
  }
  const paths: Row[] = [], nodes: Row[] = [];
  const walk = new Map(sniffed.filter(c => c.walk).map(c => [c.e, c.walk! * 2.5])), runS = new Map(sniffed.filter(c => c.run).map(c => [c.e, c.run! * 7]));
  for (const [p, s] of assigned) {
    const guid = n(s.guid), t = tmpl.get(p.e)!;
    const pathId = guid * 10;
    const med = [...p.nodes.map(x => x.speed)].sort((a, b) => a - b)[p.nodes.length >> 1];
    const w = walk.get(p.e) ?? 2.5 * Number(t.speed_walk), r = runS.get(p.e) ?? 7 * Number(t.speed_run);
    const run = Math.abs(med - r) < Math.abs(med - w);
    const base = run ? r : w;
    paths.push({ PathId: String(pathId), MoveType: run ? "1" : "0", Flags: "0", Velocity: Math.abs(med - base) / base > 0.1 ? med.toFixed(3) : null,
      Comment: `${t.name} - sniff ${p.tag} patrol (${p.nodes.length} nodes, seen ${p.run + p.nodes.length} moves)` });
    p.nodes.forEach((x, i) => nodes.push({ PathId: String(pathId), NodeId: String(i), PositionX: String(x.p[0]), PositionY: String(x.p[1]), PositionZ: String(x.p[2]), Orientation: null, Delay: String(x.wait) }));
    update("creature", { MovementType: 2, wander_distance: 0 }, { guid }, `${t.name}: sniff patrol`);
    out.push(`INSERT INTO \`creature_addon\` (\`guid\`,\`PathId\`) VALUES (${guid},${pathId}) ON DUPLICATE KEY UPDATE \`PathId\`=${pathId};`);
  }
  out.push("");
  const P = list(paths.map(r => r.PathId!));
  emit("waypoint_path", paths, `PathId IN (${P})`, "sniff m1/m2 ON_MONSTER_MOVE: destinations repeating with a fixed period; MoveType from the median speed");
  emit("waypoint_path_node", nodes, `PathId IN (${P})`, "sniff nodes; Delay = median wait at the node");
}

// ---- 7. static creatures the sniff shows and no source spawns -------------------------------------------------------------
{
  // Temple of Five Dawns brazier bunnies (sniff m2 #203); SkyFire spawns one of each elsewhere, master none.
  const STATIC = [54900, 54901, 54902];
  const GUID = 9_520_000;
  const rows = STATIC.flatMap((e, i) => {
    const c = sniffed.find(x => x.e === e); if (!c) return [];
    return [{ guid: String(GUID + i), id: String(e), map: String(MAP), zoneId: "5736", areaId: "0", spawnDifficulties: "0", phaseUseFlags: "0", PhaseId: "0", PhaseGroup: "0",
      terrainSwapMap: "-1", modelid: "0", equipment_id: "0", position_x: String(c.p[0]), position_y: String(c.p[1]), position_z: String(c.p[2]), orientation: String(c.o),
      spawntimesecs: "120", wander_distance: "0", currentwaypoint: "0", MovementType: "0", VerifiedBuild: "70449" } as Row];
  });
  emit("creature", rows, `guid BETWEEN ${GUID} AND ${GUID + 9}`, "sniff CreateObject without a spawn in master/SkyFire (guids 9520000+)");
}

// ---- 8. area triggers retail reacts to and we did not (sniff m2: AT entry -> dummy timer aura + greeting) -------------------
{
  const bt = (id: number) => q(`SELECT * FROM ref_master_hotfixes.broadcast_text WHERE ID=${id}`)[0];
  // [AT, creature, dummy timer aura the creature casts on the player, text, BroadcastText, sniff ref]
  const AT: [number, number, number, string, number, string][] = [
    [7750, 60248, 116220, "Is that... is that Huo?", 59751, "m2#7597"],
    [8287, 64885, 116219, "Hello $n! The Lorewalker is beginning her lesson just down these stairs if you want to listen in.", 65573, "m2#32174"],
    [7258, 57712, 88811, "Hello friend!  You're welcome to use my cart if you like.  It will take you to the Dai-Lo Farmstead.", 56406, "m2#18404"],
  ];
  const sai: Row[] = [], texts: Row[] = [], scripts: Row[] = [], conds: Row[] = [];
  const groupOf = new Map(q(`SELECT CreatureID c, MAX(GroupID)+1 g FROM world.creature_text WHERE CreatureID IN (${list(AT.map(a => a[1]))},56662) GROUP BY CreatureID`).map(r => [n(r.c), n(r.g)]));
  const aura = (at: number, id: number, spell: number) => conds.push({ SourceTypeOrReferenceId: "22", SourceGroup: String(id + 1), SourceEntry: String(at), SourceId: "2", ElseGroup: "0",
    ConditionTypeOrReference: "1", ConditionTarget: "0", ConditionValue1: String(spell), ConditionValue2: "0", ConditionValue3: "0", NegativeCondition: "1", Comment: `AT ${at}: not while the timer aura ${spell} is up` });
  const smart = (at: number, id: number, action: number, p: number[], target: number, tp: number[], comment: string): Row => ({ entryorguid: String(at), source_type: "2", id: String(id), link: "0",
    event_type: "46", event_phase_mask: "0", event_chance: "100", event_flags: "0", event_param1: "0", event_param2: "0", event_param3: "0", event_param4: "0", event_param5: "0", event_param_string: "",
    action_type: String(action), ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(i => [`action_param${i}`, String(p[i - 1] ?? 0)])),
    target_type: String(target), target_param1: String(tp[0] ?? 0), target_param2: String(tp[1] ?? 0), target_param3: String(tp[2] ?? 0), target_param4: "0", target_x: "0", target_y: "0", target_z: "0", target_o: "0", comment });
  for (const [at, cr, spell, text, btId, src] of AT) {
    const g = groupOf.get(cr) ?? 0;
    texts.push({ CreatureID: String(cr), GroupID: String(g), ID: "0", Text: text, Type: "12", Language: "0", Probability: "100", Emote: "0", Duration: "0", Sound: "0", SoundPlayType: "0",
      BroadcastTextId: String(btId), TextRange: "0", comment: `${tmpl.get(cr)?.name} - AT ${at} greeting (sniff ${src})` });
    sai.push(smart(at, 0, 1, [g], 19, [cr, 60], `On trigger - closest ${tmpl.get(cr)?.name}: Talk ${g} to invoker (sniff ${src})`));
    sai.push(smart(at, 1, 86, [spell, 2, 19, cr, 60], 7, [], `On trigger - closest ${tmpl.get(cr)?.name}: cross cast Area Trigger Dummy Timer Aura on invoker`));
    aura(at, 0, spell); aura(at, 1, spell);
    scripts.push({ entry: String(at), ScriptName: "SmartTrigger" });
  }
  // AT 7106 at the parked balloon (29791): bunny 40789 force-casts 106603 (summons 56679), Aysa 56662 greets (sniff m2#57099).
  {
    const g = groupOf.get(56662) ?? 0;
    texts.push({ CreatureID: "56662", GroupID: String(g), ID: "0", Text: "We're ready to go whenever you are, $n.", Type: "12", Language: "0", Probability: "100", Emote: "0", Duration: "0",
      Sound: "0", SoundPlayType: "0", BroadcastTextId: "55549", TextRange: "0", comment: "Aysa Cloudsinger - AT 7106 balloon greeting (sniff m2#57099)" });
    sai.push(smart(7106, 0, 1, [g], 19, [56662, 60], "On trigger - closest Aysa Cloudsinger: Talk to invoker (sniff m2#57099)"));
    sai.push(smart(7106, 1, 86, [106604, 2, 19, 40789, 60], 7, [], "On trigger - closest Generic Controller Bunny (CSA): cross cast 106604 (force 106603) on invoker"));
    for (const id of [0, 1]) { aura(7106, id, 106603); conds.push({ SourceTypeOrReferenceId: "22", SourceGroup: String(id + 1), SourceEntry: "7106", SourceId: "2", ElseGroup: "0",
      ConditionTypeOrReference: "47", ConditionTarget: "0", ConditionValue1: "29791", ConditionValue2: "11", ConditionValue3: "0", NegativeCondition: "0", Comment: "AT 7106: The Suffering of Shen-zin Su not rewarded" }); }
    scripts.push({ entry: "7106", ScriptName: "SmartTrigger" });
  }
  const ats = list(scripts.map(r => r.entry!));
  emit("areatrigger_scripts", scripts, `entry IN (${ats})`, "island area triggers retail answers (sniff m2)");
  emit("smart_scripts", sai, `source_type=2 AND entryorguid IN (${ats})`, "AT greetings: Talk + dummy timer aura, as master does for AT 7746-7749");
  emit("conditions", conds, `SourceTypeOrReferenceId=22 AND SourceId=2 AND SourceEntry IN (${ats})`, "once per timer aura; 7106 while 29791 is open");
  emit("creature_text", texts, texts.map(t => `(CreatureID=${t.CreatureID} AND GroupID=${t.GroupID})`).join(" OR "), "sniff SMSG_CHAT; BroadcastText from ref_master_hotfixes");
  // BroadcastText rows the client's BroadcastText.db2 lacks (the server answers DB queries from hotfixes.broadcast_text).
  const have = new Set(q(`SELECT ID FROM hotfixes.broadcast_text WHERE ID IN (${list(AT.map(a => a[4]))},55549)`).map(r => n(r.ID)));
  const add = [...AT.map(a => a[4]), 55549].filter(id => !have.has(id)).map(bt).filter(Boolean).map(r => ({ ...r, VerifiedBuild: r.VerifiedBuild }));
  hot.push("-- MoP Classic: BroadcastText rows of the Wandering Isle area-trigger greetings (2026_10_19_10_world.sql); copied from ref_master_hotfixes.",
    "-- Generated by tools/mop-content/gen_wandering_isle_audit.ts; do not edit by hand.", "");
  emit("broadcast_text", add, `ID IN (${list(add.map(r => r.ID!))})`, "ref_master_hotfixes (TC master hotfixes TDB 1210)", "hotfixes", hot);
  const loc = add.length ? q(`SELECT * FROM ref_master_hotfixes.broadcast_text_locale WHERE locale='deDE' AND ID IN (${list(add.map(r => r.ID!))})`) : [];
  emit("broadcast_text_locale", loc, `locale='deDE' AND ID IN (${list(add.map(r => r.ID!))})`, "ref_master_hotfixes deDE", "hotfixes", hot);
}

const head = [
  "-- MoP Classic: Wandering Isle (map 860) audit against the retail 5.5.4.70449 sniffs: spell conditions, loot, sniffed speeds/flags,",
  "-- spawn state, patrol paths, missing statics and area-trigger greetings. Generated by tools/mop-content/gen_wandering_isle_audit.ts; do not edit by hand.",
  "-- Sniff data: tools/mop-content/data/wandering_isle_audit.json (sniff_wandering_isle_audit.ts). Details: docs/mop-port/wandering-isle-sniff-diff.md.",
  "",
];
writeFileSync(outFile, [...head, ...out].join("\n").replace(/\n+$/, "\n"));
writeFileSync(hotfixFile, hot.join("\n").replace(/\n+$/, "\n"));
log(`wrote ${outFile}, ${hotfixFile}\n${summary.join("\n")}`);
