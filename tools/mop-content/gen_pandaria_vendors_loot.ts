// Generates the MoP item-side world content gen_pandaria.ts does not cover: item/fishing/milling/prospecting/disenchant/
// spell/mail loot, fishing skill levels, battle pet breeds/qualities, and a source audit of the 5.5.4 mounts and pets.
// usage: bun tools/mop-content/gen_pandaria_vendors_loot.ts <db2 dir> [out dir] [mysql container]
// Source rule: SkyFire 5.4.8 first, TC master fallback, only IDs the 5.5.4.70449 DB2s have (docs/mop-port/pandaria-import.md).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { db2Sets, list, mysql, n, ownKeys, type Row, SqlOut } from "./src/worlddb.ts";

const [db2Dir, outDir = "sql/updates/world/mop_classic", container = "tc-mop-db-1"] = process.argv.slice(2);
if (!db2Dir) throw new Error("usage: gen_pandaria_vendors_loot.ts <db2 dir> [out dir] [container]");
const FILES = { loot: "2026_10_19_25_world.sql", pets: "2026_10_19_26_world.sql" };
const AUDIT = "tools/mop-content/data/mop_mount_pet_sources.json";
// Same renumbering as gen_pandaria.ts: SkyFire references live at 6M + id.
const REF_SF = 6_000_000;
const MAP = 870;

const q = mysql(container);
const log = (s: string) => console.error(s);
const fetch = (db: string, table: string, where: string) => q(`SELECT * FROM ${db}.\`${table}\` WHERE ${where}`);
const own = ownKeys([...Object.values(FILES), "2026_10_19_20_world.sql"].map(f => `${outDir}/${f}`), f => (existsSync(f) ? readFileSync(f, "utf8") : undefined));
function inWorld(table: string, col: string, ids: Iterable<number>) {
  const mine = own.get(`${table}.${col}`) ?? new Set<number>();
  const l = list(ids);
  if (l === "NULL") return new Set<number>();
  return new Set(q(`SELECT DISTINCT \`${col}\` k FROM world.\`${table}\` WHERE \`${col}\` IN (${l})`).map(r => n(r.k)).filter(k => !mine.has(k)));
}

const D = db2Sets(db2Dir);
const C = {
  item: D.ids("Item"), spell: D.ids("SpellName"), species: D.ids("BattlePetSpecies"), disenchant: D.ids("ItemDisenchantLoot"),
  mail: D.ids("MailTemplate"), area: new Set(D.rows("AreaTable").map(r => r.ID as number)),
};
const pandariaAreas = new Set(D.rows("AreaTable").filter(r => r.ContinentID === MAP).map(r => r.ID as number));
const L = new SqlOut(q), P = new SqlOut(q);

// ---- loot tables keyed by item, spell, area, mail template: SkyFire entries world lacks --------------------------------------
const refs = new Set<number>();
const sfRow = (table: string, entry: number, r: Row): Row | null => {
  const ref = n(r.mincountOrRef) < 0, c = Number(r.ChanceOrQuestChance);
  if (ref) refs.add(-n(r.mincountOrRef));
  else if (!C.item.has(n(r.item))) { log(`${table} ${entry}: item ${r.item} not in Item.db2, dropped`); return null; }
  return { Entry: String(entry), ItemType: ref ? "1" : "0", Item: String(ref ? REF_SF - n(r.mincountOrRef) : n(r.item)), Chance: String(Math.abs(c)),
    QuestRequired: c < 0 ? "1" : "0", LootMode: r.lootmode, GroupId: r.groupid, MinCount: ref ? "1" : r.mincountOrRef, MaxCount: r.maxcount, Comment: "ref_sfdb" };
};
const KEYED: [string, (id: number) => boolean, string][] = [
  ["item_loot_template", id => C.item.has(id), "container items (Item.db2)"],
  ["milling_loot_template", id => C.item.has(id), "herbs (Item.db2)"],
  ["prospecting_loot_template", id => C.item.has(id), "ores (Item.db2)"],
  ["disenchant_loot_template", id => C.disenchant.has(id), "ItemDisenchantLoot.db2 ids"],
  ["spell_loot_template", id => C.spell.has(id), "spells (SpellName.db2)"],
  ["mail_loot_template", id => C.mail.has(id), "MailTemplate.db2 ids"],
  ["fishing_loot_template", id => C.area.has(id), "areas (AreaTable.db2)"],
];
for (const [table, valid, what] of KEYED) {
  const sfIds = q(`SELECT DISTINCT entry FROM ref_sfdb.${table}`).map(r => n(r.entry));
  const have = inWorld(table, "Entry", sfIds);
  const ids = sfIds.filter(id => !have.has(id));
  const bad = ids.filter(id => !valid(id));
  if (bad.length) log(`${table}: SkyFire entries not in the client, skipped: ${bad.join(",")}`);
  const ok = ids.filter(valid);
  const rows = (ok.length ? fetch("ref_sfdb", table, `entry IN (${list(ok)}) ORDER BY entry, item`) : []).map(r => sfRow(table, n(r.entry), r)).filter(Boolean) as Row[];
  const ent = new Set(rows.map(r => n(r.Entry)));
  const pandaria = table === "fishing_loot_template" ? ` (${[...ent].filter(a => pandariaAreas.has(a)).length} in Pandaria)` : "";
  L.emit(table, rows, `Entry IN (${list(ent)})`, `ref_sfdb entries world lacks, ${what}${pandaria}; Item.db2 checked`);
  log(`${table}: ${ent.size} SkyFire entries world lacks${pandaria}`);
}
{
  const rows: Row[] = [], done = new Set<number>();
  while ([...refs].some(r => !done.has(r))) {
    const todo = [...refs].filter(r => !done.has(r));
    todo.forEach(r => done.add(r));
    for (const r of fetch("ref_sfdb", "reference_loot_template", `entry IN (${list(todo)})`)) { const o = sfRow("reference_loot_template", REF_SF + n(r.entry), r); if (o) rows.push(o); }
  }
  // gen_pandaria.ts may write some of the same references (same ids, same rows); deleting them here is harmless.
  L.emit("reference_loot_template", rows, `Entry IN (${list(rows.map(r => n(r.Entry)))})`, `ref_sfdb references of the loot above as ${REF_SF}+id`);
}
{
  const sf = fetch("ref_sfdb", "skill_fishing_base_level", "1");
  const have = inWorld("skill_fishing_base_level", "entry", sf.map(r => n(r.entry)));
  const rows = sf.filter(r => !have.has(n(r.entry)) && C.area.has(n(r.entry)));
  L.emit("skill_fishing_base_level", rows, `entry IN (${list(rows.map(r => n(r.entry)))})`, "ref_sfdb areas world lacks (AreaTable.db2)");
}

// ---- battle pets: breeds and qualities for 5.5.4 species world lacks -----------------------------------------------------------
{
  for (const [table, sfTable, sfCols, col] of [["battle_pet_breeds", "battle_pet_breed", ["species", "breed"], "breedId"], ["battle_pet_quality", "battle_pet_quality", ["species", "quality"], "quality"]] as const) {
    // TC's battle_pet_quality is one default quality per species; SkyFire's lists every possible quality, so master only.
    const sf = table === "battle_pet_quality" ? [] : q(`SELECT ${sfCols[0]} s, ${sfCols[1]} v FROM ref_sfdb.${sfTable} ORDER BY 1, 2`).map(r => ({ speciesId: r.s, [col]: r.v } as Row));
    const ma = q(`SELECT speciesId s, ${col} v FROM ref_master.${table} ORDER BY 1, 2`).map(r => ({ speciesId: r.s, [col]: r.v } as Row));
    const sfSpecies = new Set(sf.map(r => n(r.speciesId)));
    const all = [...sf, ...ma.filter(r => !sfSpecies.has(n(r.speciesId)))];
    const have = inWorld(table, "speciesId", all.map(r => n(r.speciesId)));
    const notClient = new Set(all.filter(r => !C.species.has(n(r.speciesId))).map(r => n(r.speciesId)));
    const rows = all.filter(r => C.species.has(n(r.speciesId)) && !have.has(n(r.speciesId)));
    const sp = new Set(rows.map(r => n(r.speciesId)));
    P.emit(table, rows, `speciesId IN (${list(sp)})`, `ref_sfdb (${rows.filter(r => sfSpecies.has(n(r.speciesId))).length}), else ref_master; species in BattlePetSpecies.db2 world lacks`);
    log(`${table}: ${sp.size} species added, ${have.size} kept from world, ${notClient.size} source species not in BattlePetSpecies.db2`);
  }
}

// ---- mounts and pets: which 5.5.4 entries have a SkyFire source, a master source, or none -------------------------------------
{
  const effects = D.rows("ItemEffect");
  const xeff = existsSync(`${db2Dir}/ItemXItemEffect.db2`) ? D.rows("ItemXItemEffect") : [];
  const effItem = new Map<number, number[]>();
  for (const x of xeff) effItem.set(x.ItemEffectID as number, [...(effItem.get(x.ItemEffectID as number) ?? []), x.ItemID as number]);
  const itemsBySpell = new Map<number, Set<number>>();
  for (const e of effects) {
    const items = [...(n(String(e.ParentItemID ?? 0)) ? [e.ParentItemID as number] : []), ...(effItem.get(e.ID as number) ?? [])];
    for (const it of items) itemsBySpell.set(e.SpellID as number, (itemsBySpell.get(e.SpellID as number) ?? new Set()).add(it));
  }
  const sfItems = new Set(q(`SELECT entry FROM ref_sfdb.item_template`).map(r => n(r.entry)));
  const sources = (db: string, items: number[]) => {
    if (!items.length) return new Map<number, string[]>();
    const L2 = list(items), m = new Map<number, string[]>();
    const add = (it: string | null, what: string) => m.set(n(it), [...new Set([...(m.get(n(it)) ?? []), what])]);
    const lootCol = db === "ref_sfdb" ? "item" : "Item", extra = db === "ref_sfdb" ? "AND mincountOrRef>0" : "AND ItemType=0";
    for (const r of q(`SELECT item i, entry e FROM ${db}.npc_vendor WHERE item IN (${L2})`)) add(r.i, `vendor ${r.e}`);
    for (const t of ["creature_loot_template", "gameobject_loot_template", "item_loot_template", "reference_loot_template"])
      for (const r of q(`SELECT ${lootCol} i, COUNT(*) c FROM ${db}.${t} WHERE ${lootCol} IN (${L2}) ${extra} GROUP BY 1`)) add(r.i, t.replace("_loot_template", " loot"));
    const qcols = db === "ref_sfdb" ? ["RewardItemId1", "RewardItemId2", "RewardItemId3", "RewardItemId4", "RewardChoiceItemId1", "RewardChoiceItemId2", "RewardChoiceItemId3", "RewardChoiceItemId4", "RewardChoiceItemId5", "RewardChoiceItemId6"]
      : ["RewardItem1", "RewardItem2", "RewardItem3", "RewardItem4", "RewardChoiceItemID1", "RewardChoiceItemID2", "RewardChoiceItemID3", "RewardChoiceItemID4", "RewardChoiceItemID5", "RewardChoiceItemID6"];
    for (const c of qcols) for (const r of q(`SELECT ${c} i, ${db === "ref_sfdb" ? "Id" : "ID"} qid FROM ${db}.quest_template WHERE ${c} IN (${L2})`)) add(r.i, `quest ${r.qid}`);
    return m;
  };
  const audit: Record<string, unknown> = {};
  for (const [kind, rowsDb2, spellCol] of [["mounts", D.rows("Mount"), "SourceSpellID"], ["pets", D.rows("BattlePetSpecies"), "SummonSpellID"]] as const) {
    const ent = rowsDb2.map(r => ({ id: r.ID as number, spell: r[spellCol] as number, sourceType: r.SourceTypeEnum as number, items: [...(itemsBySpell.get(r[spellCol] as number) ?? [])].filter(i => C.item.has(i)) }));
    const withItems = ent.filter(e => e.items.length);
    const newIn554 = withItems.filter(e => !e.items.some(i => sfItems.has(i)));
    const allItems = newIn554.flatMap(e => e.items);
    const ma = sources("ref_master", allItems), wo = sources("world", allItems);
    const rows = newIn554.map(e => ({ id: e.id, spell: e.spell, sourceType: e.sourceType, items: e.items, world: e.items.flatMap(i => wo.get(i) ?? []), master: e.items.flatMap(i => ma.get(i) ?? []) }));
    const sfKnown = withItems.filter(e => e.items.some(i => sfItems.has(i)));
    const sfSrc = sources("ref_sfdb", sfKnown.flatMap(e => e.items));
    audit[kind] = {
      db2: ent.length, withItem: withItems.length, noItem: ent.length - withItems.length,
      skyfireItem: sfKnown.length, skyfireItemWithSkyfireSource: sfKnown.filter(e => e.items.some(i => sfSrc.has(i))).length,
      notInSkyfire: rows.length, notInSkyfireWithWorldSource: rows.filter(r => r.world.length).length, notInSkyfireWithMasterSource: rows.filter(r => r.master.length).length,
      notInSkyfireList: rows,
    };
    log(`${kind}: ${ent.length} in DB2, ${withItems.length} taught by an item; ${sfKnown.length} items SkyFire has (${(audit[kind] as { skyfireItemWithSkyfireSource: number }).skyfireItemWithSkyfireSource} with a SkyFire vendor/loot/quest source); `
      + `${rows.length} items SkyFire lacks (world source ${rows.filter(r => r.world.length).length}, master source ${rows.filter(r => r.master.length).length})`);
  }
  writeFileSync(AUDIT, JSON.stringify(audit, null, 1) + "\n");
  log(`wrote ${AUDIT}`);
}

for (const [k, out] of [["loot", L], ["pets", P]] as const) {
  const head = [
    `-- MoP Classic: ${k === "loot" ? "item, fishing, milling, prospecting, disenchant, spell and mail loot plus fishing skill levels" : "battle pet breeds and qualities"} SkyFire 5.4.8 has and world lacks.`,
    "-- Generated by tools/mop-content/gen_pandaria_vendors_loot.ts; do not edit by hand. Rules: docs/mop-port/pandaria-import.md.",
    "-- Sources: ref_sfdb = SkyFire 5.4.8 SFDB 26 + core updates, ref_master = TrinityCore master TDB 1210; IDs checked against the 5.5.4.70449 DB2s.",
    "",
  ];
  writeFileSync(`${outDir}/${FILES[k]}`, [...head, ...out.lines].join("\n").replace(/\n+$/, "\n"));
  log(`wrote ${outDir}/${FILES[k]}: ${out.summary.join(", ")}`);
}
