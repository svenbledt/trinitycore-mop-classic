// Generates the world-DB updates that populate Pandaria (map 870): NPCs, objects, loot, vendors, gossip, SmartAI, quests.
// usage: bun tools/mop-content/gen_pandaria.ts <db2 dir> [out dir] [mysql container]
// Spawns come from ref_sfdb (SkyFire 5.4.8); ref_master (TC master TDB 1210) fills spawns SkyFire lacks and supplies the
// modern-client structure (template columns SkyFire has no equivalent for, gossip, quests). Rules: docs/mop-port/pandaria-import.md.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { db2Sets, list, mysql, n, ownKeys, root, type Row, SqlOut } from "./src/worlddb.ts";

const [db2Dir, outDir = "sql/updates/world/mop_classic", container = "tc-mop-db-1"] = process.argv.slice(2);
if (!db2Dir) throw new Error("usage: gen_pandaria.ts <db2 dir> [out dir] [container]");
const FILES = {
  tmpl: "2026_10_19_20_world.sql", crSpawn: "2026_10_19_21_world.sql", goSpawn: "2026_10_19_22_world.sql",
  npc: "2026_10_19_23_world.sql", quest: "2026_10_19_24_world.sql",
};
const MAP = 870;
// Spawn guid = source guid + offset: SkyFire 30M (max 38.2M), master 40M (max 49.8M); world max is below 9.6M.
const SF_GUID = 30_000_000, MA_GUID = 40_000_000;
// Loot ids that cannot keep their source id: references always (their contents differ per DB), chests always, the rest on collision.
const REF_SF = 6_000_000, REF_MA = 7_000_000, GOLOOT_SF = 5_000_000, GOLOOT_MA = 5_500_000, GOLOOT_QI = 6_500_000;  // gameobject_loot_template ranges: SkyFire 5.0M, master 5.5M, quest items 6.5M (+ entry)
const LOOT_REMAP: Record<string, number> = { creature_loot_template: 5_200_000, pickpocketing_loot_template: 5_300_000, skinning_loot_template: 5_400_000 };
// Retail sniff levels/health (gen_creature_sniff_health.ts) win over SkyFire; that file runs before ours, so we carry them.
const SNIFF_HEALTH = root("sql/updates/world/mop_classic/2026_10_19_02_world.sql");

const q = mysql(container);
const log = (s: string) => console.error(s);
const fetch = (db: string, table: string, where: string) => q(`SELECT * FROM ${db}.\`${table}\` WHERE ${where}`);
const own = ownKeys(Object.values(FILES).map(f => `${outDir}/${f}`), f => (existsSync(f) ? readFileSync(f, "utf8") : undefined));
// Keys `world` has that a previous run of this generator did not write.
function inWorld(table: string, col: string, ids: Iterable<number>, extra = "") {
  const mine = own.get(`${table}.${col}`) ?? new Set<number>();
  const l = list(ids);
  if (l === "NULL") return new Set<number>();
  return new Set(q(`SELECT DISTINCT \`${col}\` k FROM world.\`${table}\` WHERE \`${col}\` IN (${l})${extra}`).map(r => n(r.k)).filter(k => !mine.has(k)));
}

// ---- client data (5.5.4.70449 DB2s) --------------------------------------------------------------------------------------
const D = db2Sets(db2Dir);
const C = {
  spell: D.ids("SpellName"), display: D.ids("CreatureDisplayInfo"), goDisplay: D.ids("GameObjectDisplayInfo"), item: D.ids("Item"),
  quest: D.ids("QuestV2"), phase: D.ids("Phase"), factionTemplate: D.ids("FactionTemplate"), faction: D.ids("Faction"),
  vehicle: D.ids("Vehicle"), sound: D.ids("SoundKit"), emote: D.ids("Emotes"), family: D.ids("CreatureFamily"),
  extCost: D.ids("ItemExtendedCost"), currency: D.ids("CurrencyTypes"), lock: D.ids("Lock"), skill: D.ids("SkillLine"),
};
// Auras with a duration are refused in *_addon.auras by the core; SpellMisc.DurationIndex -> SpellDuration.Duration.
const durations = new Map(D.rows("SpellDuration").map(r => [r.ID as number, r.Duration as number]));
const timedAura = new Set(D.rows("SpellMisc").filter(r => (durations.get(r.DurationIndex as number) ?? 0) > 0).map(r => r.SpellID as number));
// unit_flags* bits the core strips from DB rows (UnitDefines.h *_DISALLOWED); stripped here so the log stays readable.
const allowed = (() => {
  const src = readFileSync(root("src/server/game/Entities/Unit/UnitDefines.h"), "utf8");
  const val = new Map([...src.matchAll(/^\s*(UNIT_FLAG\w*)\s*=\s*(0x[0-9A-Fa-f]+)/gm)].map(m => [m[1], Number(m[2])]));
  const mask = (name: string) => {
    const expr = src.match(new RegExp(`${name}\\s*=\\s*\\(([^;]*?)\\),?\\s*//\\s*SKIP`, "s"))![1].replace(/\/\*.*?\*\//gs, "");
    return expr.split("|").map(s => s.trim()).filter(Boolean).reduce((a, s) => { if (!val.has(s)) throw new Error(`${name}: ${s}`); return (a | val.get(s)!) >>> 0; }, 0);
  };
  return { unit_flags: ~mask("UNIT_FLAG_DISALLOWED") >>> 0, unit_flags2: ~mask("UNIT_FLAG2_DISALLOWED") >>> 0, unit_flags3: ~mask("UNIT_FLAG3_DISALLOWED") >>> 0 };
})();
const strip = (k: "unit_flags" | "unit_flags2" | "unit_flags3", v: string | null) => String((n(v) >>> 0 & allowed[k]) >>> 0 | 0);
// Lock id field per GO type (GameObjectData.h): door/button data1, fishing hole data4, the others data0.
const LOCK_FIELD: Record<number, string> = { 0: "Data1", 1: "Data1", 2: "Data0", 3: "Data0", 6: "Data0", 10: "Data0", 12: "Data0", 13: "Data0", 24: "Data0", 25: "Data4", 26: "Data0" };
const phaseGroups = new Set(D.rows("PhaseXPhaseGroup").map(r => r.PhaseGroupID as number));
const areaRows = D.rows("AreaTable").filter(r => r.ContinentID === MAP);
const areas = new Set(areaRows.map(r => r.ID as number));
const zones = areaRows.filter(r => r.ParentAreaID === 0).map(r => r.ID as number);
const effBySpell = new Map<number, Record<string, unknown>[]>();
for (const e of D.rows("SpellEffect")) effBySpell.set(e.SpellID as number, [...(effBySpell.get(e.SpellID as number) ?? []), e]);
log(`Pandaria zones (AreaTable ContinentID ${MAP}, no parent): ${zones.join(",")}; ${areas.size} areas`);

// ---- scripts the port builds (minimal-static = Commands + Spells, plus Pandaria) -------------------------------------------
const registered = new Set<string>();
for (const dir of ["Commands", "Spells", "Pandaria"]) {
  for (const f of new Bun.Glob("**/*.cpp").scanSync(root(`src/server/scripts/${dir}`))) {
    const src = readFileSync(root(`src/server/scripts/${dir}/${f}`), "utf8");
    for (const m of src.matchAll(/Register\w*\((\w+)/g)) registered.add(m[1]);
    for (const m of src.matchAll(/\w*Script\("(\w+)"\)/g)) registered.add(m[1]);
  }
}
const keepScript = (s: string | null | undefined) => (s && registered.has(s) ? s : "");

// ---- spawns ------------------------------------------------------------------------------------------------------------
const sfEvCr = new Set(q(`SELECT guid FROM ref_sfdb.game_event_creature`).map(r => n(r.guid)));
const sfEvGo = new Set(q(`SELECT guid FROM ref_sfdb.game_event_gameobject`).map(r => n(r.guid)));
const maEvCr = new Set(q(`SELECT guid FROM ref_master.game_event_creature`).map(r => n(r.guid)));
const maEvGo = new Set(q(`SELECT guid FROM ref_master.game_event_gameobject`).map(r => n(r.guid)));
let sfCr = fetch("ref_sfdb", "creature", `map=${MAP} ORDER BY guid`);
let sfGo = fetch("ref_sfdb", "gameobject", `map=${MAP} ORDER BY guid`);
log(`skyfire spawns in game events (event ids differ per DB), skipped: ${sfCr.filter(r => sfEvCr.has(n(r.guid))).length} creatures, ${sfGo.filter(r => sfEvGo.has(n(r.guid))).length} gameobjects`);
sfCr = sfCr.filter(r => !sfEvCr.has(n(r.guid)));
sfGo = sfGo.filter(r => !sfEvGo.has(n(r.guid)));
// Master spawns with no SkyFire spawn of the same entry within 20 yards (master's map 870 data is mostly phased scenes).
const near = (t: string) => `NOT EXISTS (SELECT 1 FROM ref_sfdb.${t} s WHERE s.map=${MAP} AND s.id=m.id AND ABS(s.position_x-m.position_x)<20 AND ABS(s.position_y-m.position_y)<20)`;
let maCr = q(`SELECT m.* FROM ref_master.creature m WHERE m.map=${MAP} AND ${near("creature")} ORDER BY m.guid`).filter(r => !maEvCr.has(n(r.guid)));
let maGo = q(`SELECT m.* FROM ref_master.gameobject m WHERE m.map=${MAP} AND ${near("gameobject")} ORDER BY m.guid`).filter(r => !maEvGo.has(n(r.guid)));

const crEntries = new Set([...sfCr, ...maCr].map(r => n(r.id)));
const goEntries = new Set([...sfGo, ...maGo].map(r => n(r.id)));

// ---- source templates ----------------------------------------------------------------------------------------------------
const sfT = new Map<number, Row>(), maT = new Map<number, Row>(), sfG = new Map<number, Row>(), maG = new Map<number, Row>();
function loadTemplates() {
  const needCr = [...crEntries].filter(e => !sfT.has(e) && !maT.has(e)), needGo = [...goEntries].filter(e => !sfG.has(e) && !maG.has(e));
  if (needCr.length) {
    for (const r of fetch("ref_sfdb", "creature_template", `entry IN (${list(needCr)})`)) sfT.set(n(r.entry), r);
    for (const r of fetch("ref_master", "creature_template", `entry IN (${list(needCr)})`)) maT.set(n(r.entry), r);
  }
  if (needGo.length) {
    for (const r of fetch("ref_sfdb", "gameobject_template", `entry IN (${list(needGo)})`)) sfG.set(n(r.entry), r);
    for (const r of fetch("ref_master", "gameobject_template", `entry IN (${list(needGo)})`)) maG.set(n(r.entry), r);
  }
}

// ---- AI: SkyFire SmartAI, else master SmartAI ----------------------------------------------------------------------------
const aiSrc = new Map<number, "sf" | "ma">();
const sai: { db: string; row: Row }[] = [];
const saiKeys = new Set<string>();
const addSai = (db: string, rows: Row[]) => { for (const r of rows) { const k = `${db}:${r.entryorguid}:${r.source_type}:${r.id}:${r.link}`; if (!saiKeys.has(k)) { saiKeys.add(k); sai.push({ db, row: r }); } } };
const maGuidSet = () => new Set(maCr.map(r => n(r.guid)));
const spells = new Set<number>();

function expand() {
  for (let round = 0; round < 8; round++) {
    loadTemplates();
    const before = crEntries.size + goEntries.size + sai.length;
    for (const e of crEntries) {
      for (const t of [sfT.get(e), maT.get(e)]) for (const k of ["KillCredit1", "KillCredit2"]) if (t && n(t[k])) crEntries.add(n(t[k]));
      if (aiSrc.has(e)) continue;
      if (sfT.get(e)?.AIName === "SmartAI") aiSrc.set(e, "sf");
      else if (maT.get(e)?.AIName === "SmartAI") aiSrc.set(e, "ma");
    }
    const sfAi = [...aiSrc].filter(([, s]) => s === "sf").map(([e]) => e), maAi = [...aiSrc].filter(([, s]) => s === "ma").map(([e]) => e);
    addSai("ref_sfdb", fetch("ref_sfdb", "smart_scripts", `source_type=0 AND entryorguid IN (${list(sfAi)})`));
    addSai("ref_master", fetch("ref_master", "smart_scripts", `source_type=0 AND (entryorguid IN (${list(maAi)}) OR -entryorguid IN (${list(maGuidSet())}))`));
    const lists = { ref_sfdb: new Set<number>(), ref_master: new Set<number>() } as Record<string, Set<number>>;
    for (const { db, row: r } of sai) {
      const a = n(r.action_type), p = [1, 2, 3, 4, 5, 6].map(i => n(r[`action_param${i}`]));
      if (a === 80) lists[db].add(p[0]);
      if (a === 87) p.filter(Boolean).forEach(x => lists[db].add(x));
      if (a === 88) for (let x = p[0]; x && x <= p[1]; x++) lists[db].add(x);
      if (a === 12) crEntries.add(p[0]);
      if (a === 50) goEntries.add(p[0]);
      if ([11, 85, 86, 134].includes(a)) spells.add(p[0]);
      const t = n(r.target_type), tp = n(r.target_param1);
      if ([9, 11, 19].includes(t) && tp) crEntries.add(tp);
      if ([13, 15, 20].includes(t) && tp) goEntries.add(tp);
    }
    for (const db of ["ref_sfdb", "ref_master"]) if (lists[db].size) addSai(db, fetch(db, "smart_scripts", `source_type=9 AND entryorguid IN (${list(lists[db])})`));
    for (const r of q(`SELECT accessory_entry e FROM ref_master.vehicle_template_accessory WHERE entry IN (${list(crEntries)})
      UNION SELECT entry FROM ref_master.creature_summon_groups WHERE summonerType=0 AND summonerId IN (${list(crEntries)}) AND entry<>0`)) crEntries.add(n(r.e));
    for (const s of [...spells]) for (const e of effBySpell.get(s) ?? []) {
      const misc = (e.EffectMiscValue as number[])[0];
      if ((e.Effect as number) === 28 && misc) crEntries.add(misc);
      if (e.EffectTriggerSpell) spells.add(e.EffectTriggerSpell as number);
    }
    crEntries.delete(0); goEntries.delete(0);
    if (crEntries.size + goEntries.size + sai.length === before) break;
  }
  loadTemplates();
}
expand();

// ---- quests (master structure; SkyFire levels and missing givers) -----------------------------------------------------------
const worldQuests = inWorld("quest_template", "ID", q(`SELECT ID FROM ref_master.quest_template WHERE QuestSortID IN (${list(zones)})
  UNION SELECT quest FROM ref_master.creature_queststarter WHERE id IN (${list(crEntries)}) UNION SELECT quest FROM ref_sfdb.creature_queststarter WHERE id IN (${list(crEntries)})`).map(r => n(r.ID)));
const questIds = new Set<number>();
{
  const cand = q(`SELECT ID FROM ref_master.quest_template WHERE QuestSortID IN (${list(zones)})
    UNION SELECT quest FROM ref_master.creature_queststarter WHERE id IN (${list(crEntries)}) UNION SELECT quest FROM ref_master.creature_questender WHERE id IN (${list(crEntries)})
    UNION SELECT quest FROM ref_sfdb.creature_queststarter WHERE id IN (${list(crEntries)}) UNION SELECT quest FROM ref_sfdb.creature_questender WHERE id IN (${list(crEntries)})
    UNION SELECT quest FROM ref_master.gameobject_queststarter WHERE id IN (${list(goEntries)}) UNION SELECT quest FROM ref_master.gameobject_questender WHERE id IN (${list(goEntries)})
    UNION SELECT quest FROM ref_sfdb.gameobject_queststarter WHERE id IN (${list(goEntries)}) UNION SELECT quest FROM ref_sfdb.gameobject_questender WHERE id IN (${list(goEntries)})`).map(r => n(r.ID));
  const inMaster = new Set(cand.length ? q(`SELECT ID FROM ref_master.quest_template WHERE ID IN (${list(cand)})`).map(r => n(r.ID)) : []);
  const skipped: Record<string, number[]> = { "already in world": [], "not in QuestV2.db2": [], "SkyFire only (no master row to map)": [] };
  for (const id of new Set(cand)) {
    if (worldQuests.has(id)) skipped["already in world"].push(id);
    else if (!C.quest.has(id)) skipped["not in QuestV2.db2"].push(id);
    else if (!inMaster.has(id)) skipped["SkyFire only (no master row to map)"].push(id);
    else questIds.add(id);
  }
  for (const [why, ids] of Object.entries(skipped)) if (ids.length) log(`quests skipped, ${why}: ${ids.length} (${ids.slice(0, 40).join(",")}${ids.length > 40 ? ",..." : ""})`);
}
const objectives = fetch("ref_master", "quest_objectives", `QuestID IN (${list(questIds)})`);
for (const o of objectives) {
  if (n(o.Type) === 0 && n(o.ObjectID)) crEntries.add(n(o.ObjectID));
  if (n(o.Type) === 2 && n(o.ObjectID)) goEntries.add(n(o.ObjectID));
}
// Givers of those quests get their templates too (phased, summoned or spawned outside map 870).
for (const db of ["ref_master", "ref_sfdb"]) {
  for (const r of q(`SELECT id FROM ${db}.creature_queststarter WHERE quest IN (${list(questIds)}) UNION SELECT id FROM ${db}.creature_questender WHERE quest IN (${list(questIds)})`)) crEntries.add(n(r.id));
  for (const r of q(`SELECT id FROM ${db}.gameobject_queststarter WHERE quest IN (${list(questIds)}) UNION SELECT id FROM ${db}.gameobject_questender WHERE quest IN (${list(questIds)})`)) goEntries.add(n(r.id));
}
expand();

// ---- which creature templates are ours -------------------------------------------------------------------------------------
const worldCr = inWorld("creature_template", "entry", crEntries);
const noTmpl = [...crEntries].filter(e => !worldCr.has(e) && !sfT.has(e) && !maT.has(e));
if (noTmpl.length) log(`creatures without a template in SkyFire, master or world, spawns dropped: ${noTmpl.join(",")}`);
const newCrIds = new Set([...crEntries].filter(e => !worldCr.has(e) && (sfT.has(e) || maT.has(e))));
log(`creature templates kept from world (${worldCr.size}): ${[...worldCr].join(",")}`);
const NEW = list(newCrIds);
const isNew = (e: number) => newCrIds.has(e);
for (const e of [...aiSrc.keys()]) if (!isNew(e)) aiSrc.delete(e);

// SkyFire level/health, sniff over it.
const sniffHealth = new Map<number, { min: string; max: string; hse: string; mod: string }>();
for (const m of readFileSync(SNIFF_HEALTH, "utf8").matchAll(/`MinLevel` = (\d+), `MaxLevel` = (\d+), `HealthScalingExpansion` = (\d+), `HealthModifier` = ([\d.e-]+) WHERE `Entry` = (\d+)/g))
  sniffHealth.set(Number(m[5]), { min: m[1], max: m[2], hse: m[3], mod: m[4] });

const outs = Object.fromEntries(Object.keys(FILES).map(k => [k, new SqlOut(q)])) as Record<keyof typeof FILES, SqlOut>;
const T = outs.tmpl, S = outs.crSpawn, G = outs.goSpawn, N = outs.npc, Q = outs.quest;

// ---- creature_template + difficulty ------------------------------------------------------------------------------------------
const pick = <T,>(...vs: (T | null | undefined)[]) => vs.find(v => v !== undefined && v !== null);
const gossipFromMaster = new Set(q(`SELECT DISTINCT CreatureID FROM ref_master.creature_template_gossip WHERE CreatureID IN (${NEW})`).map(r => n(r.CreatureID)));
const questGivers = new Set<number>();
for (const db of ["ref_master", "ref_sfdb"]) for (const r of q(`SELECT id FROM ${db}.creature_queststarter WHERE quest IN (${list(questIds)}) UNION SELECT id FROM ${db}.creature_questender WHERE quest IN (${list(questIds)})`)) questGivers.add(n(r.id));
const crRows: Row[] = [], diffRows: Row[] = [];
const maDiff = new Map(fetch("ref_master", "creature_template_difficulty", `Entry IN (${NEW}) AND DifficultyID=0`).map(r => [n(r.Entry), r]));
let gossipFlagAdded = 0, sniffed = 0;
for (const e of [...newCrIds].sort((a, b) => a - b)) {
  const s = sfT.get(e), m = maT.get(e);
  const r: Row = m ? { ...m } : {
    entry: String(e), KillCredit1: s!.KillCredit1, KillCredit2: s!.KillCredit2, femaleName: null, TitleAlt: null, RequiredExpansion: s!.exp,
    VignetteID: "0", BaseVariance: "1", RangeVariance: "1", unit_flags3: "0", PetSpellDataId: s!.PetSpellDataId, ExperienceModifier: "1",
    movementId: s!.movementId, WidgetSetID: "0", WidgetSetUnitConditionID: "0", CreatureImmunitiesId: "0", flags_extra: s!.flags_extra, StringId: null, VerifiedBuild: "0",
  };
  if (s) {
    let faction = s.faction_A;
    if (!C.factionTemplate.has(n(faction))) { log(`creature ${e}: SkyFire faction ${faction} not in FactionTemplate.db2, master ${m?.faction ?? "-"}`); faction = m?.faction ?? "35"; }
    let family = s.family;
    if (n(family) && !C.family.has(n(family))) { log(`creature ${e}: family ${family} not in CreatureFamily.db2, cleared`); family = "0"; }
    let vehicle = s.VehicleId;
    if (n(vehicle) && !C.vehicle.has(n(vehicle))) { log(`creature ${e}: VehicleId ${vehicle} not in Vehicle.db2, master ${m?.VehicleId ?? 0}`); vehicle = m && C.vehicle.has(n(m.VehicleId)) ? m.VehicleId : "0"; }
    let npcflag = BigInt(s.npcflag ?? 0) & 0xFFFFFFFFn;  // SkyFire stores it signed
    if (gossipFromMaster.has(e) && !(npcflag & 1n) && m && BigInt(m.npcflag ?? 0) & 1n) { npcflag |= 1n; gossipFlagAdded++; }
    Object.assign(r, {
      name: s.name, subname: s.subname ?? "", IconName: s.IconName ?? "", faction, npcflag: String(npcflag), speed_walk: s.speed_walk, speed_run: s.speed_run,
      scale: s.scale, Classification: s.npc_rank, dmgschool: s.dmgschool, BaseAttackTime: s.baseattacktime, RangeAttackTime: s.rangeattacktime,
      unit_class: s.unit_class, unit_flags: strip("unit_flags", s.unit_flags), unit_flags2: strip("unit_flags2", s.unit_flags2), family, trainer_class: s.trainer_class, type: s.type,
      VehicleId: vehicle, MovementType: s.MovementType, RacialLeader: s.RacialLeader, RegenHealth: s.RegenHealth, Civilian: n(s.flags_extra) & 2 ? "1" : "0",
    });
  } else r.Civilian = n(m!.flags_extra) & 2 ? "1" : "0";
  if (!C.factionTemplate.has(n(r.faction))) { log(`creature ${e}: faction ${r.faction} not in FactionTemplate.db2, set to 35`); r.faction = "35"; }
  if (questGivers.has(e)) r.npcflag = String(BigInt(r.npcflag ?? 0) | 2n);  // UNIT_NPC_FLAG_QUESTGIVER for imported starters/enders
  r.unit_flags = strip("unit_flags", r.unit_flags); r.unit_flags2 = strip("unit_flags2", r.unit_flags2); r.unit_flags3 = strip("unit_flags3", r.unit_flags3);
  const ai = aiSrc.get(e);
  r.AIName = ai ? "SmartAI" : "";
  r.ScriptName = keepScript(s?.ScriptName) || keepScript(m?.ScriptName);
  crRows.push(r);

  const md = maDiff.get(e);
  const sn = sniffHealth.get(e);
  if (sn) sniffed++;
  const d: Row = md ? { ...md } : { Entry: String(e), DifficultyID: "0", DamageModifier: s!.dmg_multiplier, CreatureDifficultyID: "0", StaticFlags1: "0", StaticFlags2: "0", StaticFlags3: "0",
    StaticFlags4: "0", StaticFlags5: "0", StaticFlags6: "0", StaticFlags7: "0", StaticFlags8: "0", VerifiedBuild: "0" };
  Object.assign(d, {
    MinLevel: pick(sn?.min, s?.minlevel, "1"), MaxLevel: pick(sn?.max, s?.maxlevel, "1"), HealthScalingExpansion: pick(sn?.hse, "4"),
    HealthModifier: pick(sn?.mod, s?.Health_mod, md?.HealthModifier, "1"),
  });
  if (s) Object.assign(d, { ManaModifier: s.Mana_mod, ArmorModifier: s.Armor_mod, GoldMin: s.mingold, GoldMax: s.maxgold, TypeFlags: s.type_flags, TypeFlags2: s.type_flags2 });
  diffRows.push(d);
}
log(`creature_template: ${crRows.length} new (${crRows.filter(r => sfT.has(n(r.entry))).length} with SkyFire values, ${crRows.filter(r => !maT.has(n(r.entry))).length} SkyFire only); gossip flag added for ${gossipFlagAdded} master gossip NPCs; ${sniffed} levels from retail sniffs`);

// ---- loot (ids decided before the difficulty rows are written) ---------------------------------------------------------
const lootOut: Record<string, Row[]> = {};
const refQueue = { ref_sfdb: new Set<number>(), ref_master: new Set<number>() } as Record<string, Set<number>>;
const sfLootRow = (entry: number, r: Row, table: string): Row | null => {
  const ref = n(r.mincountOrRef) < 0, c = Number(r.ChanceOrQuestChance);
  if (ref) refQueue.ref_sfdb.add(-n(r.mincountOrRef));
  else if (!C.item.has(n(r.item))) { log(`${table} ${entry}: SkyFire item ${r.item} not in Item.db2, dropped`); return null; }
  return { Entry: String(entry), ItemType: ref ? "1" : "0", Item: String(ref ? REF_SF - n(r.mincountOrRef) : n(r.item)), Chance: String(Math.abs(c)),
    QuestRequired: c < 0 ? "1" : "0", LootMode: r.lootmode, GroupId: r.groupid, MinCount: ref ? "1" : r.mincountOrRef, MaxCount: r.maxcount, Comment: "ref_sfdb" };
};
const maLootRow = (entry: number, r: Row, table: string): Row | null => {
  if (n(r.ItemType) === 1) { refQueue.ref_master.add(n(r.Item)); return { ...r, Entry: String(entry), Item: String(REF_MA + n(r.Item)) }; }
  if (n(r.ItemType) === 0 && !C.item.has(n(r.Item))) { log(`${table} ${entry}: master item ${r.Item} not in Item.db2, dropped`); return null; }
  return { ...r, Entry: String(entry) };
};
// creature / pickpocket / skinning: SkyFire table if it has rows, else master's.
const lootIdOf: Record<string, Map<number, number>> = {};
for (const [table, sfCol, maCol] of [["creature_loot_template", "lootid", "LootID"], ["pickpocketing_loot_template", "pickpocketloot", "PickPocketLootID"],
  ["skinning_loot_template", "skinloot", "SkinLootID"]] as const) {
  const sfIds = new Set(crRows.map(r => n(sfT.get(n(r.entry))?.[sfCol])).filter(Boolean));
  const maIds = new Set([...maDiff.values()].map(r => n(r[maCol])).filter(Boolean));
  const sfRows = new Map<number, Row[]>(), maRows = new Map<number, Row[]>();
  for (const r of sfIds.size ? fetch("ref_sfdb", table, `entry IN (${list(sfIds)})`) : []) sfRows.set(n(r.entry), [...(sfRows.get(n(r.entry)) ?? []), r]);
  for (const r of maIds.size ? fetch("ref_master", table, `Entry IN (${list(maIds)})`) : []) maRows.set(n(r.Entry), [...(maRows.get(n(r.Entry)) ?? []), r]);
  const choice = new Map<number, { src: "sf" | "ma"; id: number }>();
  for (const r of crRows) {
    const e = n(r.entry), sid = n(sfT.get(e)?.[sfCol]), mid = n(maDiff.get(e)?.[maCol]);
    if (sid && sfRows.has(sid)) choice.set(e, { src: "sf", id: sid });
    else if (mid && maRows.has(mid)) choice.set(e, { src: "ma", id: mid });
  }
  // Same source id can serve several creatures; a master id equal to a SkyFire id with other rows gets the remap.
  const taken = inWorld(table, "Entry", [...choice.values()].map(c => c.id));
  const finalId = new Map<string, number>(), rows: Row[] = [];
  const used = new Map<number, string>();
  for (const { src, id } of [...choice.values()].sort((a, b) => a.id - b.id || a.src.localeCompare(b.src))) {
    const k = `${src}:${id}`;
    if (finalId.has(k)) continue;
    let fid = id;
    if (taken.has(id) || (used.has(id) && used.get(id) !== k)) fid = LOOT_REMAP[table] + id + (src === "ma" ? 100_000_000 : 0);
    if (fid >= 2 ** 31) throw new Error(`${table}: remapped loot id ${fid} out of range`);
    finalId.set(k, fid); used.set(fid, k);
    for (const r of (src === "sf" ? sfRows : maRows).get(id)!) { const o = src === "sf" ? sfLootRow(fid, r, table) : maLootRow(fid, r, table); if (o) rows.push(o); }
  }
  const remapped = [...finalId].filter(([k, v]) => Number(k.split(":")[1]) !== v).length;
  if (remapped) log(`${table}: ${remapped} loot ids already used in world, remapped to ${LOOT_REMAP[table]}+id`);
  lootIdOf[table] = new Map([...choice].map(([e, c]) => [e, finalId.get(`${c.src}:${c.id}`)!]));
  lootOut[table] = rows;
  log(`${table}: ${[...choice.values()].filter(c => c.src === "sf").length} creatures with SkyFire loot, ${[...choice.values()].filter(c => c.src === "ma").length} with master loot`);
}
for (const d of diffRows) {
  const e = n(d.Entry);
  d.LootID = String(lootIdOf.creature_loot_template.get(e) ?? 0);
  d.PickPocketLootID = String(lootIdOf.pickpocketing_loot_template.get(e) ?? 0);
  d.SkinLootID = String(lootIdOf.skinning_loot_template.get(e) ?? 0);
}
T.emit("creature_template", crRows, `entry IN (${NEW})`,
  "ref_master row with SkyFire's MoP values (name, faction, npcflag, flags, rank, speeds, type, vehicle); SkyFire-only entries mapped; AI: SkyFire SmartAI, else master SmartAI");
T.emit("creature_template_difficulty", diffRows, `Entry IN (${NEW})`,
  "DifficultyID 0: ref_master row; levels/health retail sniff > SkyFire (HealthScalingExpansion 4 + Health_mod); mana/armor/gold/type flags/loot SkyFire");

// ---- models ------------------------------------------------------------------------------------------------------------
{
  const maModels = new Map<number, Row[]>();
  for (const r of fetch("ref_master", "creature_template_model", `CreatureID IN (${NEW}) ORDER BY CreatureID, Idx`)) maModels.set(n(r.CreatureID), [...(maModels.get(n(r.CreatureID)) ?? []), r]);
  const rows: Row[] = [];
  let sfUsed = 0, maUsed = 0;
  for (const e of newCrIds) {
    const s = sfT.get(e);
    const sfIds = s ? [1, 2, 3, 4].map(i => n(s[`modelid${i}`])).filter(Boolean) : [];
    const bad = sfIds.filter(d => !C.display.has(d));
    if (bad.length) log(`creature ${e}: SkyFire display ${bad.join(",")} not in CreatureDisplayInfo.db2`);
    const sfOk = sfIds.filter(d => C.display.has(d));
    const ma = (maModels.get(e) ?? []).filter(r => C.display.has(n(r.CreatureDisplayID)));
    const same = ma.length && sfOk.length === ma.length && sfOk.every(d => ma.some(r => n(r.CreatureDisplayID) === d));
    // Same display set: master's rows carry the retail scale/probability; otherwise SkyFire's set at equal odds (its ChooseDisplayId).
    if (same || !sfOk.length) { rows.push(...ma); if (ma.length) maUsed++; else log(`creature ${e}: no valid display in SkyFire or master`); }
    else { sfUsed++; sfOk.forEach((d, i) => rows.push({ CreatureID: String(e), Idx: String(i), CreatureDisplayID: String(d), DisplayScale: "1", Probability: "1", VerifiedBuild: "0" })); }
  }
  T.emit("creature_template_model", rows, `CreatureID IN (${NEW})`, `SkyFire modelid1-4 (${sfUsed} creatures) unless master has the same displays (${maUsed}); CreatureDisplayInfo.db2 checked`);
  const ids = new Set(rows.map(r => n(r.CreatureDisplayID)));
  const have = inWorld("creature_model_info", "DisplayID", ids);
  const add = [...ids].filter(d => !have.has(d));
  const ma = add.length ? fetch("ref_master", "creature_model_info", `DisplayID IN (${list(add)})`) : [];
  const maHas = new Set(ma.map(r => n(r.DisplayID)));
  const sf = add.filter(d => !maHas.has(d)).length ? q(`SELECT modelid, bounding_radius, combat_reach, modelid_other_gender FROM ref_sfdb.creature_model_info WHERE modelid IN (${list(add.filter(d => !maHas.has(d)))})`)
    .map(r => ({ DisplayID: r.modelid, BoundingRadius: r.bounding_radius, CombatReach: r.combat_reach, DisplayID_Other_Gender: C.display.has(n(r.modelid_other_gender)) ? r.modelid_other_gender : "0", VerifiedBuild: "0" } as Row)) : [];
  const rowsMi = [...ma, ...sf];
  T.emit("creature_model_info", rowsMi, `DisplayID IN (${list(rowsMi.map(r => n(r.DisplayID)))})`, `displays world lacks: ref_master (${ma.length}), else ref_sfdb (${sf.length})`);
}

// ---- template addon, equipment, spells, reputation, misc -----------------------------------------------------------------------
const cleanAuras = (owner: string, a: string | null | undefined) => (a ?? "").split(/\s+/).filter(x => {
  if (!x) return false;
  if (!C.spell.has(Number(x))) { log(`${owner}: aura ${x} not in SpellName.db2, dropped`); return false; }
  if (timedAura.has(Number(x))) { log(`${owner}: aura ${x} has a duration (the core refuses it), dropped`); return false; }
  return true;
}).join(" ");
const sfAddon = (owner: string, r: Row, base: Row | undefined): Row => {
  const b1 = n(r.bytes1), b2 = n(r.bytes2);
  const mount = n(r.mount) && !C.display.has(n(r.mount)) ? (log(`${owner}: mount display ${r.mount} not in CreatureDisplayInfo.db2, cleared`), "0") : r.mount;
  const emote = n(r.emote) && !C.emote.has(n(r.emote)) ? (log(`${owner}: emote ${r.emote} not in Emotes.db2, cleared`), "0") : r.emote;
  return { MountCreatureID: "0", aiAnimKit: "0", movementAnimKit: "0", meleeAnimKit: "0", visibilityDistanceType: "0", ...(base ?? {}), PathId: "0", mount,
    StandState: String(b1 & 0xff), VisFlags: String((b1 >> 16) & 0xff), AnimTier: String((b1 >>> 24) & 0xff), SheathState: String(b2 & 0xff),
    PvPFlags: String((b2 >> 8) & 0xff), emote, auras: cleanAuras(owner, r.auras) };
};
{
  const ma = new Map(fetch("ref_master", "creature_template_addon", `entry IN (${NEW})`).map(r => [n(r.entry), r]));
  const sf = new Map(fetch("ref_sfdb", "creature_template_addon", `entry IN (${NEW})`).map(r => [n(r.entry), r]));
  const rows: Row[] = [];
  for (const e of newCrIds) {
    const s = sf.get(e), m = ma.get(e);
    if (s) rows.push({ ...sfAddon(`creature_template_addon ${e}`, s, m), entry: String(e) });
    else if (m) rows.push({ ...m, PathId: "0", auras: cleanAuras(`creature_template_addon ${e}`, m.auras) });
  }
  T.emit("creature_template_addon", rows, `entry IN (${NEW})`, "ref_sfdb (bytes1/bytes2 split into StandState/VisFlags/AnimTier/SheathState/PvPFlags; anim kits from master), else ref_master; no paths");
}
const equipIds = new Map<number, Set<number>>();
{
  // SkyFire never loads id 0 (its LoadEquipment defaults to 1, spawns use 0 = default), and TC refuses it.
  const sf = fetch("ref_sfdb", "creature_equip_template", `entry IN (${NEW}) AND id<>0`);
  const sfHas = new Set(sf.map(r => n(r.entry)));
  const item = (owner: string, v: string | null) => { if (!n(v)) return "0"; if (C.item.has(n(v))) return v!; log(`${owner}: item ${v} not in Item.db2, cleared`); return "0"; };
  const rows: Row[] = [
    ...sf.map(r => ({ CreatureID: r.entry, ID: r.id, ItemID1: item(`creature_equip_template ${r.entry}`, r.itemEntry1), AppearanceModID1: "0", ItemVisual1: "0",
      ItemID2: item(`creature_equip_template ${r.entry}`, r.itemEntry2), AppearanceModID2: "0", ItemVisual2: "0",
      ItemID3: item(`creature_equip_template ${r.entry}`, r.itemEntry3), AppearanceModID3: "0", ItemVisual3: "0", VerifiedBuild: "0" } as Row)),
    ...fetch("ref_master", "creature_equip_template", `CreatureID IN (${NEW})`).filter(r => !sfHas.has(n(r.CreatureID))).map(r => {
      for (const k of ["ItemID1", "ItemID2", "ItemID3"]) r[k] = item(`creature_equip_template ${r.CreatureID}`, r[k]);
      return r;
    }),
  ];
  for (const r of rows) equipIds.set(n(r.CreatureID), (equipIds.get(n(r.CreatureID)) ?? new Set()).add(n(r.ID)));
  T.emit("creature_equip_template", rows, `CreatureID IN (${NEW})`, `ref_sfdb (${sf.length}), else ref_master; Item.db2 checked`);
  for (const r of q(`SELECT CreatureID, ID FROM world.creature_equip_template WHERE CreatureID IN (${list(worldCr)})`)) equipIds.set(n(r.CreatureID), (equipIds.get(n(r.CreatureID)) ?? new Set()).add(n(r.ID)));
}
{
  const rows: Row[] = [];
  const sfHas = new Set<number>();
  for (const e of newCrIds) {
    const s = sfT.get(e);
    if (!s) continue;
    for (let i = 1; i <= 8; i++) {
      const sp = n(s[`spell${i}`]);
      if (!sp) continue;
      if (!C.spell.has(sp)) { log(`creature ${e}: spell${i} ${sp} not in SpellName.db2, dropped`); continue; }
      rows.push({ CreatureID: String(e), Index: String(i - 1), Spell: String(sp), VerifiedBuild: "0" }); sfHas.add(e);
    }
  }
  rows.push(...fetch("ref_master", "creature_template_spell", `CreatureID IN (${NEW})`).filter(r => !sfHas.has(n(r.CreatureID)) && C.spell.has(n(r.Spell))));
  T.emit("creature_template_spell", rows, `CreatureID IN (${NEW})`, "ref_sfdb spell1-8, else ref_master; SpellName.db2 checked");
  const qi: Row[] = [];
  const sfQi = new Set<number>();
  for (const e of newCrIds) {
    const s = sfT.get(e);
    if (!s) continue;
    for (let i = 1; i <= 6; i++) if (n(s[`questItem${i}`]) && C.item.has(n(s[`questItem${i}`]))) { qi.push({ CreatureEntry: String(e), DifficultyID: "0", Idx: String(qi.filter(x => n(x.CreatureEntry) === e).length), ItemId: s[`questItem${i}`], VerifiedBuild: "0" }); sfQi.add(e); }
  }
  qi.push(...fetch("ref_master", "creature_questitem", `CreatureEntry IN (${NEW})`).filter(r => !sfQi.has(n(r.CreatureEntry)) && C.item.has(n(r.ItemId))));
  T.emit("creature_questitem", qi, `CreatureEntry IN (${NEW})`, "ref_sfdb questItem1-6, else ref_master; Item.db2 checked");
  const sfRep = fetch("ref_sfdb", "creature_onkill_reputation", `creature_id IN (${NEW})`);
  const sfRepHas = new Set(sfRep.map(r => n(r.creature_id)));
  const rep = [...sfRep, ...fetch("ref_master", "creature_onkill_reputation", `creature_id IN (${NEW})`).filter(r => !sfRepHas.has(n(r.creature_id)))].filter(r => {
    const bad = [r.RewOnKillRepFaction1, r.RewOnKillRepFaction2].filter(f => n(f) && !C.faction.has(n(f)));
    if (bad.length) log(`creature_onkill_reputation ${r.creature_id}: faction ${bad} not in Faction.db2, dropped`);
    return !bad.length;
  });
  T.emit("creature_onkill_reputation", rep, `creature_id IN (${NEW})`, "ref_sfdb (MoP reputations), else ref_master; Faction.db2 checked");
  T.emit("creature_template_movement", fetch("ref_master", "creature_template_movement", `CreatureId IN (${NEW})`), `CreatureId IN (${NEW})`, "ref_master");
  T.emit("npc_spellclick_spells", fetch("ref_master", "npc_spellclick_spells", `npc_entry IN (${NEW})`).filter(r => C.spell.has(n(r.spell_id))),
    `npc_entry IN (${NEW})`, "ref_master, SpellName.db2 checked");
  T.emit("vehicle_template", fetch("ref_master", "vehicle_template", `creatureId IN (${NEW})`), `creatureId IN (${NEW})`, "ref_master");
  T.emit("vehicle_template_accessory", fetch("ref_master", "vehicle_template_accessory", `entry IN (${NEW})`), `entry IN (${NEW})`, "ref_master");
  T.emit("creature_summon_groups", fetch("ref_master", "creature_summon_groups", `summonerType=0 AND summonerId IN (${NEW})`), `summonerType=0 AND summonerId IN (${NEW})`, "ref_master");
}

// ---- gameobject templates --------------------------------------------------------------------------------------------------
const worldGo = inWorld("gameobject_template", "entry", goEntries);
const newGoIds = new Set([...goEntries].filter(e => !worldGo.has(e) && (maG.has(e) || sfG.has(e))));
for (const e of goEntries) if (!worldGo.has(e) && !newGoIds.has(e)) log(`gameobject ${e}: no template in SkyFire, master or world, spawns dropped`);
log(`gameobject templates kept from world (${worldGo.size}): ${[...worldGo].join(",")}`);
const NEWGO = list(newGoIds);
// Types whose Data1 is a loot id: chest (3), fishing hole (25).
const LOOT_TYPES = [3, 25];
// Master's loot id of a GO: Data1 for chests, fishing holes and gathering nodes (type 50).
const maLootOf = (t: Row | undefined) => (t && [...LOOT_TYPES, 50].includes(n(t.type)) ? n(t.Data1) : 0);
let node50 = 0;
const goRows: Row[] = [];
{
  const sfLootIds = new Set([...newGoIds].map(e => sfG.get(e)).filter(t => t && LOOT_TYPES.includes(n(t.type)) && n(t.data1)).map(t => n(t!.data1)));
  const maLootIds = new Set([...newGoIds].map(e => maLootOf(maG.get(e))).filter(Boolean));
  const maHasLoot = new Set(maLootIds.size ? q(`SELECT DISTINCT Entry FROM ref_master.gameobject_loot_template WHERE Entry IN (${list(maLootIds)})`).map(r => n(r.Entry)) : []);
  const sfHasLoot = new Set(sfLootIds.size ? q(`SELECT DISTINCT entry FROM ref_sfdb.gameobject_loot_template WHERE entry IN (${list(sfLootIds)})`).map(r => n(r.entry)) : []);
  const sfLoot = new Set<number>(), maLoot = new Set<number>();
  let fromSf = 0, fromMa = 0, sfOnly = 0;
  const goQuestItems = new Map<number, number[]>();
  for (const r of fetch("ref_master", "gameobject_questitem", `GameObjectEntry IN (${NEWGO}) ORDER BY GameObjectEntry, Idx`))
    if (C.item.has(n(r.ItemId))) goQuestItems.set(n(r.GameObjectEntry), [...(goQuestItems.get(n(r.GameObjectEntry)) ?? []), n(r.ItemId)]);
  const qiLoot: Row[] = [];
  for (const e of [...newGoIds].sort((a, b) => a - b)) {
    const m = maG.get(e), s = sfG.get(e);
    // The client reads the GO data fields, so master's (modern layout) template is the base; SkyFire's chest loot wins when it has rows.
    // Master's gathering nodes are type 50 (retail-only); 5.5.4 nodes are chests like SkyFire's (and cata's), so take SkyFire's row.
    const sfBase = !m || (n(m.type) === 50 && !!s);
    if (m && sfBase) node50++;
    const r: Row = !sfBase ? { ...m! } : {
      entry: s!.entry, type: s!.type, displayId: s!.displayId, name: s!.name, IconName: s!.IconName, castBarCaption: s!.castBarCaption, unk1: s!.unk1, size: s!.size,
      ...Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`Data${i}`, s![`data${i}`]])), ContentTuningId: "0", AIName: "", StringId: null, VerifiedBuild: "0",
    };
    if (sfBase) sfOnly++;
    const type = n(r.type);
    if (LOOT_TYPES.includes(type)) {
      const sid = s && n(s.type) === type ? n(s.data1) : 0;
      if (sid && sfHasLoot.has(sid)) { r.Data1 = String(GOLOOT_SF + sid); sfLoot.add(sid); fromSf++; }
      else if (maLootOf(m) && maHasLoot.has(maLootOf(m))) { maLoot.add(maLootOf(m)); r.Data1 = String(GOLOOT_MA + maLootOf(m)); fromMa++; }
      else if (n(r.Data1)) { log(`gameobject ${e}: loot ${r.Data1} has rows in neither source, cleared`); r.Data1 = "0"; }
    }
    // No loot in either source, but master lists the quest items this object gives (gameobject_questitem): one of each, quest-only.
    if (type === 3 && !n(r.Data1) && goQuestItems.has(e)) { r.Data1 = String(GOLOOT_QI + e); qiLoot.push(...goQuestItems.get(e)!.map(it => ({ Entry: r.Data1, ItemType: "0", Item: String(it),
      Chance: "100", QuestRequired: "1", LootMode: "1", GroupId: "0", MinCount: "1", MaxCount: "1", Comment: "ref_master gameobject_questitem" } as Row))); }
    const lf = LOCK_FIELD[type];
    if (lf && n(r[lf]) && !C.lock.has(n(r[lf]))) {
      const sl = s && n(s.type) === type ? n(s[lf.toLowerCase()]) : 0;
      log(`gameobject ${e}: lock ${r[lf]} not in Lock.db2, ${sl && C.lock.has(sl) ? `SkyFire's ${sl}` : "cleared"}`);
      r[lf] = String(sl && C.lock.has(sl) ? sl : 0);
    }
    if (n(r.displayId) && !C.goDisplay.has(n(r.displayId))) log(`gameobject ${e}: display ${r.displayId} not in GameObjectDisplayInfo.db2`);
    r.ScriptName = keepScript(m?.ScriptName) || keepScript(s?.ScriptName);
    r.AIName = m?.AIName === "SmartAI" ? "SmartAI" : "";
    goRows.push(r);
  }
  if ([...sfLoot, ...maLoot].some(id => id >= 500_000)) throw new Error("gameobject loot id >= 500000 would overlap the remap ranges");
  T.emit("gameobject_template", goRows, `entry IN (${NEWGO})`, `ref_master (${goRows.length - sfOnly}), else ref_sfdb (${sfOnly}, of which ${node50} master type-50 gathering nodes); chest/fishing loot: SkyFire rows (${fromSf}) as ${GOLOOT_SF}+id, else master (${fromMa}) as ${GOLOOT_MA}+id`);
  const rows: Row[] = [];
  for (const r of sfLoot.size ? fetch("ref_sfdb", "gameobject_loot_template", `entry IN (${list(sfLoot)})`) : []) { const o = sfLootRow(GOLOOT_SF + n(r.entry), r, "gameobject_loot_template"); if (o) rows.push(o); }
  for (const r of maLoot.size ? fetch("ref_master", "gameobject_loot_template", `Entry IN (${list(maLoot)})`) : []) { const o = maLootRow(GOLOOT_MA + n(r.Entry), r, "gameobject_loot_template"); if (o) rows.push(o); }
  // Chests kept from world (the cata TDB has some MoP templates) whose loot id has no rows: SkyFire's loot under world's id.
  const kept = q(`SELECT entry, type, Data1 FROM world.gameobject_template WHERE entry IN (${list(worldGo)}) AND type IN (${LOOT_TYPES}) AND Data1<>0`);
  const keptHas = inWorld("gameobject_loot_template", "Entry", kept.map(r => n(r.Data1)));
  const keptSfIds = kept.map(k => n(sfG.get(n(k.entry))?.data1)).filter(Boolean);
  const keptSfHas = new Set(keptSfIds.length ? q(`SELECT DISTINCT entry FROM ref_sfdb.gameobject_loot_template WHERE entry IN (${list(keptSfIds)})`).map(r => n(r.entry)) : []);
  const keptSf = new Map<number, number>();
  for (const k of kept) {
    const s = sfG.get(n(k.entry));
    if (!keptHas.has(n(k.Data1)) && s && n(s.type) === n(k.type) && keptSfHas.has(n(s.data1)) && !keptSf.has(n(k.Data1))) keptSf.set(n(k.Data1), n(s.data1));
  }
  if (keptSf.size) for (const [wid, sid] of keptSf) for (const r of fetch("ref_sfdb", "gameobject_loot_template", `entry=${sid}`)) { const o = sfLootRow(wid, r, "gameobject_loot_template"); if (o) rows.push(o); }
  log(`gameobject_loot_template: SkyFire loot for ${keptSf.size} world chests without loot rows`);
  rows.push(...qiLoot);
  log(`gameobject_loot_template: ${new Set(qiLoot.map(r => r.Entry)).size} lootless chests get their master quest items (${GOLOOT_QI}+entry)`);
  lootOut.gameobject_loot_template = rows;
  const sfAdd = fetch("ref_sfdb", "gameobject_template", `entry IN (${NEWGO})`);
  const maAddon = new Map(fetch("ref_master", "gameobject_template_addon", `entry IN (${NEWGO})`).map(r => [n(r.entry), r]));
  // Addon: master's when master has the template (faction/flags belong to that layout), else SkyFire's faction/flags.
  const addon = [...newGoIds].flatMap(e => {
    if (maG.has(e) && n(maG.get(e)!.type) !== 50) return maAddon.has(e) ? [maAddon.get(e)!] : [];
    const s = sfAdd.find(r => n(r.entry) === e)!;
    return n(s.faction) || n(s.flags) ? [{ entry: s.entry, faction: s.faction, flags: s.flags, mingold: "0", maxgold: "0" } as Row] : [];
  });
  T.emit("gameobject_template_addon", addon, `entry IN (${NEWGO})`, "ref_master, else ref_sfdb faction/flags");
  T.emit("gameobject_questitem", fetch("ref_master", "gameobject_questitem", `GameObjectEntry IN (${NEWGO})`).filter(r => C.item.has(n(r.ItemId))),
    `GameObjectEntry IN (${NEWGO})`, "ref_master, Item.db2 checked");
}

// ---- loot tables + references --------------------------------------------------------------------------------------------
for (const [table, rows] of Object.entries(lootOut))
  T.emit(table, rows, `Entry IN (${list(rows.map(r => n(r.Entry)))})`, `Comment ref_sfdb = SkyFire rows (references as ${REF_SF}+id), else ref_master (references as ${REF_MA}+id); Item.db2 checked`);
{
  const rows: Row[] = [];
  for (const [db, base] of [["ref_sfdb", REF_SF], ["ref_master", REF_MA]] as const) {
    const done = new Set<number>();
    while ([...refQueue[db]].some(x => !done.has(x))) {
      const todo = [...refQueue[db]].filter(x => !done.has(x));
      todo.forEach(x => done.add(x));
      for (const r of fetch(db, "reference_loot_template", `${db === "ref_sfdb" ? "entry" : "Entry"} IN (${list(todo)})`)) {
        const o = db === "ref_sfdb" ? sfLootRow(base + n(r.entry), r, "reference_loot_template") : maLootRow(base + n(r.Entry), r, "reference_loot_template");
        if (o) rows.push(o);
      }
    }
    const missing = [...done].filter(x => !rows.some(r => n(r.Entry) === base + x));
    if (missing.length) log(`reference_loot_template: ${db} references without rows: ${missing.join(",")}`);
  }
  T.emit("reference_loot_template", rows, `Entry IN (${list(rows.map(r => n(r.Entry)))})`, "references of the loot above, renumbered per source");
}

// ---- creature spawns -------------------------------------------------------------------------------------------------------
const okPhase = (owner: string, r: { PhaseId: string | null; PhaseGroup: string | null }) => {
  if (n(r.PhaseId) && !C.phase.has(n(r.PhaseId))) log(`${owner}: phase ${r.PhaseId} not in Phase.db2`);
  if (n(r.PhaseGroup) && !phaseGroups.has(n(r.PhaseGroup))) log(`${owner}: phase group ${r.PhaseGroup} not in PhaseXPhaseGroup.db2`);
};
const haveCr = (e: number) => isNew(e) || worldCr.has(e);
const crSpawnRows: Row[] = [];
{
  let fixedMove = 0;
  const phased = new Map<number, number>();
  for (const s of sfCr) {
    const e = n(s.id);
    if (!haveCr(e)) continue;
    let move = n(s.MovementType), wander = Number(s.spawndist);
    if (move === 2) { move = 0; fixedMove++; }  // SkyFire has no Pandaria paths
    if (move === 1 && !wander) { move = 0; fixedMove++; }
    if (move === 0) wander = 0;
    if (n(s.phaseId)) phased.set(n(s.phaseId), (phased.get(n(s.phaseId)) ?? 0) + 1);
    const r: Row = {
      guid: String(SF_GUID + n(s.guid)), id: s.id, map: s.map, zoneId: "0", areaId: "0", spawnDifficulties: "0", phaseUseFlags: "0", PhaseId: s.phaseId, PhaseGroup: s.phaseGroup,
      terrainSwapMap: "-1", modelid: "0", equipment_id: equipIds.get(e)?.has(1) ? "1" : "0", position_x: s.position_x, position_y: s.position_y, position_z: s.position_z,
      orientation: s.orientation, spawntimesecs: s.spawntimesecs, wander_distance: String(wander), currentwaypoint: "0", curHealthPct: null, MovementType: String(move),
      npcflag: null, unit_flags: null, unit_flags2: null, unit_flags3: null, ScriptName: "", StringId: null, VerifiedBuild: "0",
    };
    okPhase(`creature ${r.guid}`, r);
    crSpawnRows.push(r);
  }
  for (const m of maCr) {
    const e = n(m.id);
    if (!haveCr(e)) continue;
    const r: Row = { ...m, guid: String(MA_GUID + n(m.guid)), ScriptName: keepScript(m.ScriptName) };
    if (n(r.modelid) && !C.display.has(n(r.modelid))) { log(`creature ${r.guid}: modelid ${r.modelid} not in CreatureDisplayInfo.db2, cleared`); r.modelid = "0"; }
    if (n(r.equipment_id) > 0 && !equipIds.get(e)?.has(n(r.equipment_id))) r.equipment_id = equipIds.get(e)?.has(1) ? "1" : "0";
    okPhase(`creature ${r.guid}`, r);
    crSpawnRows.push(r);
  }
  log(`creature spawns: SkyFire ${sfCr.length}, master gap fill ${maCr.length}; MovementType fixed (no path / no wander distance) ${fixedMove}; SkyFire phased spawns ${[...phased].map(([p, c]) => `${p}:${c}`).join(" ")}`);
}
S.emit("creature", crSpawnRows, `guid BETWEEN ${SF_GUID} AND ${MA_GUID + 9_999_999}`,
  `map ${MAP}: ref_sfdb as guid ${SF_GUID}+guid (equipment 1 where the entry has one: SkyFire 0 = default), ref_master gap fill as ${MA_GUID}+guid`);
const pathIds = new Set<number>();
{
  const sfAdd = q(`SELECT a.* FROM ref_sfdb.creature_addon a JOIN ref_sfdb.creature c ON c.guid=a.guid WHERE c.map=${MAP}`);
  const keep = new Set(crSpawnRows.map(r => n(r.guid)));
  const rows = [
    ...sfAdd.map(r => ({ ...sfAddon(`creature_addon ${r.guid}`, r, undefined), guid: String(SF_GUID + n(r.guid)) })),
    ...(maCr.length ? fetch("ref_master", "creature_addon", `guid IN (${list(maCr.map(r => n(r.guid)))})`) : []).map(r => {
      if (n(r.PathId)) pathIds.add(n(r.PathId));
      return { ...r, guid: String(MA_GUID + n(r.guid)), auras: cleanAuras(`creature_addon ${r.guid}`, r.auras) };
    }),
  ].filter(r => keep.has(n(r.guid)));
  S.emit("creature_addon", rows, `guid BETWEEN ${SF_GUID} AND ${MA_GUID + 9_999_999}`, "ref_sfdb (bytes split), ref_master gap fill; auras checked against SpellName.db2");
}

// ---- gameobject spawns -----------------------------------------------------------------------------------------------------
const haveGo = (e: number) => newGoIds.has(e) || worldGo.has(e);
const goType = new Map<number, number>([...goRows.map(r => [n(r.entry), n(r.type)] as [number, number]),
  ...q(`SELECT entry, type FROM world.gameobject_template WHERE entry IN (${list(worldGo)})`).map(r => [n(r.entry), n(r.type)] as [number, number])]);
{
  const rows: Row[] = [];
  let rot = 0, transports = 0;
  // A non-unit quaternion makes the core log and fall back to the orientation; write that rotation (about Z) directly.
  const fixRot = (r: Row) => {
    const len = [0, 1, 2, 3].reduce((a, i) => a + Number(r[`rotation${i}`]) ** 2, 0);
    if (Math.abs(len - 1) < 1e-6) return false;
    // isUnit() allows 1e-5; SkyFire's 5-digit values miss it, so normalize (keeps tilt), or rebuild from the orientation if zero.
    if (len > 0.5) { for (const i of [0, 1, 2, 3]) r[`rotation${i}`] = (Number(r[`rotation${i}`]) / Math.sqrt(len)).toFixed(7); return true; }
    const o = Number(r.orientation);
    Object.assign(r, { rotation0: "0", rotation1: "0", rotation2: Math.sin(o / 2).toFixed(7), rotation3: Math.cos(o / 2).toFixed(7) });
    return true;
  };
  for (const s of sfGo) {
    const e = n(s.id);
    if (!haveGo(e)) continue;
    if ([11, 15].includes(goType.get(e) ?? -1)) { transports++; continue; }  // transports spawn from `transports`
    const r: Row = {
      guid: String(SF_GUID + n(s.guid)), id: s.id, map: s.map, zoneId: "0", areaId: "0", spawnDifficulties: "0", phaseUseFlags: "0", PhaseId: s.phaseId, PhaseGroup: s.phaseGroup,
      terrainSwapMap: "-1", position_x: s.position_x, position_y: s.position_y, position_z: s.position_z, orientation: s.orientation,
      rotation0: s.rotation0, rotation1: s.rotation1, rotation2: s.rotation2, rotation3: s.rotation3, spawntimesecs: s.spawntimesecs, animprogress: s.animprogress,
      state: s.state, ScriptName: "", StringId: null, VerifiedBuild: "0",
    };
    if (fixRot(r)) rot++;
    okPhase(`gameobject ${r.guid}`, r);
    rows.push(r);
  }
  for (const m of maGo) {
    if (!haveGo(n(m.id))) continue;
    const r: Row = { ...m, guid: String(MA_GUID + n(m.guid)), ScriptName: keepScript(m.ScriptName) };
    fixRot(r);
    okPhase(`gameobject ${r.guid}`, r);
    rows.push(r);
  }
  log(`gameobject spawns: SkyFire ${sfGo.length} (rotation normalized or rebuilt ${rot}, transports skipped ${transports}), master gap fill ${maGo.length}`);
  G.emit("gameobject", rows, `guid BETWEEN ${SF_GUID} AND ${MA_GUID + 9_999_999}`, `map ${MAP}: ref_sfdb as guid ${SF_GUID}+guid, ref_master gap fill as ${MA_GUID}+guid`);
  const keep = new Set(rows.map(r => n(r.guid)));
  G.emit("gameobject_addon", (maGo.length ? fetch("ref_master", "gameobject_addon", `guid IN (${list(maGo.map(r => n(r.guid)))})`) : [])
    .map(r => ({ ...r, guid: String(MA_GUID + n(r.guid)) })).filter(r => keep.has(n(r.guid))), `guid BETWEEN ${SF_GUID} AND ${MA_GUID + 9_999_999}`, "ref_master gap fill");
}

// ---- vendors, trainers -----------------------------------------------------------------------------------------------------
{
  const sf = fetch("ref_sfdb", "npc_vendor", `entry IN (${NEW}) ORDER BY entry, slot, item`);
  const sfHas = new Set(sf.map(r => n(r.entry)));
  const ok = (r: Row, src: string) => {
    const t = n(r.type), it = n(r.item);
    if (t === 1 && !C.item.has(it)) { log(`npc_vendor ${r.entry}: ${src} item ${it} not in Item.db2, dropped`); return false; }
    if (t === 2 && !C.currency.has(it)) { log(`npc_vendor ${r.entry}: ${src} currency ${it} not in CurrencyTypes.db2, dropped`); return false; }
    if (n(r.ExtendedCost) && !C.extCost.has(n(r.ExtendedCost))) { log(`npc_vendor ${r.entry}: ${src} ExtendedCost ${r.ExtendedCost} (item ${it}) not in ItemExtendedCost.db2, dropped`); return false; }
    return true;
  };
  const rows = [
    ...sf.filter(r => ok(r, "SkyFire")).map(r => ({ entry: r.entry, slot: r.slot, item: r.item, maxcount: r.maxcount, incrtime: r.incrtime, ExtendedCost: r.ExtendedCost, type: r.type,
      BonusListIDs: null, PlayerConditionID: "0", IgnoreFiltering: "0", VerifiedBuild: "0" } as Row)),
    ...fetch("ref_master", "npc_vendor", `entry IN (${NEW})`).filter(r => !sfHas.has(n(r.entry)) && ok(r, "master")),
  ];
  // npc_vendor's key includes item+ExtendedCost+type; SkyFire has a few exact duplicates.
  const seen = new Set<string>();
  const uniq = rows.filter(r => { const k = `${r.entry}:${r.item}:${r.ExtendedCost}:${r.type}`; if (seen.has(k)) return false; seen.add(k); return true; });
  N.emit("npc_vendor", uniq, `entry IN (${NEW})`, `ref_sfdb (MoP stock, ${sfHas.size} vendors), else ref_master; Item/CurrencyTypes/ItemExtendedCost DB2s checked`);
}
const creatureTrainer: Row[] = [];
{
  const ma = fetch("ref_master", "creature_trainer", `CreatureID IN (${NEW})`);
  const tids = new Set(ma.map(r => n(r.TrainerID)));
  const have = inWorld("trainer", "Id", tids);
  const add = [...tids].filter(t => !have.has(t));
  N.emit("trainer", add.length ? fetch("ref_master", "trainer", `Id IN (${list(add)})`) : [], `Id IN (${list(add)})`, "ref_master, trainers world lacks");
  N.emit("trainer_spell", add.length ? fetch("ref_master", "trainer_spell", `TrainerId IN (${list(add)})`).filter(r => C.spell.has(n(r.SpellId))) : [],
    `TrainerId IN (${list(add)})`, "ref_master, SpellName.db2 checked");
  creatureTrainer.push(...ma);
  const sfOnly = q(`SELECT DISTINCT entry FROM ref_sfdb.npc_trainer WHERE entry IN (${NEW})`).map(r => n(r.entry)).filter(e => !ma.some(r => n(r.CreatureID) === e));
  if (sfOnly.length) log(`trainers SkyFire has but master does not (npc_trainer has no trainer id/gossip link to map), skipped: ${sfOnly.join(",")}`);
  if (have.size) log(`trainer ids kept from world: ${[...have].join(",")}`);
}

// ---- gossip (master: real GossipOptionIDs and BroadcastText; SkyFire's menu id when master knows that menu) ------------------
const menus = new Set<number>(), ctGossip: Row[] = [];
{
  const sfMenu = new Map([...newCrIds].map(e => [e, n(sfT.get(e)?.gossip_menu_id)] as [number, number]).filter(([, m]) => m));
  const known = new Set(q(`SELECT DISTINCT MenuID FROM ref_master.gossip_menu WHERE MenuID IN (${list(sfMenu.values())}) UNION SELECT DISTINCT MenuID FROM world.gossip_menu WHERE MenuID IN (${list(sfMenu.values())})`).map(r => n(r.MenuID)));
  const ma = fetch("ref_master", "creature_template_gossip", `CreatureID IN (${NEW})`);
  const rows: Row[] = [];
  for (const e of newCrIds) {
    const sm = sfMenu.get(e), mm = ma.filter(r => n(r.CreatureID) === e);
    if (sm && known.has(sm)) rows.push({ CreatureID: String(e), MenuID: String(sm), VerifiedBuild: "0" });
    else { if (sm) log(`creature ${e}: SkyFire gossip menu ${sm} has no master/world content (SkyFire npc_text has no BroadcastText), using master's`); rows.push(...mm); }
  }
  for (const r of rows) menus.add(n(r.MenuID));
  for (const r of goRows) { const t = n(r.type), g = t === 2 ? n(r.Data3) : t === 10 ? n(r.Data19) : t === 0 ? n(r.Data6) : 0; if (g) menus.add(g); }
  for (const r of creatureTrainer) if (n(r.MenuID)) menus.add(n(r.MenuID));
  ctGossip.push(...rows);
}
const worldMenus = new Set<number>();
for (let i = 0; i < 6; i++) {
  for (const m of inWorld("gossip_menu", "MenuID", menus)) { worldMenus.add(m); menus.delete(m); }
  for (const m of inWorld("gossip_menu_option", "MenuID", menus)) { worldMenus.add(m); menus.delete(m); }
  for (const r of q(`SELECT ActionMenuID FROM ref_master.gossip_menu_option WHERE MenuID IN (${list(menus)}) AND ActionMenuID<>0`)) if (!worldMenus.has(n(r.ActionMenuID))) menus.add(n(r.ActionMenuID));
}
if (worldMenus.size) log(`gossip menus kept from world: ${[...worldMenus].join(",")}`);
const M = list(menus);
{
  const gm = fetch("ref_master", "gossip_menu", `MenuID IN (${M})`);
  N.emit("gossip_menu", gm, `MenuID IN (${M})`, "ref_master");
  const opts = fetch("ref_master", "gossip_menu_option", `MenuID IN (${M})`);
  N.emit("gossip_menu_option", opts, `MenuID IN (${M})`, "ref_master");
  N.emit("gossip_menu_addon", fetch("ref_master", "gossip_menu_addon", `MenuID IN (${M})`), `MenuID IN (${M})`, "ref_master");
  const texts = new Set(gm.map(r => n(r.TextID)));
  const have = inWorld("npc_text", "ID", texts);
  const add = [...texts].filter(t => !have.has(t));
  N.emit("npc_text", add.length ? fetch("ref_master", "npc_text", `ID IN (${list(add)})`) : [], `ID IN (${list(add)})`, "ref_master, texts world lacks");
  const pois = new Set(opts.map(r => n(r.ActionPoiID)).filter(Boolean));
  const havePoi = inWorld("points_of_interest", "ID", pois);
  const addPoi = [...pois].filter(p => !havePoi.has(p));
  N.emit("points_of_interest", addPoi.length ? fetch("ref_master", "points_of_interest", `ID IN (${list(addPoi)})`) : [], `ID IN (${list(addPoi)})`, "ref_master (gossip POIs)");
  // Trainer links need their menu option; drop links whose menu is neither ours nor world's.
  const links = ctGossip.filter(r => menus.has(n(r.MenuID)) || worldMenus.has(n(r.MenuID)) || gm.some(g => n(g.MenuID) === n(r.MenuID)));
  const noMenu = ctGossip.filter(r => !links.includes(r)).map(r => `${r.CreatureID}/${r.MenuID}`);
  if (noMenu.length) log(`creature_template_gossip: menus without gossip_menu rows anywhere, skipped: ${noMenu.join(" ")}`);
  N.emit("creature_template_gossip", links, `CreatureID IN (${NEW})`, "SkyFire gossip_menu_id where that menu has master/world content, else ref_master");
  const ct = creatureTrainer.filter(r => !n(r.MenuID) || menus.has(n(r.MenuID)) || worldMenus.has(n(r.MenuID)));
  N.emit("creature_trainer", ct, `CreatureID IN (${NEW})`, "ref_master");
}

// ---- creature_text, SmartAI, waypoints -------------------------------------------------------------------------------------------
{
  const bySrc = (src: "sf" | "ma") => [...newCrIds].filter(e => (aiSrc.get(e) ?? (sfT.has(e) ? "sf" : "ma")) === src);
  const sfIds = bySrc("sf"), maIds = bySrc("ma");
  const sf = fetch("ref_sfdb", "creature_text", `entry IN (${list(sfIds)})`);
  const sfHas = new Set(sf.map(r => n(r.entry)));
  const rows: Row[] = [
    ...sf.map(r => {
      const sound = n(r.sound) && !C.sound.has(n(r.sound)) ? (log(`creature_text ${r.entry}/${r.groupid}/${r.id}: sound ${r.sound} not in SoundKit.db2, cleared`), "0") : r.sound;
      return { CreatureID: r.entry, GroupID: r.groupid, ID: r.id, Text: r.text, Type: r.type, Language: r.language, Probability: r.probability, Emote: r.emote,
        Duration: r.duration, Sound: sound, SoundPlayType: "0", BroadcastTextId: "0", TextRange: "0", comment: r.comment } as Row;
    }),
    // Texts belong to the AI that says them: master texts for master-AI entries and for entries SkyFire has none for.
    ...fetch("ref_master", "creature_text", `CreatureID IN (${list([...maIds, ...sfIds.filter(e => !aiSrc.has(e))])})`).filter(r => !sfHas.has(n(r.CreatureID)) || aiSrc.get(n(r.CreatureID)) === "ma"),
  ];
  N.emit("creature_text", rows, `CreatureID IN (${NEW})`, "ref_sfdb (no BroadcastTextId: the text is sent as is) for SkyFire-AI entries, ref_master otherwise");
}
const saiRows: Row[] = [];
{
  const maG2 = new Map(maCr.map(r => [n(r.guid), MA_GUID + n(r.guid)]));
  for (const { db, row: r } of sai) {
    const st = n(r.source_type), e = n(r.entryorguid);
    const owner = st === 9 ? Math.floor(e / 100) : e < 0 ? n(maCr.find(m => n(m.guid) === -e)?.id) : e;
    if (st === 0 && !isNew(owner)) continue;
    const o: Row = { ...r };
    if (db === "ref_sfdb") {
      // TC moved the per-difficulty event flags (0x02-0x10) to the Difficulties column; open-world rows keep all difficulties.
      if (n(r.event_flags) & 0x1e) log(`smart_scripts ${e}/${r.id}: SkyFire difficulty event_flags ${r.event_flags} cleared`);
      o.event_flags = String(n(r.event_flags) & ~0x1e);
    }
    if (e < 0) o.entryorguid = String(-(maG2.get(-e) ?? -e));
    for (const a of [11, 85, 86, 134]) if (n(r.action_type) === a && !C.spell.has(n(r.action_param1))) log(`smart_scripts ${db} ${e}/${r.id}: spell ${r.action_param1} not in SpellName.db2`);
    if (n(r.action_type) === 53) pathIds.add(n(r.action_param2));
    o.comment = `${r.comment ?? ""} (${db})`;
    saiRows.push(o);
  }
  // GO SmartAI from master for new GOs that use it.
  const goSai = fetch("ref_master", "smart_scripts", `source_type=1 AND entryorguid IN (${list(goRows.filter(r => r.AIName === "SmartAI").map(r => n(r.entry)))})`);
  saiRows.push(...goSai.map(r => ({ ...r, comment: `${r.comment ?? ""} (ref_master)` })));
  const keys = [...new Set(saiRows.map(r => `(${r.entryorguid},${r.source_type})`))];
  const guidDel = `(source_type=0 AND entryorguid BETWEEN -${MA_GUID + 9_999_999} AND -${SF_GUID})`;
  N.emit("smart_scripts", saiRows, keys.length ? `(entryorguid,source_type) IN (${keys.join(",")}) OR ${guidDel}` : guidDel,
    `ref_sfdb for SkyFire SmartAI entries (${[...aiSrc.values()].filter(v => v === "sf").length}), else ref_master (${[...aiSrc.values()].filter(v => v === "ma").length}); master guid scripts remapped`);
}
{
  const clash = inWorld("waypoint_path", "PathId", pathIds);
  if (clash.size) log(`waypoint_path ids already in world, kept world's: ${[...clash].join(",")}`);
  const P = list([...pathIds].filter(p => !clash.has(p)));
  N.emit("waypoint_path", fetch("ref_master", "waypoint_path", `PathId IN (${P})`), `PathId IN (${P})`, "ref_master (gap fill spawn paths, SAI paths)");
  N.emit("waypoint_path_node", fetch("ref_master", "waypoint_path_node", `PathId IN (${P})`), `PathId IN (${P})`, "ref_master");
}

// ---- phasing, area auras -----------------------------------------------------------------------------------------------------
const A = list(areas);
const phaseIds = new Set<number>();
{
  const have = new Set(q(`SELECT CONCAT(AreaId,':',PhaseId) k FROM world.phase_area WHERE AreaId IN (${A})`).map(r => r.k!));
  const mine = own.get("phase_area.AreaId") ?? new Set<number>();
  const rows = fetch("ref_master", "phase_area", `AreaId IN (${A})`).filter(r => {
    if (!C.phase.has(n(r.PhaseId))) { log(`phase_area ${r.AreaId}/${r.PhaseId}: phase not in Phase.db2, dropped`); return false; }
    return !(have.has(`${r.AreaId}:${r.PhaseId}`) && !mine.has(n(r.AreaId)));
  });
  rows.forEach(r => phaseIds.add(n(r.PhaseId)));
  N.emit("phase_area", rows, `AreaId IN (${list(rows.map(r => n(r.AreaId)))})`, "ref_master, Pandaria areas (AreaTable ContinentID 870)");
  const ph = inWorld("phase_name", "ID", phaseIds);
  const add = [...phaseIds].filter(p => !ph.has(p));
  N.emit("phase_name", add.length ? fetch("ref_master", "phase_name", `ID IN (${list(add)})`) : [], `ID IN (${list(add)})`, "ref_master");
  const sa = fetch("ref_master", "spell_area", `area IN (${A})`).filter(r => C.spell.has(n(r.spell)));
  N.emit("spell_area", sa, `area IN (${list(sa.map(r => n(r.area)))})`, "ref_master, Pandaria areas, SpellName.db2 checked");
}

// ---- .tele targets -------------------------------------------------------------------------------------------------------
{
  const ma = fetch("ref_master", "game_tele", `map=${MAP} ORDER BY id`);
  const taken = inWorld("game_tele", "id", ma.map(r => n(r.id)));
  const names = new Set(q(`SELECT name FROM world.game_tele`).map(r => r.name!.toLowerCase()));
  const mine = own.get("game_tele.id") ?? new Set<number>();
  const rows = ma.filter(r => !taken.has(n(r.id)) && (!names.has(r.name!.toLowerCase()) || mine.has(n(r.id))));
  N.emit("game_tele", rows, `id IN (${list(rows.map(r => n(r.id)))})`, `ref_master map ${MAP} (ids and names world does not use)`);
}

// ---- quests --------------------------------------------------------------------------------------------------------------
const QL = list(questIds);
{
  const sfQuest = new Map(q(`SELECT Id, Level, MinLevel FROM ref_sfdb.quest_template WHERE Id IN (${QL})`).map(r => [n(r.Id), r]));
  const known = new Set(questIds);
  const rows = fetch("ref_master", "quest_template", `ID IN (${QL})`).map(r => {
    const sf = sfQuest.get(n(r.ID));
    for (const k of Object.keys(r)) {
      if (/^(RewardItem|RewardChoiceItemID|ItemDrop|StartItem)\d*$/.test(k) && n(r[k]) && !C.item.has(n(r[k]))) { log(`quest ${r.ID}: ${k} ${r[k]} not in Item.db2, cleared`); r[k] = "0"; }
      if (/^(RewardSpell|RewardDisplaySpell\d|SourceSpellID)$/.test(k) && n(r[k]) && !C.spell.has(n(r[k]))) { log(`quest ${r.ID}: ${k} ${r[k]} not in SpellName.db2, cleared`); r[k] = "0"; }
      if (/^(AcceptedSoundKitID|CompleteSoundKitID)$/.test(k) && n(r[k]) && !C.sound.has(n(r[k]))) r[k] = "0";
      if (/^RewardCurrencyID\d$/.test(k) && n(r[k]) && !C.currency.has(n(r[k]))) { log(`quest ${r.ID}: ${k} ${r[k]} not in CurrencyTypes.db2, cleared`); r[k] = "0"; r[k.replace("ID", "Qty")] = "0"; }
      if (k === "RewardSkillLineID" && n(r[k]) && !C.skill.has(n(r[k]))) { log(`quest ${r.ID}: RewardSkillLineID ${r[k]} not in SkillLine.db2, cleared`); r[k] = "0"; r.RewardNumSkillUps = "0"; }
      if (/^RewardFactionValue\d$/.test(k) && Math.abs(n(r[k])) > 9) { log(`quest ${r.ID}: ${k} ${r[k]} outside -9..9, cleared`); r[k] = "0"; }
      if (/^RewardFactionID\d$/.test(k) && n(r[k]) && !C.faction.has(n(r[k]))) { log(`quest ${r.ID}: ${k} ${r[k]} not in Faction.db2, cleared`); r[k] = "0"; }
    }
    if (n(r.RewardNextQuest) && !known.has(n(r.RewardNextQuest)) && !worldQuests.has(n(r.RewardNextQuest))) { log(`quest ${r.ID}: RewardNextQuest ${r.RewardNextQuest} not imported, cleared`); r.RewardNextQuest = "0"; }
    return { ...r, QuestLevel: sf ? sf.Level : "-1", MinLevel: sf ? sf.MinLevel : "0", QuestScalingFactionGroup: "0", QuestMaxScalingLevel: "255" } as Row;
  });
  const noLevel = rows.filter(r => !sfQuest.has(n(r.ID))).map(r => r.ID);
  if (noLevel.length) log(`quests without a SkyFire level (QuestLevel -1, scales): ${noLevel.join(",")}`);
  Q.emit("quest_template", rows, `ID IN (${QL})`, "ref_master; QuestLevel/MinLevel from ref_sfdb; DB2-checked rewards");
  const master = fetch("ref_master", "quest_template_addon", `ID IN (${QL})`);
  const haveAddon = new Set(master.map(r => n(r.ID)));
  const sf = q(`SELECT Id, MaxLevel, RequiredClasses, SourceSpellId, PrevQuestId, NextQuestId, ExclusiveGroup, RewardMailTemplateId, RewardMailDelay,
    RequiredSkillId, RequiredSkillPoints, RequiredMinRepFaction, RequiredMaxRepFaction, RequiredMinRepValue, RequiredMaxRepValue, SpecialFlags
    FROM ref_sfdb.quest_template WHERE Id IN (${QL})`).filter(r => !haveAddon.has(n(r.Id))).map(r => ({
    ID: r.Id, MaxLevel: r.MaxLevel, AllowableClasses: r.RequiredClasses, SourceSpellID: C.spell.has(n(r.SourceSpellId)) ? r.SourceSpellId : "0",
    PrevQuestID: r.PrevQuestId, NextQuestID: r.NextQuestId, ExclusiveGroup: r.ExclusiveGroup, RewardMailTemplateID: r.RewardMailTemplateId,
    RewardMailDelay: r.RewardMailDelay, RequiredSkillID: r.RequiredSkillId, RequiredSkillPoints: r.RequiredSkillPoints,
    RequiredMinRepFaction: r.RequiredMinRepFaction, RequiredMaxRepFaction: r.RequiredMaxRepFaction, RequiredMinRepValue: r.RequiredMinRepValue,
    RequiredMaxRepValue: r.RequiredMaxRepValue, SpecialFlags: r.SpecialFlags,
  } as Row)).filter(r => Object.entries(r).some(([k, v]) => k !== "ID" && n(v)));
  // Profession quests (QuestSortID < 0) need RequiredSkillID; master's addon often lacks it, SkyFire's quest row has it.
  const addon = [...master, ...sf];
  const sfSkill = new Map(q(`SELECT Id, RequiredSkillId, RequiredSkillPoints FROM ref_sfdb.quest_template WHERE Id IN (${QL}) AND RequiredSkillId<>0`).map(r => [n(r.Id), r]));
  let skillFixed = 0;
  for (const qt of rows.filter(r => n(r.QuestSortID) < 0)) {
    const s = sfSkill.get(n(qt.ID));
    if (!s) continue;
    let a = addon.find(x => n(x.ID) === n(qt.ID));
    if (!a) addon.push(a = { ID: qt.ID } as Row);
    if (!n(a.RequiredSkillID)) { a.RequiredSkillID = s.RequiredSkillId; a.RequiredSkillPoints = s.RequiredSkillPoints; skillFixed++; }
  }
  Q.emit("quest_template_addon", addon, `ID IN (${QL})`, `ref_master (${master.length}), else ref_sfdb.quest_template chain columns (${sf.length}); RequiredSkillID from ref_sfdb for ${skillFixed} profession quests`);
  for (const t of ["quest_details", "quest_request_items", "quest_offer_reward", "quest_mail_sender"] as const) {
    const key = t === "quest_mail_sender" ? "QuestId" : "ID";
    Q.emit(t, fetch("ref_master", t, `${key} IN (${QL})`), `${key} IN (${QL})`, "ref_master");
  }
  Q.emit("quest_objectives", objectives, `QuestID IN (${QL})`, "ref_master");
  const oids = list(objectives.map(o => n(o.ID)));
  Q.emit("quest_visual_effect", objectives.length ? fetch("ref_master", "quest_visual_effect", `ID IN (${oids})`) : [], `ID IN (${oids})`, "ref_master");
  Q.emit("quest_poi", fetch("ref_master", "quest_poi", `QuestID IN (${QL})`), `QuestID IN (${QL})`, "ref_master");
  Q.emit("quest_poi_points", fetch("ref_master", "quest_poi_points", `QuestID IN (${QL})`), `QuestID IN (${QL})`, "ref_master");
  const allCr = new Set([...newCrIds, ...worldCr]), allGo = new Set([...newGoIds, ...worldGo]);
  for (const t of ["creature_queststarter", "creature_questender", "gameobject_queststarter", "gameobject_questender"] as const) {
    const ma = fetch("ref_master", t, `quest IN (${QL})`);
    const covered = new Set(ma.map(r => `${r.id}:${r.quest}`));
    const sfr = fetch("ref_sfdb", t, `quest IN (${QL})`).filter(r => !covered.has(`${r.id}:${r.quest}`)).map(r => ({ id: r.id, quest: r.quest } as Row));
    const rows = [...ma, ...sfr];
    const ids = new Set(rows.map(r => n(r.id)));
    const other = inWorld(t.startsWith("creature") ? "creature_template" : "gameobject_template", "entry", [...ids].filter(i => !(t.startsWith("creature") ? allCr : allGo).has(i)));
    const okSet = t.startsWith("creature") ? allCr : allGo;
    const keep = rows.filter(r => okSet.has(n(r.id)) || other.has(n(r.id)));
    const dropped = rows.filter(r => !keep.includes(r));
    if (dropped.length) log(`${t}: ${dropped.length} rows whose giver has no template, skipped (${dropped.slice(0, 20).map(r => `${r.quest}/${r.id}`).join(" ")})`);
    Q.emit(t, keep, `quest IN (${QL})`, `ref_master, plus ref_sfdb pairs master lacks (${sfr.length}); givers with a template`);
  }
  Q.emit("areatrigger_involvedrelation", fetch("ref_master", "areatrigger_involvedrelation", `quest IN (${QL})`), `quest IN (${QL})`, "ref_master");
}

// ---- conditions (master) ----------------------------------------------------------------------------------------------------
{
  const where = [
    `(SourceTypeOrReferenceId IN (14,15) AND SourceGroup IN (${M}))`,
    `(SourceTypeOrReferenceId IN (19,20) AND SourceEntry IN (${QL}))`,
    `(SourceTypeOrReferenceId=26 AND SourceEntry IN (${A}))`,
    `(SourceTypeOrReferenceId=26 AND SourceEntry=0 AND SourceGroup IN (${list(phaseIds)}))`,
    `(SourceTypeOrReferenceId=18 AND SourceGroup IN (${NEW}))`,
    `(SourceTypeOrReferenceId=23 AND SourceGroup IN (${NEW}))`,
    `(SourceTypeOrReferenceId=22 AND SourceId=0 AND (SourceEntry IN (${list([...aiSrc].filter(([, s]) => s === "ma").map(([e]) => e))}) OR -SourceEntry IN (${list(maCr.map(r => n(r.guid)))})))`,
  ];
  const keyOf = (r: Row) => `${r.SourceTypeOrReferenceId},${r.SourceGroup},${r.SourceEntry},${r.SourceId}`;
  const conds = fetch("ref_master", "conditions", where.join(" OR ")).map(r => {
    if (n(r.SourceTypeOrReferenceId) === 22 && n(r.SourceEntry) < 0) return { ...r, SourceEntry: String(-(MA_GUID - n(r.SourceEntry))) };
    return r;
  });
  // Keys world already has (the Wandering Isle's shared phases, cata rows) stay world's.
  const keys = [...new Set(conds.map(keyOf))];
  const worldKeys = new Set<string>();
  for (let i = 0; i < keys.length; i += 2000) {
    const chunk = keys.slice(i, i + 2000);
    for (const r of q(`SELECT CONCAT_WS(',',SourceTypeOrReferenceId,SourceGroup,SourceEntry,SourceId) k FROM world.conditions WHERE (SourceTypeOrReferenceId,SourceGroup,SourceEntry,SourceId) IN (${chunk.map(k => `(${k})`).join(",")})`)) worldKeys.add(r.k!);
  }
  const prev = existsSync(`${outDir}/${FILES.npc}`) ? readFileSync(`${outDir}/${FILES.npc}`, "utf8").match(/^DELETE FROM `conditions` WHERE \(SourceTypeOrReferenceId,SourceGroup,SourceEntry,SourceId\) IN \((.*)\);$/m)?.[1] ?? "" : "";
  const mine = new Set([...prev.matchAll(/\(([-\d,]+)\)/g)].map(m => m[1]));
  const rows = conds.filter(r => !worldKeys.has(keyOf(r)) || mine.has(keyOf(r)));
  const k2 = [...new Set(rows.map(keyOf))];
  N.emit("conditions", rows, k2.length ? `(SourceTypeOrReferenceId,SourceGroup,SourceEntry,SourceId) IN (${k2.map(k => `(${k})`).join(",")})` : "0",
    "ref_master: gossip, quest, Pandaria phase, spellclick, vehicle and master SAI conditions of the rows above");
}

// ---- write -----------------------------------------------------------------------------------------------------------------------
const titles: Record<keyof typeof FILES, string> = {
  tmpl: "creature and gameobject templates, models, equipment, loot", crSpawn: "creature spawns", goSpawn: "gameobject spawns",
  npc: "vendors, trainers, gossip, texts, SmartAI, phasing, conditions", quest: "quests",
};
for (const [k, f] of Object.entries(FILES) as [keyof typeof FILES, string][]) {
  const head = [
    `-- MoP Classic: Pandaria (map ${MAP}), ${titles[k]}.`,
    "-- Generated by tools/mop-content/gen_pandaria.ts; do not edit by hand. Rules and source priority: docs/mop-port/pandaria-import.md.",
    "-- Sources: ref_sfdb = SkyFire 5.4.8 SFDB 26 + core updates, ref_master = TrinityCore master TDB 1210; IDs checked against the 5.5.4.70449 DB2s.",
    "",
  ];
  writeFileSync(`${outDir}/${f}`, [...head, ...outs[k].lines].join("\n").replace(/\n+$/, "\n"));
  log(`wrote ${outDir}/${f}: ${outs[k].summary.join(", ")}`);
}
log(`entries: ${crEntries.size} creatures (${newCrIds.size} new), ${goEntries.size} gameobjects (${newGoIds.size} new), ${questIds.size} quests`);
