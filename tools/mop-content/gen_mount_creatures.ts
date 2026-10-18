// Generates the creature templates of mounts: every SPELL_AURA_MOUNTED (78) spell in the 5.5.4 client names its creature in
// MiscValue (vehicle, fallback display); 5.5.4 adds mounts 5.4.8 never had. Rows for entries world lacks.
// usage: bun tools/mop-content/gen_mount_creatures.ts <db2 dir> [out.sql] [mysql container]
// Sources: ref_master (TC master TDB 1210) rows; SkyFire 5.4.8 (ref_sfdb) wins for name, scale and VehicleId where it has the entry.
import { writeFileSync } from "node:fs";
import { readDb2 } from "./src/db2.ts";

const [db2Dir, outFile = "sql/updates/world/mop_classic/2026_10_19_11_world.sql", container = "tc-mop-db-1"] = process.argv.slice(2);
if (!db2Dir) throw new Error("usage: gen_mount_creatures.ts <db2 dir> [out.sql] [container]");
const root = (p: string) => new URL(`../../${p}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const DBD = root("tools/mop-re/refs/wowdbdefs/definitions/");
const db2 = (name: string) => readDb2(`${db2Dir}/${name}.db2`, `${DBD}${name}.dbd`).rows;
const log = (s: string) => console.error(s);

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
for (const r of q(`SELECT TABLE_NAME t, COLUMN_NAME c, DATA_TYPE d FROM information_schema.columns WHERE TABLE_SCHEMA='world' ORDER BY TABLE_NAME, ORDINAL_POSITION`))
  (colInfo.get(r.t!) ?? colInfo.set(r.t!, []).get(r.t!)!).push({ name: r.c!, numeric: /int|float|double|decimal/.test(r.d!) });
const out: string[] = [], summary: string[] = [];
function emit(table: string, rows: Row[], del: string, note: string) {
  const cols = colInfo.get(table)!;
  summary.push(`${table}: ${rows.length}`);
  out.push(`-- ${table}: ${note} (${rows.length} rows)`, `DELETE FROM \`${table}\` WHERE ${del};`);
  if (!rows.length) { out.push(""); return; }
  const use = cols.filter(c => rows.some(r => c.name in r));
  const lit = (c: { numeric: boolean }, v: string | null | undefined) => v === undefined ? "DEFAULT" : v === null ? "NULL"
    : c.numeric ? (/^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(v) ? v : String(Number(v))) : `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  for (let i = 0; i < rows.length; i += 500) {
    out.push(`INSERT INTO \`${table}\` (${use.map(c => `\`${c.name}\``).join(",")}) VALUES`);
    out.push(rows.slice(i, i + 500).map(r => `(${use.map(c => lit(c, r[c.name])).join(",")})`).join(",\n") + ";");
  }
  out.push("");
}

const spellNames = new Set(db2("SpellName").map(r => r.ID as number));
const displays = new Set(db2("CreatureDisplayInfo").map(r => r.ID as number));
const vehicles = new Set(db2("Vehicle").map(r => r.ID as number));
const mountBySpell = new Map(db2("Mount").map(m => [m.SourceSpellID as number, m.ID as number]));
const mountDisplays = new Set(db2("MountXDisplay").map(r => r.MountID as number));
const spellsOf = new Map<number, number[]>();
for (const e of db2("SpellEffect"))
  if ((e.Effect as number) === 6 && (e.EffectAura as number) === 78 && spellNames.has(e.SpellID as number) && (e.EffectMiscValue as number[])[0])
    spellsOf.set((e.EffectMiscValue as number[])[0], [...(spellsOf.get((e.EffectMiscValue as number[])[0]) ?? []), e.SpellID as number]);

// Mount creatures world lacks, plus the accessories (passengers) of the vehicle ones.
const have = new Set(q(`SELECT entry FROM world.creature_template WHERE entry IN (${list(spellsOf.keys())})`).map(r => n(r.entry)));
const want = new Set([...spellsOf.keys()].filter(e => !have.has(e)));
for (let i = 0; i < 3; i++)
  for (const r of q(`SELECT accessory_entry a FROM ref_master.vehicle_template_accessory WHERE entry IN (${list(want)})`))
    if (!q(`SELECT 1 FROM world.creature_template WHERE entry=${n(r.a)}`).length) want.add(n(r.a));
const master = q(`SELECT * FROM ref_master.creature_template WHERE entry IN (${list(want)})`);
const sf = new Map(q(`SELECT entry, name, subname, scale, VehicleId FROM ref_sfdb.creature_template WHERE entry IN (${list(want)})`).map(r => [n(r.entry), r]));
const got = new Set(master.map(r => n(r.entry)));
for (const e of want) if (!got.has(e)) {
  const sp = spellsOf.get(e) ?? [];
  const displayOk = sp.some(s => mountDisplays.has(mountBySpell.get(s) ?? -1));
  log(`creature ${e} (spells ${sp.join(",")}): in neither ref_master nor ref_sfdb${displayOk ? " - MountXDisplay covers the display" : " - NO display source (TODO)"}`);
}
const E = list(got);
emit("creature_template", master.map(r => {
  const s = sf.get(n(r.entry)), o: Row = { ...r, ScriptName: "", AIName: r.AIName === "SmartAI" ? "" : r.AIName };
  if (s) Object.assign(o, { name: s.name, subname: s.subname, scale: s.scale, VehicleId: s.VehicleId });
  if (n(o.VehicleId) && !vehicles.has(n(o.VehicleId))) { log(`creature ${r.entry}: VehicleId ${o.VehicleId} not in Vehicle.db2, cleared`); o.VehicleId = "0"; }
  return o;
}), `entry IN (${E})`, "ref_master; name/subname/scale/VehicleId from ref_sfdb where it has the entry; no scripts (none ported)");
emit("creature_template_difficulty", q(`SELECT * FROM ref_master.creature_template_difficulty WHERE Entry IN (${E}) AND DifficultyID=0`).map(r => ({
  ...r, HealthScalingExpansion: n(r.HealthScalingExpansion) > 4 ? "4" : r.HealthScalingExpansion, LootID: "0", PickPocketLootID: "0", SkinLootID: "0" })),
  `Entry IN (${E})`, "ref_master DifficultyID 0 (HealthScalingExpansion capped at 4 = MoP, no loot)");
const models = q(`SELECT * FROM ref_master.creature_template_model WHERE CreatureID IN (${E})`).filter(r => {
  if (displays.has(n(r.CreatureDisplayID))) return true;
  log(`creature ${r.CreatureID}: display ${r.CreatureDisplayID} not in CreatureDisplayInfo.db2, dropped`); return false;
});
emit("creature_template_model", models, `CreatureID IN (${E})`, "ref_master, displays in CreatureDisplayInfo.db2");
{
  const ids = new Set(models.map(r => n(r.CreatureDisplayID)));
  const haveInfo = new Set(q(`SELECT DisplayID FROM world.creature_model_info WHERE DisplayID IN (${list(ids)})`).map(r => n(r.DisplayID)));
  const add = [...ids].filter(d => !haveInfo.has(d));
  emit("creature_model_info", add.length ? q(`SELECT * FROM ref_master.creature_model_info WHERE DisplayID IN (${list(add)})`) : [], `DisplayID IN (${list(add)})`, "ref_master, displays world lacks");
}
emit("vehicle_template_accessory", q(`SELECT * FROM ref_master.vehicle_template_accessory WHERE entry IN (${E})`), `entry IN (${E})`, "ref_master (multi-seat mounts' passengers)");
emit("npc_spellclick_spells", q(`SELECT * FROM ref_master.npc_spellclick_spells WHERE npc_entry IN (${E})`).filter(r => spellNames.has(n(r.spell_id))),
  `npc_entry IN (${E})`, "ref_master, spells in SpellName.db2 (passenger seats)");
emit("vehicle_template", q(`SELECT * FROM ref_master.vehicle_template WHERE creatureId IN (${E})`), `creatureId IN (${E})`, "ref_master");

writeFileSync(outFile, [
  "-- MoP Classic: creature templates of mounts (SPELL_AURA_MOUNTED MiscValue) the world DB lacks, including 5.5.4 additions over 5.4.8.",
  "-- Generated by tools/mop-content/gen_mount_creatures.ts; do not edit by hand. Sources: ref_master rows, ref_sfdb name/scale/VehicleId; DB2s 5.5.4.70449.",
  "", ...out].join("\n").replace(/\n+$/, "\n"));
log(`wrote ${outFile}: ${got.size} of ${want.size} wanted entries (${spellsOf.size} mount creatures in the client)\n${summary.join("\n")}`);
