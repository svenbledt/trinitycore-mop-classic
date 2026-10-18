// Generates the hotfixes update that fills broadcast_text for every BroadcastTextID the world DB references but the 5.5.4 client
// BroadcastText.db2 lacks (its file only carries 1523 rows; retail answers the rest with SMSG_DB_REPLY).
// usage: bun tools/mop-content/gen_hotfixes_broadcast_text.ts <db2 dir> <sniff.pkt>... [--out file] [--container name]
// Sources, highest first: DB_REPLY rows from retail 5.5.4 sniffs, then ref_master_hotfixes (TC master hotfixes TDB 1210).
import { readFileSync, writeFileSync } from "node:fs";
import { readDb2 } from "./src/db2.ts";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const outFile = opt("--out", "sql/updates/hotfixes/mop_classic/2026_10_18_01_hotfixes.sql");
const container = opt("--container", "tc-mop-db-1");
const [db2Dir, ...pkts] = args;
if (!db2Dir || !pkts.length) throw new Error("usage: gen_hotfixes_broadcast_text.ts <db2 dir> <sniff.pkt>... [--out file]");
const root = (p: string) => new URL(`../../${p}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const DBD = root("tools/mop-re/refs/wowdbdefs/definitions/");
const db2 = (name: string) => readDb2(`${db2Dir}/${name}.db2`, `${DBD}${name}.dbd`).rows;
const log = (s: string) => console.error(s);

const BUILD = 70449;
const BROADCAST_TEXT_HASH = 0x021826BB;
const LOCALES = ["deDE"]; // the locales the local client installs next to enUS (/data/dbc)

type Row = Record<string, string | null>;
function q(sql: string): Row[] {
  const r = Bun.spawnSync(["docker", "exec", "-i", container, "mysql", "-uroot", "-proot", "-B", "--default-character-set=utf8mb4"], { stdin: Buffer.from(sql) });
  if (r.exitCode !== 0) throw new Error(`${sql.slice(0, 300)}\n${r.stderr.toString()}`);
  const lines = r.stdout.toString().split("\n").filter(l => l.length);
  if (!lines.length) return [];
  const head = lines[0].split("\t");
  return lines.slice(1).map(l => { const v = l.split("\t"), o: Row = {}; head.forEach((h, i) => { o[h] = v[i] === "NULL" ? null : v[i]; }); return o; });
}

// Columns of hotfixes.broadcast_text in DB2LoadInfo order (= the 5.5.4 hotfix row layout, WoWDBDefs layout 2527CC73).
const COLS: [string, number, boolean][] = [ // name, byte size (0 = cstring), signed
  ["Text", 0, false], ["Text1", 0, false], ["ID", 4, false], ["LanguageID", 4, true], ["ConditionID", 4, true], ["EmotesID", 2, false],
  ["Flags", 4, true], ["ChatBubbleDurationMs", 4, false], ["VoiceOverPriorityID", 4, true], ["SoundKitID1", 4, false], ["SoundKitID2", 4, false],
  ["EmoteID1", 2, false], ["EmoteID2", 2, false], ["EmoteID3", 2, false], ["EmoteDelay1", 2, false], ["EmoteDelay2", 2, false], ["EmoteDelay3", 2, false],
];

// ---- retail rows: SMSG_DB_REPLY (u32 hash, i32 id, u32 time, 3-bit status, u32 size, row) from ymir .pkt files ----
const opcodes = readFileSync(root("src/server/game/Server/Protocol/Opcodes.h"), "utf8");
const DB_REPLY = parseInt(opcodes.match(/SMSG_DB_REPLY\s*=\s*(0x[0-9A-Fa-f]+)/)![1], 16);
const sniff = new Map<number, Row>();
for (const file of pkts) {
  const b = readFileSync(file);
  let o = 3 + 2 + 1 + 4 + 4 + 40 + 4 + 4;
  o += 4 + b.readUInt32LE(o);
  while (o + 20 <= b.length) {
    const dir = b.readUInt32LE(o), opt = b.readUInt32LE(o + 12), len = b.readUInt32LE(o + 16);
    o += 20 + opt;
    const op = b.readUInt32LE(o), d = b.subarray(o + 4, o + len);
    o += len;
    if (dir !== 0x47534D53 || op !== DB_REPLY || d.length < 17) continue;
    if (d.readUInt32LE(0) !== BROADCAST_TEXT_HASH || d[12] >> 5 !== 1) continue; // Status::Valid
    const row: Row = {}; let p = 17;
    for (const [name, size, signed] of COLS) {
      if (!size) { const e = d.indexOf(0, p); row[name] = d.toString("utf8", p, e); p = e + 1; continue; }
      row[name] = String(size === 4 ? (signed ? d.readInt32LE(p) : d.readUInt32LE(p)) : d.readUInt16LE(p)); p += size;
    }
    if (p !== 17 + d.readUInt32LE(13)) throw new Error(`${file}: BroadcastText ${d.readInt32LE(4)} row size mismatch`);
    if (Number(row.ID) !== d.readInt32LE(4)) throw new Error(`${file}: BroadcastText RecordID ${d.readInt32LE(4)} != row ID ${row.ID}`);
    sniff.set(Number(row.ID), row);
  }
}
log(`sniff DB_REPLY BroadcastText rows: ${sniff.size}`);

// ---- what the world references and the client file lacks ----
const clientIds = new Set(db2("BroadcastText").map(r => r.Field_1_15_8_63829_002 as number)); // $id$ column of layout 2527CC73
const refCols = q(`SELECT TABLE_NAME t, COLUMN_NAME c FROM information_schema.columns WHERE TABLE_SCHEMA='world' AND COLUMN_NAME LIKE '%BroadcastText%'`);
const referenced = new Set(q(refCols.map(r => `SELECT \`${r.c}\` id FROM world.\`${r.t}\``).join(" UNION ")).map(r => Number(r.id)).filter(x => x > 0));
const wanted = [...new Set([...referenced, ...sniff.keys()])].filter(id => !clientIds.has(id) || sniff.has(id)).sort((a, b) => a - b);
log(`referenced by world (${refCols.map(r => `${r.t}.${r.c}`).join(", ")}): ${referenced.size}; not in BroadcastText.db2: ${wanted.length}`);

// ---- master rows for the rest; references the 5.5.4 client cannot resolve are cleared ----
const master = new Map<number, Row>();
for (let i = 0; i < wanted.length; i += 5000) {
  const ids = wanted.slice(i, i + 5000).filter(id => !sniff.has(id));
  if (!ids.length) continue;
  for (const r of q(`SELECT * FROM ref_master_hotfixes.broadcast_text WHERE ID IN (${ids.join(",")}) ORDER BY VerifiedBuild`)) master.set(Number(r.ID), r);
}
const known = {
  LanguageID: new Set(db2("Languages").map(r => r.ID as number)), SoundKit: new Set(db2("SoundKit").map(r => r.ID as number)),
  Emote: new Set(db2("Emotes").map(r => r.ID as number)), Condition: new Set(db2("PlayerCondition").map(r => r.ID as number)),
};
const cleared = new Map<string, number>();
const clear = (r: Row, k: string, ok: boolean) => { if (!ok && Number(r[k])) { r[k] = "0"; cleared.set(k, (cleared.get(k) ?? 0) + 1); } };
const sniffCondMissing = [...sniff.values()].filter(r => Number(r.ConditionID) && !known.Condition.has(Number(r.ConditionID))).length;
for (const r of master.values()) {
  clear(r, "LanguageID", known.LanguageID.has(Number(r.LanguageID)));
  for (const k of ["SoundKitID1", "SoundKitID2"]) clear(r, k, known.SoundKit.has(Number(r[k])));
  for (const k of ["EmoteID1", "EmoteID2", "EmoteID3"]) clear(r, k, known.Emote.has(Number(r[k])));
  // Retail rows reference PlayerConditions the client file also lacks (sniff rows too), so ConditionID is kept as is.
}
const missing = wanted.filter(id => !sniff.has(id) && !master.has(id));
log(`master rows: ${master.size}; cleared references: ${[...cleared].map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
log(`sniff rows whose ConditionID is not in PlayerCondition.db2: ${sniffCondMissing}`);
if (missing.length) log(`no source for ${missing.length} ids: ${missing.slice(0, 40).join(",")}${missing.length > 40 ? ",..." : ""}`);

// ---- SQL ----
const lit = (v: string | null | undefined, numeric: boolean) => v === null || v === undefined ? "NULL"
  : numeric ? String(Number(v)) : `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\0/g, "\\0")}'`;
// mysql -B already escapes \n, \t and \\ in master strings, so those are re-quoted without a second escape pass.
const litDb = (v: string | null | undefined) => v === null || v === undefined ? "NULL" : `'${v.replace(/'/g, "\\'")}'`;
const all = [...new Set([...sniff.keys(), ...master.keys()])].sort((a, b) => a - b);
const out: string[] = [
  "-- MoP Classic: broadcast_text rows the 5.5.4 client file lacks but the world DB references (creature_text, npc_text, gossip options).",
  "-- Generated by tools/mop-content/gen_hotfixes_broadcast_text.ts; do not edit by hand.",
  `-- Sources: retail 5.5.4.${BUILD} SMSG_DB_REPLY rows (${sniff.size}, VerifiedBuild ${BUILD}), else ref_master_hotfixes = TC master hotfixes TDB 1210 (${master.size}).`,
  "-- No hotfix_data rows: HandleDBQueryBulk answers from the store, as retail did (no BroadcastText in AVAILABLE_HOTFIXES).",
  "",
];
for (let i = 0; i < all.length; i += 1000) {
  const ids = all.slice(i, i + 1000);
  out.push(`DELETE FROM \`broadcast_text\` WHERE \`ID\` IN (${ids.join(",")});`);
  out.push(`INSERT INTO \`broadcast_text\` (${COLS.map(c => `\`${c[0]}\``).join(",")},\`VerifiedBuild\`) VALUES`);
  out.push(ids.map(id => {
    const s = sniff.get(id);
    if (s) return `(${COLS.map(([k, size]) => lit(s[k], size > 0)).join(",")},${BUILD})`;
    const m = master.get(id)!;
    return `(${COLS.map(([k, size]) => (size ? String(Number(m[k])) : litDb(m[k]))).join(",")},${Number(m.VerifiedBuild)})`;
  }).join(",\n") + ";");
}
let locRows = 0;
const masterIds = [...master.keys()];
for (const loc of LOCALES) {
  for (let i = 0; i < masterIds.length; i += 1000) {
    const ids = masterIds.slice(i, i + 1000);
    const rows = q(`SELECT ID, Text_lang, Text1_lang, VerifiedBuild FROM ref_master_hotfixes.broadcast_text_locale WHERE locale='${loc}' AND ID IN (${ids.join(",")})`);
    out.push(`DELETE FROM \`broadcast_text_locale\` WHERE \`locale\`='${loc}' AND \`ID\` IN (${ids.join(",")});`);
    if (!rows.length) continue;
    locRows += rows.length;
    out.push("INSERT INTO `broadcast_text_locale` (`ID`,`locale`,`Text_lang`,`Text1_lang`,`VerifiedBuild`) VALUES");
    out.push(rows.map(r => `(${r.ID},'${loc}',${litDb(r.Text_lang)},${litDb(r.Text1_lang)},${Number(r.VerifiedBuild)})`).join(",\n") + ";");
  }
}
writeFileSync(outFile, out.join("\n") + "\n");
log(`wrote ${outFile}: ${all.length} broadcast_text rows, ${locRows} broadcast_text_locale rows (${LOCALES.join(",")}; from master only)`);
