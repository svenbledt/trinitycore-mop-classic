// Generates the world-DB update for the Wandering Isle, map 860 (phase3-4-plan.md step 4).
// usage: bun tools/mop-content/gen_wandering_isle.ts <db2 dir> [out.sql] [mysql container] [baseline db]
// baseline = a world DB without this file's rows (default ref_cata442: TDB 442.26081 + every world update before this one).
// Rows come from ref_master (TC master TDB); levels from ref_sfdb (SkyFire 5.4.8); IDs are checked against the client DB2s.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readDb2 } from "./src/db2.ts";

const [db2Dir, outFile = "sql/updates/world/mop_classic/2026_10_18_02_world.sql", container = "tc-mop-db-1", BASE = "ref_cata442"] = process.argv.slice(2);
if (!db2Dir) throw new Error("usage: gen_wandering_isle.ts <db2 dir> [out.sql] [container]");
const root = (p: string) => new URL(`../../${p}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const DBD = root("tools/mop-re/refs/wowdbdefs/definitions/");
const db2 = (name: string) => readDb2(`${db2Dir}/${name}.db2`, `${DBD}${name}.dbd`).rows;
const idSet = (name: string) => new Set(db2(name).map(r => r.ID as number));

const MAP = 860, ZONE = 5736;
// npc_text ids for menu texts that only the sniff has (server-side ids; 5.5.4 gossip sends the BroadcastText).
const SNIFF_NPC_TEXT_BASE = 8_000_000;
// Finale spawns (Aysa in Stormwind, Ji in Orgrimmar); 9_500_000-9_509_999 belongs to the second-half script data.
const FINALE_GUID = 9_510_000;
// Spawn GUIDs are master GUID + OFFSET: free in world (max < 4.1M) and traceable to the master row.
const OFFSET = 9_000_000;
// Our own additions on top of master: script names for creatures master leaves unscripted.
const EXTRA_SCRIPTNAMES: Record<number, string> = { 56013: "npc_spirit_of_master_shang_xi" };
// 31450 enders: retail meets the player with Aysa in Stormwind after the exit movie (sniff m2).
const EXTRA_ENTRIES = [60566, 60570];
// Retail 5.5.4.70449 facts (tools/mop-content/sniff_wandering_isle.ts); they win over master and SkyFire.
const SNIFF = JSON.parse(readFileSync(root("tools/mop-content/data/wandering_isle_sniff.json"), "utf8"));
// Second-half script data (tools/mop-content/gen_wandering_isle_script.ts): extra entries, quest accept spells, rows.
const SCRIPT_FILE = root("tools/mop-content/data/wandering_isle_script.json");
const SCRIPT = existsSync(SCRIPT_FILE) ? JSON.parse(readFileSync(SCRIPT_FILE, "utf8")) : {};

type Row = Record<string, string | null>;
const log = (s: string) => console.error(s);

function q(sql: string): Row[] {
  const r = Bun.spawnSync(["docker", "exec", "-i", container, "mysql", "-uroot", "-proot", "-B", "--default-character-set=utf8mb4"],
    { stdin: Buffer.from(sql) });
  if (r.exitCode !== 0) throw new Error(`${sql.slice(0, 400)}\n${r.stderr.toString()}`);
  const lines = r.stdout.toString().split("\n").filter(l => l.length);
  if (!lines.length) return [];
  const head = lines[0].split("\t");
  return lines.slice(1).map(l => {
    const v = l.split("\t"), o: Row = {};
    head.forEach((h, i) => { o[h] = v[i] === "NULL" ? null : v[i]; });
    return o;
  });
}
const list = (xs: Iterable<number | string>) => { const a = [...new Set(xs)]; return a.length ? a.join(",") : "NULL"; };
const n = (v: string | null | undefined) => Number(v ?? 0);

// World column lists and types decide which source columns are copied and how values are quoted.
const colInfo = new Map<string, { name: string; numeric: boolean }[]>();
for (const r of q(`SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE TABLE_SCHEMA='world' ORDER BY TABLE_NAME, ORDINAL_POSITION`)) {
  const t = r.TABLE_NAME!, list = colInfo.get(t) ?? colInfo.set(t, []).get(t)!;
  list.push({ name: r.COLUMN_NAME!, numeric: /int|float|double|decimal/.test(r.DATA_TYPE!) });
}
const fetch = (db: string, table: string, where: string) => q(`SELECT * FROM ${db}.\`${table}\` WHERE ${where}`);

const out: string[] = [];
const summary: string[] = [];
function emit(table: string, rows: Row[], del: string, note: string) {
  const cols = colInfo.get(table);
  if (!cols) throw new Error(`world has no table ${table}`);
  summary.push(`${table}: ${rows.length}`);
  out.push(`-- ${table}: ${note} (${rows.length} rows)`);
  out.push(`DELETE FROM \`${table}\` WHERE ${del};`);
  if (!rows.length) { out.push(""); return; }
  const use = cols.filter(c => rows.some(r => c.name in r));
  const lit = (c: { numeric: boolean }, v: string | null | undefined) =>
    v === undefined ? "DEFAULT" : v === null ? "NULL" : c.numeric ? (/^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(v) ? v : String(Number(v))) : `'${v.replace(/'/g, "\\'")}'`;
  for (let i = 0; i < rows.length; i += 500) {
    out.push(`INSERT INTO \`${table}\` (${use.map(c => `\`${c.name}\``).join(",")}) VALUES`);
    out.push(rows.slice(i, i + 500).map(r => `(${use.map(c => lit(c, r[c.name])).join(",")})`).join(",\n") + ";");
  }
  out.push("");
}

// ---- client data -------------------------------------------------------------------------------------------------
const C = {
  spell: idSet("SpellName"), display: idSet("CreatureDisplayInfo"), goDisplay: idSet("GameObjectDisplayInfo"),
  item: idSet("Item"), quest: idSet("QuestV2"), phase: idSet("Phase"), faction: idSet("FactionTemplate"),
  vehicle: idSet("Vehicle"), sound: idSet("SoundKit"), emote: idSet("Emotes"), movie: idSet("Movie"),
  scene: idSet("SceneScriptPackage"), family: idSet("CreatureFamily"),
};
const phaseGroups = new Set(db2("PhaseXPhaseGroup").map(r => r.PhaseGroupID as number));
const areas = new Set(db2("AreaTable").filter(r => r.ID === ZONE || r.ParentAreaID === ZONE).map(r => r.ID as number));
const islandATs = new Set(db2("AreaTrigger").filter(r => r.ContinentID === MAP).map(r => r.ID as number));
const effects = db2("SpellEffect");
const effBySpell = new Map<number, typeof effects>();
for (const e of effects) effBySpell.set(e.SpellID as number, [...(effBySpell.get(e.SpellID as number) ?? []), e]);

// ---- scripts in the port: only names our C++ registers are kept ------------------------------------------------------
const cpp = readFileSync(root("src/server/scripts/Pandaria/zone_the_wandering_isle.cpp"), "utf8");
const registered = new Set([
  ...[...cpp.matchAll(/Register(?:CreatureAI|GameObjectAI|SpellScript|SpellAndAuraScriptPair)\((\w+)/g)].map(m => m[1]),
  ...[...cpp.matchAll(/(?:AreaTriggerScript|CreatureScript)\("(\w+)"\)/g)].map(m => m[1]),
  ...[...cpp.matchAll(/at_singing_pools_transform_base<[^>]+>\("(\w+)"\)/g)].map(m => m[1]),
]);
const scriptSpells = new Set([...cpp.matchAll(/\b(?:SPELL_\w+|[A-Z]\w+)\s*=\s*(\d{4,7})\b/g)].map(m => Number(m[1])).filter(id => C.spell.has(id)));
const keepScript = (s: string | null) => (s && registered.has(s) ? s : "");
log(`scripts registered by zone_the_wandering_isle.cpp: ${registered.size}`);

// ---- spawns ------------------------------------------------------------------------------------------------------
const crSpawns = fetch("ref_master", "creature", `map=${MAP}`);
const goSpawns = fetch("ref_master", "gameobject", `map=${MAP}`);
const crGuid = new Map(crSpawns.map(r => [n(r.guid), n(r.guid) + OFFSET]));
const goGuid = new Map(goSpawns.map(r => [n(r.guid), n(r.guid) + OFFSET]));
{
  const clash = q(`SELECT (SELECT COUNT(*) FROM ${BASE}.creature WHERE guid BETWEEN ${OFFSET} AND ${OFFSET + 999999})
    + (SELECT COUNT(*) FROM ${BASE}.gameobject WHERE guid BETWEEN ${OFFSET} AND ${OFFSET + 999999}) AS c`)[0].c;
  if (n(clash)) log(`note: ${clash} world spawns already in the ${OFFSET} range (a previous apply of this file)`);
}

// ---- entry closure: spawned, scripted, summoned, credited -----------------------------------------------------------
const crEntries = new Set([...crSpawns.map(r => n(r.id)), ...Object.keys(EXTRA_SCRIPTNAMES).map(Number), ...EXTRA_ENTRIES]);
const goEntries = new Set(goSpawns.map(r => n(r.id)));
// Everything the sniffs show on map 860 (summons, vehicles, phased copies) gets its template.
for (const e of SNIFF.seen.creatures as number[]) crEntries.add(e);
for (const e of SNIFF.seen.gameobjects as number[]) goEntries.add(e);
for (const e of (SCRIPT.extra_creature_entries ?? []) as number[]) crEntries.add(e);
for (const e of (SCRIPT.extra_gameobject_entries ?? []) as number[]) goEntries.add(e);
const spells = new Set<number>(scriptSpells);
for (const r of q(`SELECT entry FROM ref_master.creature_template WHERE ScriptName IN ('${[...registered].join("','")}')`)) crEntries.add(n(r.entry));
for (const r of q(`SELECT entry FROM ref_master.gameobject_template WHERE ScriptName IN ('${[...registered].join("','")}')`)) goEntries.add(n(r.entry));
for (const r of q(`SELECT spell_id FROM ref_master.spell_script_names WHERE ScriptName IN ('${[...registered].join("','")}')`)) spells.add(Math.abs(n(r.spell_id)));

const sai: Row[] = [];
const saiKeys = new Set<string>();
function addSai(rows: Row[]) { for (const r of rows) { const k = `${r.entryorguid}:${r.source_type}:${r.id}:${r.link}`; if (!saiKeys.has(k)) { saiKeys.add(k); sai.push(r); } } }
function expand() {
for (let round = 0; round < 6; round++) {
  const before = crEntries.size + goEntries.size + sai.length + spells.size;
  const crList = list(crEntries), goList = list(goEntries);
  addSai(fetch("ref_master", "smart_scripts", `(source_type=0 AND entryorguid IN (${crList})) OR (source_type=1 AND entryorguid IN (${goList}))
    OR (source_type=0 AND -entryorguid IN (${list(crGuid.keys())})) OR (source_type=1 AND -entryorguid IN (${list(goGuid.keys())}))
    OR (source_type=2 AND entryorguid IN (${list(islandATs)}))`));
  const lists = new Set<number>();
  for (const r of sai) {
    const a = n(r.action_type), p = [1, 2, 3, 4, 5, 6].map(i => n(r[`action_param${i}`]));
    if (a === 80) lists.add(p[0]);
    if (a === 87) p.filter(Boolean).forEach(x => lists.add(x));
    if (a === 88) for (let x = p[0]; x && x <= p[1]; x++) lists.add(x);
    if (a === 12) crEntries.add(p[0]);
    if (a === 50) goEntries.add(p[0]);
    if ([11, 85, 86, 134].includes(a)) spells.add(p[0]);
    const t = n(r.target_type), tp = n(r.target_param1);
    if ([9, 11, 19].includes(t) && tp) crEntries.add(tp);
    if ([13, 15, 20].includes(t) && tp) goEntries.add(tp);
  }
  if (lists.size) addSai(fetch("ref_master", "smart_scripts", `source_type=9 AND entryorguid IN (${list(lists)})`));
  for (const r of q(`SELECT accessory_entry e FROM ref_master.vehicle_template_accessory WHERE entry IN (${list(crEntries)})
    UNION SELECT entry FROM ref_master.creature_summon_groups WHERE summonerType=0 AND summonerId IN (${list(crEntries)}) AND entry<>0`)) crEntries.add(n(r.e));
  for (const r of q(`SELECT spell_id s FROM ref_master.npc_spellclick_spells WHERE npc_entry IN (${list(crEntries)})
    UNION SELECT Spell FROM ref_master.creature_template_spell WHERE CreatureID IN (${list(crEntries)})`)) spells.add(n(r.s));
  // Summon/trigger chains of the spells we already use (client SpellEffect).
  for (const s of [...spells]) for (const e of effBySpell.get(s) ?? []) {
    const misc = (e.EffectMiscValue as number[])[0];
    if ((e.Effect as number) === 28 && misc) crEntries.add(misc);
    if ([50, 76, 104, 105, 106, 107].includes(e.Effect as number) && misc) goEntries.add(misc);
    if (e.EffectTriggerSpell) spells.add(e.EffectTriggerSpell as number);
  }
  if (crEntries.size + goEntries.size + sai.length + spells.size === before) break;
}
crEntries.delete(0); goEntries.delete(0);
}
expand();

// ---- quests ------------------------------------------------------------------------------------------------------
const questIds = new Set<number>();
for (const r of q(`SELECT ID FROM ref_master.quest_template WHERE QuestSortID=${ZONE}
  UNION SELECT quest FROM ref_master.creature_queststarter WHERE id IN (${list(crEntries)})
  UNION SELECT quest FROM ref_master.creature_questender WHERE id IN (${list(crEntries)})
  UNION SELECT quest FROM ref_master.gameobject_queststarter WHERE id IN (${list(goEntries)})
  UNION SELECT quest FROM ref_master.gameobject_questender WHERE id IN (${list(goEntries)})`)) {
  const id = n(r.ID);
  if (C.quest.has(id)) questIds.add(id); else log(`quest ${id}: not in QuestV2.db2, skipped`);
}
// Givers that only appear as summons or phased copies (no master spawn off the island) belong to the island too.
for (const r of q(`SELECT g.id FROM (SELECT id, quest FROM ref_master.creature_queststarter UNION SELECT id, quest FROM ref_master.creature_questender) g
  WHERE g.quest IN (${list(questIds)}) AND NOT EXISTS (SELECT 1 FROM ref_master.creature c WHERE c.id=g.id AND c.map<>${MAP})`)) crEntries.add(n(r.id));
const objectives = fetch("ref_master", "quest_objectives", `QuestID IN (${list(questIds)})`);
for (const o of objectives) {
  if (n(o.Type) === 0 && n(o.ObjectID)) crEntries.add(n(o.ObjectID));   // QUEST_OBJECTIVE_MONSTER
  if (n(o.Type) === 2 && n(o.ObjectID)) goEntries.add(n(o.ObjectID));   // QUEST_OBJECTIVE_GAMEOBJECT
}
expand();

// ---- creature templates (entries world does not have yet) -----------------------------------------------------------------
const worldCr = new Set(q(`SELECT entry FROM ${BASE}.creature_template WHERE entry IN (${list(crEntries)})`).map(r => n(r.entry)));
const masterCr = fetch("ref_master", "creature_template", `entry IN (${list(crEntries)})`);
for (const e of crEntries) if (!worldCr.has(e) && !masterCr.some(r => n(r.entry) === e)) log(`creature ${e}: no template in master or world`);
const newCr = masterCr.filter(r => !worldCr.has(n(r.entry)));
for (const r of newCr) for (const k of ["KillCredit1", "KillCredit2"]) if (n(r[k])) crEntries.add(n(r[k]));
const newCrIds = new Set(newCr.map(r => n(r.entry)));
if (worldCr.size) log(`creature templates kept from world: ${[...worldCr].join(",")}`);
const sfLevels = new Map(q(`SELECT entry, minlevel, maxlevel FROM ref_sfdb.creature_template WHERE entry IN (${list(newCrIds)})`)
  .map(r => [n(r.entry), r]));
const NEW = list(newCrIds);

const vehicleIds = new Set<number>();
emit("creature_template", newCr.map(r => {
  const e = n(r.entry);
  if (n(r.faction) && !C.faction.has(n(r.faction))) log(`creature ${e}: faction ${r.faction} not in FactionTemplate.db2`);
  if (n(r.VehicleId) && !C.vehicle.has(n(r.VehicleId))) { log(`creature ${e}: VehicleId ${r.VehicleId} not in Vehicle.db2, cleared`); r.VehicleId = "0"; }
  if (n(r.VehicleId)) vehicleIds.add(e);
  if (n(r.family) && !C.family.has(n(r.family))) { log(`creature ${e}: family ${r.family} not in CreatureFamily.db2, cleared`); r.family = "0"; }
  return { ...r, ScriptName: EXTRA_SCRIPTNAMES[e] ?? keepScript(r.ScriptName) };
}), `entry IN (${NEW})`, "ref_master; ScriptName only where the port registers it");

emit("creature_template_difficulty", fetch("ref_master", "creature_template_difficulty", `Entry IN (${NEW}) AND DifficultyID=0`).map(r => {
  const sf = sfLevels.get(n(r.Entry));
  if (!sf) throw new Error(`creature ${r.Entry}: no SkyFire level`);
  // TODO(verify): CURRENT_EXPANSION is still Cataclysm, so MoP health scaling (4) falls back to the base table.
  const hse = n(r.HealthScalingExpansion) > 3 ? "0" : r.HealthScalingExpansion;
  return { ...r, MinLevel: sf.minlevel, MaxLevel: sf.maxlevel, HealthScalingExpansion: hse };
}), `Entry IN (${NEW})`, "ref_master DifficultyID 0; MinLevel/MaxLevel from ref_sfdb.creature_template; HealthScalingExpansion 4 -> 0");

const models = fetch("ref_master", "creature_template_model", `CreatureID IN (${NEW})`).filter(r => {
  if (C.display.has(n(r.CreatureDisplayID))) return true;
  log(`creature ${r.CreatureID}: display ${r.CreatureDisplayID} not in CreatureDisplayInfo.db2, dropped`); return false;
});
emit("creature_template_model", models, `CreatureID IN (${NEW})`, "ref_master, displays checked against CreatureDisplayInfo.db2");
{
  const ids = new Set(models.map(r => n(r.CreatureDisplayID)));
  const have = new Set(q(`SELECT DisplayID FROM ${BASE}.creature_model_info WHERE DisplayID IN (${list(ids)})`).map(r => n(r.DisplayID)));
  const add = [...ids].filter(d => !have.has(d));
  emit("creature_model_info", add.length ? fetch("ref_master", "creature_model_info", `DisplayID IN (${list(add)})`) : [],
    `DisplayID IN (${list(add)})`, "ref_master, displays world does not have");
}
const cleanAuras = (owner: string, a: string | null) => (a ?? "").split(" ").filter(s => {
  if (!s) return false;
  if (C.spell.has(Number(s))) { spells.add(Number(s)); return true; }
  log(`${owner}: aura ${s} not in SpellName.db2, dropped`); return false;
}).join(" ");
const tmplAddon = fetch("ref_master", "creature_template_addon", `entry IN (${NEW})`).map(r => ({ ...r, auras: cleanAuras(`creature_template_addon ${r.entry}`, r.auras) }));
emit("creature_template_addon", tmplAddon, `entry IN (${NEW})`, "ref_master, auras checked against SpellName.db2");
for (const t of ["creature_template_movement", "creature_template_sparring", "creature_onkill_reputation"] as const) {
  const key = t === "creature_template_movement" ? "CreatureId" : t === "creature_onkill_reputation" ? "creature_id" : "Entry";
  emit(t, fetch("ref_master", t, `${key} IN (${NEW})`), `${key} IN (${NEW})`, "ref_master");
}
emit("creature_template_spell", fetch("ref_master", "creature_template_spell", `CreatureID IN (${NEW})`).filter(r => C.spell.has(n(r.Spell))),
  `CreatureID IN (${NEW})`, "ref_master, spells in SpellName.db2");
emit("creature_equip_template", fetch("ref_master", "creature_equip_template", `CreatureID IN (${NEW})`).map(r => {
  for (const k of ["ItemID1", "ItemID2", "ItemID3"]) if (n(r[k]) && !C.item.has(n(r[k]))) { log(`creature_equip_template ${r.CreatureID}: item ${r[k]} not in Item.db2, cleared`); r[k] = "0"; }
  return r;
}), `CreatureID IN (${NEW})`, "ref_master, items checked against Item.db2");
emit("creature_questitem", fetch("ref_master", "creature_questitem", `CreatureEntry IN (${NEW})`).filter(r => C.item.has(n(r.ItemId))),
  `CreatureEntry IN (${NEW})`, "ref_master, items in Item.db2");
emit("npc_spellclick_spells", fetch("ref_master", "npc_spellclick_spells", `npc_entry IN (${NEW})`).filter(r => C.spell.has(n(r.spell_id))),
  `npc_entry IN (${NEW})`, "ref_master, spells in SpellName.db2");
emit("vehicle_template", fetch("ref_master", "vehicle_template", `creatureId IN (${NEW})`), `creatureId IN (${NEW})`, "ref_master");
emit("vehicle_template_accessory", fetch("ref_master", "vehicle_template_accessory", `entry IN (${NEW})`), `entry IN (${NEW})`, "ref_master");
emit("creature_summon_groups", fetch("ref_master", "creature_summon_groups", `summonerType=0 AND summonerId IN (${NEW})`),
  `summonerType=0 AND summonerId IN (${NEW})`, "ref_master");
emit("creature_text", fetch("ref_master", "creature_text", `CreatureID IN (${NEW})`).map(r => {
  if (n(r.SoundKitID) && !C.sound.has(n(r.SoundKitID))) { log(`creature_text ${r.CreatureID}/${r.GroupID}/${r.ID}: sound ${r.SoundKitID} not in SoundKit.db2, cleared`); r.SoundKitID = "0"; }
  return r;
}), `CreatureID IN (${NEW})`, "ref_master (BroadcastTextId kept; see re-notes)");
emit("npc_vendor", fetch("ref_master", "npc_vendor", `entry IN (${NEW}) AND type=1`).filter(r => C.item.has(n(r.item))),
  `entry IN (${NEW})`, "ref_master, items in Item.db2");

// ---- loot ----------------------------------------------------------------------------------------------------------
function loot(table: string, ids: Set<number>, note: string) {
  const rows: Row[] = [], refs = new Set<number>();
  for (const r of ids.size ? fetch("ref_master", table, `Entry IN (${list(ids)})`) : []) {
    if (n(r.ItemType) === 1) { refs.add(n(r.Item)); rows.push(r); continue; }
    if (n(r.ItemType) === 0 && !C.item.has(n(r.Item))) { log(`${table} ${r.Entry}: item ${r.Item} not in Item.db2, dropped`); continue; }
    rows.push(r);
  }
  emit(table, rows, `Entry IN (${list(ids)})`, note);
  return refs;
}
const diffs = q(`SELECT LootID, PickPocketLootID, SkinLootID FROM ref_master.creature_template_difficulty WHERE Entry IN (${NEW}) AND DifficultyID=0`);
const refs = new Set<number>();
for (const [t, k] of [["creature_loot_template", "LootID"], ["pickpocketing_loot_template", "PickPocketLootID"], ["skinning_loot_template", "SkinLootID"]] as const) {
  const ids = new Set(diffs.map(r => n(r[k])).filter(Boolean));
  const have = new Set(q(`SELECT DISTINCT Entry FROM ${BASE}.${t} WHERE Entry IN (${list(ids)})`).map(r => n(r.Entry)));
  if (have.size) log(`${t}: world already has ${[...have].join(",")}, master rows replace them`);
  loot(t, ids, "ref_master, items in Item.db2").forEach(x => refs.add(x));
}

// ---- gameobject templates ----------------------------------------------------------------------------------------------
const worldGo = new Set(q(`SELECT entry FROM ${BASE}.gameobject_template WHERE entry IN (${list(goEntries)})`).map(r => n(r.entry)));
const newGo = fetch("ref_master", "gameobject_template", `entry IN (${list(goEntries)})`).filter(r => !worldGo.has(n(r.entry)));
for (const e of goEntries) if (!worldGo.has(e) && !newGo.some(r => n(r.entry) === e)) log(`gameobject ${e}: no template in master or world`);
const NEWGO = list(newGo.map(r => n(r.entry)));
// Chests master left without loot, and the per-class weapon racks (phases 592-598), take SkyFire's MoP-era loot;
// see phase3-4-plan.md step 4 "Weapon racks" (sniff m1 #16583: Monk rack 210005 -> 73209).
const WEAPON_RACKS = [210005, 210015, 210016, 210017, 210018, 210019, 210020];
const sfChest = new Map(q(`SELECT entry, data1 FROM ref_sfdb.gameobject_template WHERE type=3 AND data1<>0 AND entry IN (${list(newGo.filter(r => n(r.type) === 3 && (!n(r.Data1) || WEAPON_RACKS.includes(n(r.entry)))).map(r => n(r.entry)))})`)
  .map(r => [n(r.entry), n(r.data1)]));
emit("gameobject_template", newGo.map(r => {
  if (sfChest.has(n(r.entry))) { log(`gameobject ${r.entry}: chest loot ${sfChest.get(n(r.entry))} from ref_sfdb`); r.Data1 = String(sfChest.get(n(r.entry))); }
  if (n(r.displayId) && !C.goDisplay.has(n(r.displayId))) log(`gameobject ${r.entry}: display ${r.displayId} not in GameObjectDisplayInfo.db2`);
  return { ...r, ScriptName: keepScript(r.ScriptName) };
}), `entry IN (${NEWGO})`, "ref_master (RequiredLevel dropped: not in cata_classic)");
emit("gameobject_template_addon", fetch("ref_master", "gameobject_template_addon", `entry IN (${NEWGO})`), `entry IN (${NEWGO})`, "ref_master");
emit("gameobject_questitem", fetch("ref_master", "gameobject_questitem", `GameObjectEntry IN (${NEWGO})`).filter(r => C.item.has(n(r.ItemId))),
  `GameObjectEntry IN (${NEWGO})`, "ref_master, items in Item.db2");
{
  const chestLoot = new Set(newGo.filter(r => n(r.type) === 3).map(r => n(r.Data1)).filter(Boolean));
  loot("gameobject_loot_template", chestLoot, "ref_master (chest Data1), items in Item.db2").forEach(x => refs.add(x));
  const rackLoot = new Set(WEAPON_RACKS.map(e => sfChest.get(e)).filter(Boolean) as number[]);
  const sfIds = new Set([...sfChest.values()].filter(id => rackLoot.has(id) || !q(`SELECT 1 FROM ref_master.gameobject_loot_template WHERE Entry=${id} LIMIT 1`).length));
  const sfRows = sfIds.size ? q(`SELECT entry, item, ChanceOrQuestChance c, groupid, mincountOrRef, maxcount, lootmode FROM ref_sfdb.gameobject_loot_template WHERE entry IN (${list(sfIds)})`)
    .filter(r => n(r.mincountOrRef) > 0 && C.item.has(n(r.item)))
    // SkyFire's negative chance means quest-required; these weapons are no quest objectives (the class phase picks the rack), so plain drops.
    .map(r => ({ Entry: r.entry, ItemType: "0", Item: r.item, Chance: String(Math.abs(Number(r.c))), QuestRequired: "0", LootMode: r.lootmode, GroupId: r.groupid,
      MinCount: r.mincountOrRef, MaxCount: r.maxcount, Comment: "ref_sfdb" } as Row)) : [];
  emit("gameobject_loot_template", sfRows, `Entry IN (${list(sfIds)})`, "ref_sfdb, chest loot master lacks, items in Item.db2");
}
{
  const all = new Set<number>(), todo = [...refs];
  while (todo.length) { const x = todo.pop()!; if (all.has(x)) continue; all.add(x); }
  const have = new Set(q(`SELECT DISTINCT Entry FROM ${BASE}.reference_loot_template WHERE Entry IN (${list(all)})`).map(r => n(r.Entry)));
  const add = new Set([...all].filter(x => !have.has(x)));
  const nested = loot("reference_loot_template", add, "ref_master, references world lacks; items in Item.db2");
  if ([...nested].some(x => !have.has(x) && !add.has(x))) log("reference_loot_template: nested references not imported");
}

// ---- spawns: creature, gameobject and their addons ---------------------------------------------------------------------------
const okPhase = (owner: string, r: Row) => {
  if (n(r.PhaseId) && !C.phase.has(n(r.PhaseId))) log(`${owner}: phase ${r.PhaseId} not in Phase.db2`);
  if (n(r.PhaseGroup) && !phaseGroups.has(n(r.PhaseGroup))) log(`${owner}: phase group ${r.PhaseGroup} not in PhaseXPhaseGroup.db2`);
};
const CRG = `guid BETWEEN ${OFFSET + Math.min(...crGuid.keys())} AND ${OFFSET + Math.max(...crGuid.keys())}`;
const GOG = `guid BETWEEN ${OFFSET + Math.min(...goGuid.keys())} AND ${OFFSET + Math.max(...goGuid.keys())}`;
emit("creature", crSpawns.map(r => {
  okPhase(`creature ${r.guid}`, r);
  if (n(r.modelid) && !C.display.has(n(r.modelid))) { log(`creature ${r.guid}: modelid ${r.modelid} not in CreatureDisplayInfo.db2, cleared`); r.modelid = "0"; }
  return { ...r, guid: String(crGuid.get(n(r.guid))), ScriptName: keepScript(r.ScriptName) };
}), CRG, `ref_master map ${MAP}, guid = master guid + ${OFFSET}`);
const pathIds = new Set<number>();
emit("creature_addon", fetch("ref_master", "creature_addon", `guid IN (${list(crGuid.keys())})`).map(r => {
  if (n(r.PathId)) pathIds.add(n(r.PathId));
  return { ...r, guid: String(crGuid.get(n(r.guid))), auras: cleanAuras(`creature_addon ${r.guid}`, r.auras) };
}), CRG, "ref_master, guid remapped, auras checked against SpellName.db2");
emit("gameobject", goSpawns.map(r => {
  okPhase(`gameobject ${r.guid}`, r);
  return { ...r, guid: String(goGuid.get(n(r.guid))), ScriptName: keepScript(r.ScriptName) };
}), GOG, `ref_master map ${MAP}, guid = master guid + ${OFFSET}`);
emit("gameobject_addon", fetch("ref_master", "gameobject_addon", `guid IN (${list(goGuid.keys())})`).map(r => ({ ...r, guid: String(goGuid.get(n(r.guid))) })),
  GOG, "ref_master, guid remapped");
emit("gameobject_overrides", fetch("ref_master", "gameobject_overrides", `spawnId IN (${list(goGuid.keys())})`).map(r => ({ ...r, spawnId: String(goGuid.get(n(r.spawnId))) })),
  GOG.replace("guid", "spawnId"), "ref_master, spawnId remapped");

// ---- waypoints -------------------------------------------------------------------------------------------------------
for (const r of tmplAddon) if (n(r.PathId)) pathIds.add(n(r.PathId));
for (const r of sai) {
  if (n(r.action_type) === 53) pathIds.add(n(r.action_param2));
  if (n(r.action_type) === 113) [1, 2, 3, 4, 5, 6].forEach(i => n(r[`action_param${i}`]) && pathIds.add(n(r[`action_param${i}`])));
}
// Script paths follow the entry * 100 + n convention; only entries our C++ drives need them.
const scripted = newCr.filter(r => EXTRA_SCRIPTNAMES[n(r.entry)] ?? keepScript(r.ScriptName)).map(r => n(r.entry));
for (const r of q(`SELECT PathId FROM ref_master.waypoint_path WHERE PathId DIV 100 IN (${list(scripted)})`)) pathIds.add(n(r.PathId));
{
  // master reuses some world paths (same ids, same nodes): keep world's, refuse real conflicts.
  const nodes = (db: string, ids: string) => {
    const m = new Map<number, string>();
    for (const r of q(`SELECT PathId, GROUP_CONCAT(CONCAT(NodeId,':',ROUND(PositionX,1),':',ROUND(PositionY,1)) ORDER BY NodeId) k FROM ${db}.waypoint_path_node WHERE PathId IN (${ids}) GROUP BY PathId`))
      m.set(n(r.PathId), r.k!);
    return m;
  };
  const clash = q(`SELECT PathId FROM ${BASE}.waypoint_path WHERE PathId IN (${list(pathIds)})`).map(r => n(r.PathId));
  if (clash.length) {
    const w = nodes("world", list(clash)), m = nodes("ref_master", list(clash));
    const diff = clash.filter(id => w.get(id) !== m.get(id));
    if (diff.length) throw new Error(`waypoint_path ids already in world with other nodes: ${diff}`);
    log(`waypoint_path: ${clash.length} master paths already in world with the same nodes, kept: ${clash}`);
    clash.forEach(id => pathIds.delete(id));
  }
  emit("waypoint_path", fetch("ref_master", "waypoint_path", `PathId IN (${list(pathIds)})`), `PathId IN (${list(pathIds)})`, "ref_master (addon, SAI and script paths)");
  emit("waypoint_path_node", fetch("ref_master", "waypoint_path_node", `PathId IN (${list(pathIds)})`), `PathId IN (${list(pathIds)})`, "ref_master");
}

// ---- smart scripts ---------------------------------------------------------------------------------------------------
const crGuidOf = (g: number) => crGuid.get(g), goGuidOf = (g: number) => goGuid.get(g);
const saiRows = sai.map(r => {
  const st = n(r.source_type), e = n(r.entryorguid);
  const o = { ...r };
  if (e < 0) o.entryorguid = String(-((st === 1 ? goGuidOf(-e) : crGuidOf(-e)) ?? -e));
  if (n(r.action_type) === 86 && [10, 14].includes(n(r.action_param3))) {   // CROSS_CAST caster given by guid
    const g = n(r.action_param3) === 10 ? crGuidOf(n(r.action_param4)) : goGuidOf(n(r.action_param4));
    if (g) o.action_param4 = String(g); else log(`smart_scripts ${e}/${r.id}: caster guid ${r.action_param4} is not an island spawn`);
  }
  const t = n(r.target_type);
  if (t === 10 || t === 14) {
    const g = t === 10 ? crGuidOf(n(r.target_param1)) : goGuidOf(n(r.target_param1));
    if (g) o.target_param1 = String(g); else log(`smart_scripts ${e}/${r.id}: target guid ${r.target_param1} is not an island spawn`);
  }
  for (const a of [11, 85, 86, 134]) if (n(r.action_type) === a && !C.spell.has(n(r.action_param1))) log(`smart_scripts ${e}/${r.id}: spell ${r.action_param1} not in SpellName.db2`);
  return o;
});
const spawnEntry = new Map(crSpawns.map(r => [n(r.guid) + OFFSET, n(r.id)]));
const saiNew = saiRows.filter(r => {
  if (n(r.source_type) !== 0) return true;
  const e = n(r.entryorguid), entry = e < 0 ? spawnEntry.get(-e)! : e;
  if (newCrIds.has(entry)) return true;
  if (e < 0) log(`smart_scripts ${e}: spawn of world-kept entry ${entry} (not SmartAI there), skipped`);
  return false;
});
{
  const keys = [...new Set(saiNew.map(r => `(${r.entryorguid},${r.source_type})`))];
  // Every island spawn guid is ours, so the guid scripts are cleared by range (also drops rows an older version wrote).
  const guidDel = `(source_type IN (0,1) AND entryorguid BETWEEN -${OFFSET + 999999} AND -${OFFSET})`;
  emit("smart_scripts", saiNew, keys.length ? `(entryorguid,source_type) IN (${keys.join(",")}) OR ${guidDel}` : guidDel, "ref_master, guids remapped");
}

// ---- first quest: retail (sniff m1, 70449) offers "Much to Learn" on the first login via "Launch Starting Quest, <class>" ----
{
  // spell -> class mask; spell names from the 5.4.8 Spell.dbc (spellwork), quest from the 5.5.4 SpellEffect (QUEST_START).
  const launch: [number, number][] = [[107915, 512], [107916, 128], [107917, 4], [107919, 16], [107920, 8], [107921, 64], [107922, 1]];
  const rows = launch.filter(([sp]) => C.spell.has(sp) && (effBySpell.get(sp) ?? []).some(e => (e.Effect as number) === 150 && questIds.has((e.EffectMiscValue as number[])[0])))
    .map(([sp, cls]) => ({ raceMask: "8388608", classMask: String(cls), createMode: "0", spell: String(sp), note: `Pandaren - Launch Starting Quest (${sp})` } as Row));
  emit("playercreateinfo_cast_spell", rows, `raceMask=8388608 AND spell IN (${list(launch.map(l => l[0]))})`, "sniff m1 (70449): quest offered by the player on first login");
}

// ---- quests --------------------------------------------------------------------------------------------------------
const Q = list(questIds);
// WPP's 5.5.4 QUERY_QUEST_INFO_RESPONSE fields that are aligned (up to RewardSpell) -> world column.
const SNIFF_QUEST_COLUMNS: Record<string, string> = { QuestType: "QuestType", QuestLevel: "QuestLevel", QuestPackageID: "QuestPackageID", QuestMinLevel: "MinLevel",
  QuestSortID: "QuestSortID", QuestInfoID: "QuestInfoID", SuggestedGroupNum: "SuggestedGroupNum", RewardNextQuest: "RewardNextQuest",
  RewardXPDifficulty: "RewardXPDifficulty", RewardXPMultiplier: "RewardXPMultiplier", RewardMoneyDifficulty: "RewardMoneyDifficulty",
  RewardMoneyMultiplier: "RewardMoneyMultiplier", RewardBonusMoney: "RewardBonusMoney", RewardSpell: "RewardSpell" };
const sniffChanges: string[] = [];
const sfQuest = new Map(q(`SELECT Id, Level, MinLevel FROM ref_sfdb.quest_template WHERE Id IN (${Q})`).map(r => [n(r.Id), r]));
emit("quest_template", fetch("ref_master", "quest_template", `ID IN (${Q})`).map(r => {
  const sf = sfQuest.get(n(r.ID));
  if (!sf) log(`quest ${r.ID}: no SkyFire level, QuestLevel -1 (scales)`);
  for (const k of Object.keys(r)) {
    if (/^(RewardItem|RewardChoiceItemID|ItemDrop|StartItem)\d*$/.test(k) && n(r[k]) && !C.item.has(n(r[k]))) { log(`quest ${r.ID}: ${k} ${r[k]} not in Item.db2, cleared`); r[k] = "0"; }
    if (/^(RewardSpell|RewardDisplaySpell\d|SourceSpellID)$/.test(k) && n(r[k]) && !C.spell.has(n(r[k]))) { log(`quest ${r.ID}: ${k} ${r[k]} not in SpellName.db2, cleared`); r[k] = "0"; }
    if (/^Sound(Accept|TurnIn)$/.test(k) && n(r[k]) && !C.sound.has(n(r[k]))) r[k] = "0";
  }
  if (n(r.RewardSpell)) spells.add(n(r.RewardSpell));
  if (n(r.SourceSpellID)) spells.add(n(r.SourceSpellID));
  if (n(r.RewardNextQuest) && !questIds.has(n(r.RewardNextQuest)) && !q(`SELECT ID FROM ${BASE}.quest_template WHERE ID=${n(r.RewardNextQuest)}`).length) {
    log(`quest ${r.ID}: RewardNextQuest ${r.RewardNextQuest} not imported, cleared`); r.RewardNextQuest = "0";
  }
  const o: Row = { ...r, QuestLevel: sf ? sf.Level : "-1", MinLevel: sf ? sf.MinLevel : "0", QuestScalingFactionGroup: "0", QuestMaxScalingLevel: "255" };
  const sn = SNIFF.quests[n(r.ID)];
  if (sn?.info) for (const [k, col] of Object.entries(SNIFF_QUEST_COLUMNS)) {
    let v = sn.info[k];
    if (v === undefined || v === null) continue;
    if (k === "RewardSpell" && v && !C.spell.has(v)) { log(`quest ${r.ID}: sniff RewardSpell ${v} not in SpellName.db2, kept cleared`); continue; }
    if (k === "RewardNextQuest" && v && !questIds.has(v)) { log(`quest ${r.ID}: sniff RewardNextQuest ${v} not imported, left 0`); v = 0; }
    if (Number(o[col]) !== v) { sniffChanges.push(`${r.ID}.${col} ${o[col]}->${v}`); o[col] = String(v); }
  }
  if (sn?.flags !== undefined && Number(o.Flags) !== sn.flags) { sniffChanges.push(`${r.ID}.Flags ${o.Flags}->${sn.flags}`); o.Flags = String(sn.flags); }
  if (sn?.flagsEx !== undefined && Number(o.FlagsEx) !== sn.flagsEx) { sniffChanges.push(`${r.ID}.FlagsEx ${o.FlagsEx}->${sn.flagsEx}`); o.FlagsEx = String(sn.flagsEx); }
  return o;
}), `ID IN (${Q})`, "ref_master; levels from ref_sfdb; sniff m1/m2 (70449) wins for the QUERY_QUEST_INFO and QUEST_DETAILS fields");
log(`quest_template: ${sniffChanges.length} values from the sniff`);
{
  // master has addon rows for 27 island quests only; the rest of the chain (PrevQuestID etc.) comes from SkyFire's quest_template.
  const master = fetch("ref_master", "quest_template_addon", `ID IN (${Q})`);
  const have = new Set(master.map(r => n(r.ID)));
  const sf = q(`SELECT Id, MaxLevel, RequiredClasses, SourceSpellId, PrevQuestId, NextQuestId, ExclusiveGroup, RewardMailTemplateId, RewardMailDelay,
    RequiredSkillId, RequiredSkillPoints, RequiredMinRepFaction, RequiredMaxRepFaction, RequiredMinRepValue, RequiredMaxRepValue, SpecialFlags
    FROM ref_sfdb.quest_template WHERE Id IN (${Q})`).filter(r => !have.has(n(r.Id))).map(r => ({
    ID: r.Id, MaxLevel: r.MaxLevel, AllowableClasses: r.RequiredClasses, SourceSpellID: C.spell.has(n(r.SourceSpellId)) ? r.SourceSpellId : "0",
    PrevQuestID: r.PrevQuestId, NextQuestID: r.NextQuestId, ExclusiveGroup: r.ExclusiveGroup, RewardMailTemplateID: r.RewardMailTemplateId,
    RewardMailDelay: r.RewardMailDelay, RequiredSkillID: r.RequiredSkillId, RequiredSkillPoints: r.RequiredSkillPoints,
    RequiredMinRepFaction: r.RequiredMinRepFaction, RequiredMaxRepFaction: r.RequiredMaxRepFaction, RequiredMinRepValue: r.RequiredMinRepValue,
    RequiredMaxRepValue: r.RequiredMaxRepValue, SpecialFlags: r.SpecialFlags,
  } as Row)).filter(r => Object.entries(r).some(([k, v]) => k !== "ID" && n(v)));
  const addon = [...master, ...sf];
  // Sniff: the spell the player casts right after accepting (QUEST_FLAGS_PLAYER_CAST_ACCEPT quests) is the SourceSpellID.
  for (const [id, spell] of Object.entries((SCRIPT.quest_source_spells_from_sniff ?? {}) as Record<string, number>)) {
    if (!questIds.has(Number(id)) || !C.spell.has(spell)) continue;
    const r = addon.find(x => n(x.ID) === Number(id)) ?? (addon.push({ ID: id } as Row), addon[addon.length - 1]);
    if (n(r.SourceSpellID) !== spell) { log(`quest_template_addon ${id}: SourceSpellID ${r.SourceSpellID ?? 0} -> ${spell} (sniff)`); r.SourceSpellID = String(spell); }
    spells.add(spell);
  }
  emit("quest_template_addon", addon, `ID IN (${Q})`, `ref_master (${master.length}), else ref_sfdb.quest_template columns (${sf.length}); SourceSpellID from the sniff`);
}
for (const t of ["quest_details", "quest_request_items", "quest_offer_reward", "quest_mail_sender"] as const) {
  const key = t === "quest_mail_sender" ? "QuestId" : "ID";
  emit(t, fetch("ref_master", t, `${key} IN (${Q})`), `${key} IN (${Q})`, "ref_master");
}
emit("quest_objectives", objectives, `QuestID IN (${Q})`, "ref_master (ConditionalAmount, ParentObjectiveID, Visible dropped)");
emit("quest_visual_effect", objectives.length ? fetch("ref_master", "quest_visual_effect", `ID IN (${list(objectives.map(o => n(o.ID)))})`) : [],
  `ID IN (${list(objectives.map(o => n(o.ID)))})`, "ref_master");
emit("quest_poi", fetch("ref_master", "quest_poi", `QuestID IN (${Q})`), `QuestID IN (${Q})`, "ref_master");
emit("quest_poi_points", fetch("ref_master", "quest_poi_points", `QuestID IN (${Q})`), `QuestID IN (${Q})`, "ref_master");
{
  const allCr = new Set([...newCrIds, ...worldCr]);
  for (const [t, all] of [["creature_queststarter", allCr], ["creature_questender", allCr],
    ["gameobject_queststarter", null], ["gameobject_questender", null]] as const) {
    const master = fetch("ref_master", t, `quest IN (${Q})`);
    const covered = new Set(master.map(r => n(r.quest)));
    const sf = fetch("ref_sfdb", t, `quest IN (${Q})`).filter(r => !covered.has(n(r.quest)));
    const rows = [...master, ...sf.map(r => ({ id: r.id, quest: r.quest } as Row))];
    // A giver the sniff saw is added when neither source has it (players excluded: those are pushes).
    for (const sq of Object.values(SNIFF.quests) as { id: number; starter?: unknown; ender?: unknown }[]) {
      const raw = t.endsWith("starter") ? sq.starter : sq.ender;
      const g = t.startsWith("creature") ? (typeof raw === "number" ? raw : undefined) : (typeof raw === "string" && raw.startsWith("go:") ? Number(raw.slice(3)) : undefined);
      if (g === undefined || !questIds.has(sq.id) || rows.some(r => n(r.quest) === sq.id && n(r.id) === g)) continue;
      log(`${t}: quest ${sq.id} giver ${g} from the sniff`);
      rows.push({ id: String(g), quest: String(sq.id), VerifiedBuild: "70449" });
    }
    const known = all ?? new Set([...worldGo, ...newGo.map(r => n(r.entry))]);
    const extra = rows.filter(r => !known.has(n(r.id)));
    const worldHas = new Set(extra.length ? q(`SELECT entry FROM ${BASE}.${t.startsWith("creature") ? "creature" : "gameobject"}_template WHERE entry IN (${list(extra.map(r => n(r.id)))})`).map(r => n(r.entry)) : []);
    const keep = rows.filter(r => known.has(n(r.id)) || worldHas.has(n(r.id)));
    for (const r of rows) if (!keep.includes(r)) log(`${t}: quest ${r.quest} giver ${r.id} has no template, skipped`);
    emit(t, keep, `quest IN (${Q})`, `ref_master, else ref_sfdb for quests master lacks (${sf.length}); givers with a template`);
  }
}
emit("areatrigger_involvedrelation", fetch("ref_master", "areatrigger_involvedrelation", `quest IN (${Q})`), `quest IN (${Q})`, "ref_master");

// ---- gossip --------------------------------------------------------------------------------------------------------
const menus = new Set(q(`SELECT MenuID FROM ref_master.creature_template_gossip WHERE CreatureID IN (${NEW})`).map(r => n(r.MenuID)));
for (const r of newGo) {
  const t = n(r.type), g = t === 2 ? n(r.Data3) : t === 10 ? n(r.Data19) : t === 0 ? n(r.Data6) : 0;
  if (g) menus.add(g);
}
// Menus world already has (shared class trainer menus etc.) stay as they are; the walk stops there.
const worldMenus = new Set<number>();
for (let i = 0; i < 4; i++) {
  for (const r of q(`SELECT DISTINCT MenuID FROM ${BASE}.gossip_menu WHERE MenuID IN (${list(menus)})`)) { worldMenus.add(n(r.MenuID)); menus.delete(n(r.MenuID)); }
  for (const r of q(`SELECT ActionMenuID FROM ref_master.gossip_menu_option WHERE MenuID IN (${list(menus)}) AND ActionMenuID<>0`))
    if (!worldMenus.has(n(r.ActionMenuID))) menus.add(n(r.ActionMenuID));
}
if (worldMenus.size) log(`gossip menus kept from world: ${[...worldMenus].join(",")}`);
const M = list(menus);
emit("creature_template_gossip", fetch("ref_master", "creature_template_gossip", `CreatureID IN (${NEW})`), `CreatureID IN (${NEW})`, "ref_master");
const gm = fetch("ref_master", "gossip_menu", `MenuID IN (${M})`);
emit("gossip_menu", gm, `MenuID IN (${M})`, "ref_master");
const opts = fetch("ref_master", "gossip_menu_option", `MenuID IN (${M})`);
emit("gossip_menu_option", opts, `MenuID IN (${M})`, "ref_master");
emit("gossip_menu_addon", fetch("ref_master", "gossip_menu_addon", `MenuID IN (${M})`), `MenuID IN (${M})`, "ref_master");
{
  const texts = new Set(gm.map(r => n(r.TextID)));
  const have = new Set(q(`SELECT ID FROM ${BASE}.npc_text WHERE ID IN (${list(texts)})`).map(r => n(r.ID)));
  const add = [...texts].filter(t => !have.has(t));
  emit("npc_text", add.length ? fetch("ref_master", "npc_text", `ID IN (${list(add)})`) : [], `ID IN (${list(add)})`, "ref_master, texts world lacks");
  const pois = new Set(opts.map(r => n(r.ActionPoiID)).filter(Boolean));
  emit("points_of_interest", pois.size ? fetch("ref_master", "points_of_interest", `ID IN (${list(pois)})`) : [], `ID IN (${list(pois)})`, "ref_master (gossip POIs)");
}


// ---- gossip seen in the sniff: real GossipOptionIDs, OptionNpc, SpellID and the menu text the client got ---------------
type SniffOption = { id: number; npc: number; orderIndex: number; flags: number; language: number; text: string; boxText: string; boxMoney: number; spell: number };
const sniffMenus = (SNIFF.menus as { entry: number; menu: number; broadcastText: number; options: SniffOption[] }[]).filter(m => m.menu);
const sniffGossip: string[] = [];
const sniffOptionIndex = new Map<string, number>();
{
  const ids = list(new Set(sniffMenus.map(m => m.menu)));
  const base = new Map<number, Row[]>();
  for (const r of [...fetch(BASE, "gossip_menu_option", `MenuID IN (${ids})${M === "NULL" ? "" : ` AND MenuID NOT IN (${M})`}`), ...opts.filter(o => sniffMenus.some(m => m.menu === n(o.MenuID)))])
    base.set(n(r.MenuID), [...(base.get(n(r.MenuID)) ?? []), { ...r }]);
  const optRows: Row[] = [], menuRows: Row[] = [], textRows: Row[] = [], linkRows: Row[] = [];
  const norm = (t: string | null) => (t ?? "").trim().toLowerCase();
  for (const m of sniffMenus) {
    const rows = base.get(m.menu) ?? [];
    base.set(m.menu, rows);
    for (const o of m.options) {
      let r = rows.find(x => n(x.GossipOptionID) === o.id) ?? rows.find(x => norm(x.OptionText) === norm(o.text) && !sniffMenus.some(sm => sm.menu === m.menu && sm.options.some(so => so.id === n(x.GossipOptionID) && so !== o)));
      if (!r) {
        const used = new Set(rows.map(x => n(x.OptionID)));
        let idx = o.orderIndex; while (used.has(idx)) idx++;
        r = { MenuID: String(m.menu), OptionID: String(idx), OptionText: o.text, OptionBroadcastTextID: "0", ActionMenuID: "0", ActionPoiID: "0",
          BoxCoded: "0", BoxMoney: String(o.boxMoney), BoxText: o.boxText, BoxBroadcastTextID: "0", VerifiedBuild: "70449" };
        rows.push(r); sniffGossip.push(`menu ${m.menu} option ${o.id} added`);
      }
      sniffOptionIndex.set(`${m.menu}:${o.id}`, n(r.OptionID));
      Object.assign(r, { GossipOptionID: String(o.id), OptionNpc: String(o.npc), Flags: String(o.flags), Language: String(o.language), SpellID: o.spell ? String(o.spell) : null });
    }
    // Menu text: an npc_text that carries the sniffed BroadcastText, else a new one (the 5.5.4 client never sees npc_text ids).
    const have = fetch(BASE, "gossip_menu", `MenuID=${m.menu}`).concat(gm.filter(g => n(g.MenuID) === m.menu));
    const texts = have.length ? fetch(BASE, "npc_text", `ID IN (${list(have.map(g => n(g.TextID)))})`).concat(fetch("ref_master", "npc_text", `ID IN (${list(have.map(g => n(g.TextID)))})`)) : [];
    const carries = (t: Row) => [0, 1, 2, 3, 4, 5, 6, 7].some(i => n(t[`BroadcastTextID${i}`]) === m.broadcastText);
    if (m.broadcastText && !texts.some(carries)) {
      const known = fetch(BASE, "npc_text", `BroadcastTextID0=${m.broadcastText}`)[0] ?? fetch("ref_master", "npc_text", `BroadcastTextID0=${m.broadcastText}`)[0];
      const id = known ? n(known.ID) : SNIFF_NPC_TEXT_BASE + m.menu;
      if (!known || !fetch(BASE, "npc_text", `ID=${id}`).length) textRows.push(known ?? { ID: String(id), Probability0: "1", BroadcastTextID0: String(m.broadcastText), VerifiedBuild: "70449" });
      menuRows.push({ MenuID: String(m.menu), TextID: String(id), VerifiedBuild: "70449" });
      sniffGossip.push(`menu ${m.menu} text ${m.broadcastText} (npc_text ${id})`);
    }
    // Sub-menus (reached through an option) are not creature menus: only link creatures that have none at all.
    if (!fetch(BASE, "creature_template_gossip", `CreatureID=${m.entry}`).length && !fetch("ref_master", "creature_template_gossip", `CreatureID=${m.entry}`).length
      && !linkRows.some(r => n(r.CreatureID) === m.entry)) {
      linkRows.push({ CreatureID: String(m.entry), MenuID: String(m.menu), VerifiedBuild: "70449" });
      sniffGossip.push(`creature ${m.entry} -> menu ${m.menu}`);
    }
  }
  for (const rows of base.values()) optRows.push(...rows);
  emit("gossip_menu_option", optRows, `MenuID IN (${ids})`, "sniff m1/m2 (70449) menus: base rows (world or master) with the retail GossipOptionID, OptionNpc, Flags, SpellID; missing options added");
  emit("npc_text", textRows, `ID IN (${list(textRows.map(r => n(r.ID)))})`, `sniff menu texts; new ids = ${SNIFF_NPC_TEXT_BASE} + MenuID`);
  emit("gossip_menu", menuRows, menuRows.length ? `(MenuID,TextID) IN (${menuRows.map(r => `(${r.MenuID},${r.TextID})`).join(",")})` : "0", "sniff menu texts");
  emit("creature_template_gossip", linkRows, linkRows.length ? `(CreatureID,MenuID) IN (${linkRows.map(r => `(${r.CreatureID},${r.MenuID})`).join(",")})` : "0", "sniff GOSSIP_MESSAGE");
  log(`gossip from the sniff: ${sniffGossip.join("; ")}`);
}

// ---- phasing, area auras, area triggers, spell data --------------------------------------------------------------------
const A = list(areas);
const phaseAreas = fetch("ref_master", "phase_area", `AreaId IN (${A})`).filter(r => {
  if (C.phase.has(n(r.PhaseId))) return true;
  log(`phase_area ${r.AreaId}/${r.PhaseId}: phase not in Phase.db2, dropped`); return false;
});
emit("phase_area", phaseAreas, `AreaId IN (${A})`, "ref_master, island areas (AreaTable parent 5736)");
{
  const ph = list(new Set(phaseAreas.map(r => n(r.PhaseId))));
  emit("phase_name", fetch("ref_master", "phase_name", `ID IN (${ph})`), `ID IN (${ph})`, "ref_master");
}
const spellArea = fetch("ref_master", "spell_area", `area IN (${A})`).filter(r => C.spell.has(n(r.spell)));
for (const r of spellArea) spells.add(n(r.spell));
emit("spell_area", spellArea, `area IN (${A})`, "ref_master, spells in SpellName.db2");
const AT = list(islandATs);
emit("areatrigger_scripts", fetch("ref_master", "areatrigger_scripts", `entry IN (${AT})`).filter(r => r.ScriptName === "SmartTrigger" || registered.has(r.ScriptName!)),
  `entry IN (${AT})`, "ref_master, island area triggers (AreaTrigger.db2 map 860) with a registered script");
emit("areatrigger_teleport", fetch("ref_master", "areatrigger_teleport", `ID IN (${AT})`), `ID IN (${AT})`, "ref_master");
{
  const sp = list([...spells].filter(s => C.spell.has(s)));
  emit("spell_script_names", fetch("ref_master", "spell_script_names", `ScriptName IN ('${[...registered].join("','")}')`),
    `ScriptName IN ('${[...registered].join("','")}')`, "ref_master, script names zone_the_wandering_isle.cpp registers");
  const haveTp = new Set(q(`SELECT DISTINCT ID FROM ${BASE}.spell_target_position WHERE ID IN (${sp})`).map(r => n(r.ID)));
  // TC only reads DB positions for TARGET_DEST_DB (17), TARGET_DEST_NEARBY_DB (106) and TARGET_DEST_NEARBY_ENTRY_OR_DB (142).
  const dbDest = (sp: number, idx: number) => (effBySpell.get(sp) ?? []).some(e => e.EffectIndex === idx && (e.ImplicitTarget as number[]).some(t => [17, 106, 142].includes(t)));
  const tp = fetch("ref_master", "spell_target_position", `ID IN (${sp})`).filter(r => !haveTp.has(n(r.ID))).filter(r => {
    if (dbDest(n(r.ID), n(r.EffectIndex))) return true;
    log(`spell_target_position ${r.ID}/${r.EffectIndex}: no DB destination target in the client SpellEffect, dropped`); return false;
  });
  const tpDel = list([...spells].filter(s => C.spell.has(s) && !haveTp.has(s)));
  emit("spell_target_position", tp, `ID IN (${tpDel})`, "ref_master, island spells world lacks");
  const ats = new Set<number>(), scenes = new Set<number>();
  for (const s of spells) for (const e of effBySpell.get(s) ?? []) {
    const misc = (e.EffectMiscValue as number[])[0];
    if ((e.Effect as number) === 179 && misc) ats.add(misc);
    if ((e.Effect as number) === 198 && misc) scenes.add(misc);
  }
  const haveAt = new Set(q(`SELECT Id FROM ${BASE}.areatrigger_create_properties WHERE IsCustom=0 AND Id IN (${list(ats)})`).map(r => n(r.Id)));
  const atp = fetch("ref_master", "areatrigger_create_properties", `IsCustom=0 AND Id IN (${list([...ats].filter(a => !haveAt.has(a)))})`);
  emit("areatrigger_create_properties", atp, `IsCustom=0 AND Id IN (${list(atp.map(r => n(r.Id)))})`, "ref_master, spell effect 179 targets world lacks");
  const att = list(new Set(atp.map(r => n(r.AreaTriggerId))));
  emit("areatrigger_template", fetch("ref_master", "areatrigger_template", `IsCustom=0 AND Id IN (${att})`), `IsCustom=0 AND Id IN (${att})`, "ref_master");
  const st = fetch("ref_master", "scene_template", `SceneId IN (${list(scenes)})`).filter(r => C.scene.has(n(r.ScriptPackageID)));
  emit("scene_template", st, `SceneId IN (${list(st.map(r => n(r.SceneId)))})`, "ref_master, spell effect 198 scenes in SceneScriptPackage.db2");
}

// ---- conditions ---------------------------------------------------------------------------------------------------
{
  const where = [
    `(SourceTypeOrReferenceId IN (14,15) AND SourceGroup IN (${M}))`,
    `(SourceTypeOrReferenceId IN (19,20) AND SourceEntry IN (${Q}))`,
    `(SourceTypeOrReferenceId=26 AND SourceEntry IN (${A}))`,
    // phase conditions for any area (SourceEntry 0), e.g. the per-class Pandaren start phases 592-598 the weapon racks sit in
    `(SourceTypeOrReferenceId=26 AND SourceEntry=0 AND SourceGroup IN (${list(phaseAreas.map(r => n(r.PhaseId)))}))`,
    `(SourceTypeOrReferenceId=18 AND SourceGroup IN (${NEW}))`,
    `(SourceTypeOrReferenceId=23 AND SourceGroup IN (${NEW}))`,
    `(SourceTypeOrReferenceId=22 AND ((SourceId=0 AND (SourceEntry IN (${NEW}) OR -SourceEntry IN (${list(crGuid.keys())}))) OR (SourceId=1 AND -SourceEntry IN (${list(goGuid.keys())})) OR (SourceId IN (2,9))))`,
  ];
  const master = fetch("ref_master", "conditions", where.join(" OR "));
  const saiSet = new Set(saiRows.map(r => `${r.entryorguid}:${r.source_type}`));
  const conds = master.flatMap(r => {
    const st = n(r.SourceTypeOrReferenceId);
    const o = { ...r };
    if (st === 22) {
      let e = n(r.SourceEntry);
      if (e < 0) e = -((n(r.SourceId) === 1 ? goGuidOf(-e) : crGuidOf(-e)) ?? -e);
      if (!saiSet.has(`${e}:${r.SourceId}`)) return [];
      o.SourceEntry = String(e);
    }
    return [o];
  });
  const keys = conds.map(r => `(${r.SourceTypeOrReferenceId},${r.SourceGroup},${r.SourceEntry},${r.SourceId})`);
  emit("conditions", conds, keys.length ? `(SourceTypeOrReferenceId,SourceGroup,SourceEntry,SourceId) IN (${[...new Set(keys)].join(",")})` : "0",
    "ref_master: gossip, quest, phase, spellclick, SAI conditions of the rows above");
}

// ---- 31450 A New Fate finale, as retail does it (sniff m2 #103842-#104811) ---------------------------------------------------
{
  const tp = SNIFF.teleports.find((t: { spell: number }) => t.spell === 116957);
  if (!tp) throw new Error("sniff has no 116957 teleport");
  // 116957/116962: effect 0 BIND, effect 1 TELEPORT_UNITS, both TARGET_DEST_DB (client SpellEffect).
  const dest = [
    { ID: 116957, MapID: tp.map, X: tp.x, Y: tp.y, Z: tp.z, O: tp.o, src: tp.src },
    { ID: 116962, MapID: 1, X: 1357.62, Y: -4373.55, Z: 26.13, O: 0.13, src: "TODO(verify): SkyFire 5.4.8 HandleSelectFactionOpcode, no Horde sniff" },
  ];
  emit("spell_target_position", dest.flatMap(d => [0, 1].map(e => ({ ID: String(d.ID), EffectIndex: String(e), OrderIndex: "0", MapID: String(d.MapID),
    PositionX: String(d.X), PositionY: String(d.Y), PositionZ: String(d.Z), Orientation: String(d.O), VerifiedBuild: d.ID === 116957 ? "70449" : "0" } as Row))),
    "ID IN (116957,116962)", `Pandaren Alliance/Horde Teleport: Alliance from ${tp.src} (TRANSFER_PENDING/NEW_WORLD), Horde from SkyFire`);
  emit("spell_script_names", [{ spell_id: "108897", ScriptName: "spell_pandaren_faction_choice" },
    { spell_id: "130422", ScriptName: "spell_pandaren_balloon_exit_movie_timer" }, { spell_id: "132211", ScriptName: "spell_pandaren_balloon_exit_movie_timer" }],
    "ScriptName IN ('spell_pandaren_faction_choice','spell_pandaren_balloon_exit_movie_timer')", "our scripts for the faction choice (spell names: client/5.4.8 Spell.dbc)");
  emit("event_script_names", [{ Id: "31336", ScriptName: "event_pandaren_faction_chosen" }, { Id: "31337", ScriptName: "event_pandaren_faction_chosen" }],
    "Id IN (31336,31337)", "SEND_EVENT of 113244/113245 Faction Choice Trigger Spell (client SpellEffect)");
  const say = (group: number, text: string, src: string): Row => ({ CreatureID: "56013", GroupID: String(group), ID: "0", Text: text, Type: "12", Language: "0",
    Probability: "100", Emote: "0", Duration: "0", Sound: "0", SoundPlayType: "0", BroadcastTextId: "0", TextRange: "0", comment: `Spirit of Master Shang Xi - sniff ${src}` });
  emit("creature_text", [
    say(0, "You've all accomplished a great thing in saving Shen-zin Su. You do us all proud.", "m2#103868 (31450 accept)"),
    say(1, "It seems your journeys are not done. These new allies of ours come from a broken world that could use our help.", "m2#104186 (6.4 s after the choice)"),
  ], "CreatureID=56013 AND GroupID IN (0,1)", "sniff SMSG_CHAT (MonsterSay)");
  // Aysa waits where the teleport lands (sniff CreateObject, map 0); phase 1231 is shown on arrival and removed after 30987 is taken.
  const AYSA = { x: -9061.311, y: 433.7604, z: 93.139175, o: 0.648932456970214843 };
  const rel = Math.atan2(AYSA.y - tp.y, AYSA.x - tp.x) - tp.o, dist = Math.hypot(AYSA.x - tp.x, AYSA.y - tp.y);
  const ji = { x: 1357.62 + dist * Math.cos(0.13 + rel), y: -4373.55 + dist * Math.sin(0.13 + rel), z: 26.13, o: 0.13 + (AYSA.o - tp.o) };
  const spawn = (guid: number, id: number, map: number, zone: number, p: { x: number; y: number; z: number; o: number }, vb: string): Row => ({
    guid: String(guid), id: String(id), map: String(map), zoneId: String(zone), areaId: "0", spawnDifficulties: "0", phaseUseFlags: "0", PhaseId: "1231", PhaseGroup: "0",
    terrainSwapMap: "-1", modelid: "0", equipment_id: "0", position_x: p.x.toFixed(4), position_y: p.y.toFixed(4), position_z: p.z.toFixed(4), orientation: p.o.toFixed(4),
    spawntimesecs: "120", wander_distance: "0", currentwaypoint: "0", curHealthPct: null, MovementType: "0", npcflag: null, unit_flags: null, unit_flags2: null, unit_flags3: null,
    ScriptName: "", StringId: null, VerifiedBuild: vb });
  emit("creature", [spawn(FINALE_GUID, 60566, 0, 1519, AYSA, "70449"), spawn(FINALE_GUID + 1, 60570, 1, 1637, ji, "0")],
    `guid IN (${FINALE_GUID},${FINALE_GUID + 1})`, "Aysa: sniff m2 CreateObject (Stormwind, phase 1231); Ji: TODO(verify) same offset from the SkyFire Horde arrival");
  emit("phase_area", [{ AreaId: "1519", PhaseId: "1231", Comment: "Stormwind - Aysa after A New Fate" }, { AreaId: "1637", PhaseId: "1231", Comment: "Orgrimmar - Ji after A New Fate" }],
    "PhaseId=1231 AND AreaId IN (1519,1637)", "sniff m2 #104253 (phase 1231 added on arrival, removed with 30987)");
  // CONDITION_QUESTSTATE (47) masks: 1 none, 2 complete, 64 rewarded; CONDITION_QUESTTAKEN (9) = in the log, incomplete.
  const cond = (st: number, grp: number, entry: number, src: number, type: number, v1: number, v2: number, c: string): Row => ({
    SourceTypeOrReferenceId: String(st), SourceGroup: String(grp), SourceEntry: String(entry), SourceId: String(src), ElseGroup: "0",
    ConditionTypeOrReference: String(type), ConditionTarget: "0", ConditionValue1: String(v1), ConditionValue2: String(v2), ConditionValue3: "0",
    ConditionStringValue1: "", NegativeCondition: "0", ErrorType: "0", ErrorTextId: "0", ScriptName: "", Comment: c });
  const shangXiOption = sniffOptionIndex.get("13726:126168");
  if (shangXiOption === undefined) throw new Error("sniff gossip 13726/126168 missing");
  emit("conditions", [
    cond(26, 1231, 1519, 0, 47, 31450, 66, "Phase 1231 in Stormwind: A New Fate complete or rewarded"),
    cond(26, 1231, 1519, 0, 47, 30987, 1, "Phase 1231 in Stormwind: Joining the Alliance not taken"),
    cond(26, 1231, 1637, 0, 47, 31450, 66, "Phase 1231 in Orgrimmar: A New Fate complete or rewarded"),
    cond(26, 1231, 1637, 0, 47, 31012, 1, "Phase 1231 in Orgrimmar: Joining the Horde not taken"),
    cond(15, 13726, shangXiOption, 0, 9, 31450, 0, "Spirit of Master Shang Xi - I'm ready to decide: A New Fate in the log"),
  ], `(SourceTypeOrReferenceId=26 AND SourceGroup=1231 AND SourceEntry IN (1519,1637)) OR (SourceTypeOrReferenceId=15 AND SourceGroup=13726)`,
    "sniff m2: phase 1231 window and the 13726 option while 31450 is open");
}

// ---- second-half script data (tools/mop-content/data/wandering_isle_script.json, written with the C++ from the sniff) ------
{
  if (existsSync(SCRIPT_FILE)) {
    const data = SCRIPT as { rows?: Record<string, Record<string, unknown>[]>; updates?: { table: string; where: Record<string, unknown>; set: Record<string, unknown>; source?: string }[] };
    const pks = new Map<string, string[]>();
    for (const r of q(`SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='world' AND CONSTRAINT_NAME='PRIMARY' ORDER BY TABLE_NAME, ORDINAL_POSITION`) as Row[])
      pks.set(r.TABLE_NAME!, [...(pks.get(r.TABLE_NAME!) ?? []), r.COLUMN_NAME!]);
    const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
    for (const [table, rows] of Object.entries(data.rows ?? {})) {
      // Tables without a primary key (spell_script_names) are keyed by every column the rows carry.
      const key = pks.get(table) ?? Object.keys(rows[0] ?? {}).filter(k => !k.startsWith("_"));
      const clean = rows.map(r => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith("_")).map(([k, v]) => [k, str(v)])) as Row);
      const tuples = [...new Set(clean.map(r => `(${key.map(k => (/^-?\d+(\.\d+)?$/.test(r[k] ?? "") ? r[k] : `'${(r[k] ?? "").replace(/'/g, "\\'")}'`)).join(",")})`))];
      emit(table, clean, tuples.length ? `(${key.map(k => `\`${k}\``).join(",")}) IN (${tuples.join(",")})` : "0", "wandering_isle_script.json (second half, from the sniff)");
    }
    for (const u of data.updates ?? []) {
      const lit = (v: unknown) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "\\'")}'`);
      out.push(`-- ${u.table}: wandering_isle_script.json update (${u.source ?? ""})`);
      out.push(`UPDATE \`${u.table}\` SET ${Object.entries(u.set).map(([k, v]) => `\`${k}\`=${lit(v)}`).join(", ")} WHERE ${Object.entries(u.where).map(([k, v]) => `\`${k}\`=${lit(v)}`).join(" AND ")};`, "");
    }
  }
}

// ---- header ------------------------------------------------------------------------------------------------------
const head = [
  "-- MoP Classic: the Wandering Isle (map 860): spawns, templates, quests, gossip, SmartAI, phasing.",
  "-- Generated by tools/mop-content/gen_wandering_isle.ts; do not edit by hand.",
  "-- Sources: ref_master = TrinityCore master TDB 1210 (rows), ref_sfdb = SkyFire 5.4.8 SFDB 26 (creature and quest levels).",
  `-- Spawn guids = master guid + ${OFFSET} (creature ${CRG.replace("guid ", "")}, gameobject ${GOG.replace("guid ", "")}).`,
  "-- Client checks: SpellName, CreatureDisplayInfo, GameObjectDisplayInfo, Item, QuestV2, Phase, SoundKit, Vehicle DB2s.",
  "",
];
writeFileSync(outFile, [...head, ...out].join("\n").replace(/\n+$/, "\n"));
log(`wrote ${outFile}`);
log(summary.join("\n"));
log(`entries: ${crEntries.size} creatures (${newCrIds.size} new), ${goEntries.size} gameobjects (${newGo.length} new), ${questIds.size} quests, ${spells.size} spells`);
