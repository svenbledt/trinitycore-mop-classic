// Emits TrinityCore DB2Metadata.h / DB2LoadInfo.h blocks from WoWDBDefs build definitions.
import type { DbdBuild, DbdColumn, DbdField } from "./dbd";

const ft = (f: DbdField) => f.type === "float" ? "FT_FLOAT" : f.type === "locstring" ? "FT_STRING"
  : f.type === "string" ? "FT_STRING_NOT_LOCALIZED" : ({ 8: "FT_BYTE", 16: "FT_SHORT", 32: "FT_INT", 64: "FT_LONG" } as const)[f.size ?? 32];
const isSigned = (f: DbdField) => f.type === "int" && !f.unsigned && !f.isId;
const inMeta = (f: DbdField) => !f.noninline || f.isRelation; // non-inline relation is listed but not stored in the record

// "Name_male_lang" -> "NameMale" (TrinityCore field naming)
export const tcName = (n: string) => n.replace(/_lang$/, "").split("_").map((p, i) => (i ? p[0].toUpperCase() + p.slice(1) : p)).join("");

export function emitMeta(table: string, fdid: number, b: DbdBuild, parentIndex: number): string {
  const fields = b.fields.filter(inMeta);
  const id = b.fields.find(f => f.isId);
  const idIdx = !id || id.noninline ? -1 : fields.indexOf(id);
  const body = fields.map(f => `        { ${ft(f)}, ${f.arrayLen}, ${f.type === "int" ? isSigned(f) : true} },`).join("\n");
  return `struct ${table}Meta\n{\n    static constexpr DB2MetaField Fields[${fields.length}] =\n    {\n${body}\n    };\n\n` +
    `    static constexpr DB2Meta Instance{ ${fdid}, ${idIdx}, ${fields.length}, ${fields.filter(f => !f.noninline).length}, 0x${b.layoutHashes[0]}, Fields, ${parentIndex} };\n};`;
}

export const parentIndexOf = (b: DbdBuild) => b.fields.filter(inMeta).findIndex(f => f.isRelation);

export const snake =(t: string) => t.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toUpperCase();

export interface MetaEntry { table: string; fdid: number; parentIndex: number; text: string }

export function parseMetaFile(src: string): MetaEntry[] {
  return [...src.matchAll(/struct (\w+)Meta\n\{[\s\S]*?Instance\{ (\d+), -?\d+, \d+, \d+, 0x[0-9A-F]+, Fields, (-?\d+) \};\n\};/g)]
    .map(m => ({ table: m[1], fdid: +m[2], parentIndex: +m[3], text: m[0] }));
}

export function emitLoadInfo(table: string, b: DbdBuild, _cols: Map<string, DbdColumn>): string {
  const lines: string[] = [];
  for (const f of b.fields) {
    const n = tcName(f.name);
    if (f.arrayLen === 1) lines.push(`        { ${isSigned(f)}, ${ft(f)}, "${n}" },`);
    else for (let k = 1; k <= f.arrayLen; k++) lines.push(`        { ${isSigned(f)}, ${ft(f)}, "${n}${k}" },`);
  }
  return `struct ${table}LoadInfo\n{\n    static constexpr DB2FieldMeta Fields[${lines.length}] =\n    {\n${lines.join("\n")}\n    };\n\n` +
    `    static constexpr DB2LoadInfo Instance{ Fields, ${lines.length}, &${table}Meta::Instance, HOTFIX_SEL_${snake(table)} };\n};`;
}

export interface LoadField { signed: boolean; ft: string; name: string; borrowed?: boolean }

// extractor_common/ExtractorDB2LoadInfo.h block = server Meta fields + server LoadInfo fields, extractor naming.
export function rebuildExtractorBlock(ext: string, meta: string, load: string): string {
  const metaBody = meta.match(/Fields\[\d+\] =\n    \{\n([\s\S]*?)\n    \};/)![1];
  const metaCount = meta.match(/DB2MetaField Fields\[(\d+)\]/)![1];
  const inst = meta.match(/Instance\{ ([^}]*), Fields, (-?\d+) \}/)!;
  const loadBody = load.match(/Fields\[\d+\] =\n    \{\n([\s\S]*?)\n    \};/)![1];
  const loadCount = load.match(/DB2FieldMeta Fields\[(\d+)\]/)![1];
  return ext
    .replace(/DB2MetaField MetaFields\[\d+\] =\n    \{\n[\s\S]*?\n    \};/, `DB2MetaField MetaFields[${metaCount}] =\n    {\n${metaBody}\n    };`)
    .replace(/MetaInstance\{ [^}]*, MetaFields, -?\d+ \}/, `MetaInstance{ ${inst[1]}, MetaFields, ${inst[2]} }`)
    .replace(/DB2FieldMeta Fields\[\d+\] =\n    \{\n[\s\S]*?\n    \};/, `DB2FieldMeta Fields[${loadCount}] =\n    {\n${loadBody}\n    };`)
    .replace(/DB2FileLoadInfo Instance\{ Fields, \d+, &MetaInstance \}/, `DB2FileLoadInfo Instance{ Fields, ${loadCount}, &MetaInstance }`);
}

export function parseLoadInfoBlock(text: string): { fields: LoadField[]; stmt: string } | null {
  const stmt = text.match(/Instance\{ Fields, \d+, &\w+Meta::Instance, (HOTFIX_SEL_\w+) \}/)?.[1];
  if (!stmt) return null;
  const fields = [...text.matchAll(/\{ (true|false), (FT_\w+), "(\w+)" \}/g)].map(m => ({ signed: m[1] === "true", ft: m[2], name: m[3] }));
  return { fields, stmt };
}

// Approximates TrinityCore's wrapping: column lists break once the line reaches WRAP_AT, the FROM/WHERE
// tail breaks when it would push the line past TAIL_AT (upstream is not fully consistent; formatting only).
export let WRAP_AT = 138, TAIL_AT = 150;
export function setWrap(n: number, tail = TAIL_AT) { WRAP_AT = n; TAIL_AT = tail; }
function wrapStmt(head: string, cols: string[], tailTokens: string[], end: string): string {
  let line = head, out = "";
  const brk = (t: string) => { out += line + "\"\n"; line = "        \"" + t; };
  for (const t of cols) line.length >= WRAP_AT ? brk(t) : (line += t);
  for (const t of tailTokens) line.length + t.length > TAIL_AT && line.length >= WRAP_AT - 40 ? brk(t) : (line += t);
  return out + line + end;
}

// MySQL 8 reserved words that occur as DB2 column/table names (upstream quotes the same set plus Text)
const RESERVED = new Set(["FLOAT4", "FLOAT8", "INT1", "INT2", "INT3", "INT4", "INT8", "FUNCTION", "LOCK", "ORDER", "RANK", "SYSTEM",
  "TEXT", "GROUPS", "ROWS", "KEY", "INDEX", "RANGE", "CONDITION", "READ", "WRITE", "SIGNAL", "RELEASE", "USAGE", "LEADING"]);
const q = (id: string) => (RESERVED.has(id.toUpperCase()) ? `\`${id}\`` : id);

export function emitHotfixStatements(table: string, fields: LoadField[], stmt: string): string {
  const rawTable = stmt.replace(/^HOTFIX_SEL_/, "").toLowerCase(), sqlTable = q(rawTable);
  const cols = fields.map((f, i) => q(f.name) + (i < fields.length - 1 ? ", " : ""));
  const main = wrapStmt(`    PrepareStatement(${stmt}, "SELECT `, cols, [` FROM ${sqlTable}`, " WHERE (`VerifiedBuild` > 0) = ?"], "\", CONNECTION_SYNCH);");
  const lines = [`    // ${table}.db2`, main, `    PREPARE_MAX_ID_STMT(${stmt}, "SELECT MAX(ID) + 1 FROM ${sqlTable}", CONNECTION_SYNCH);`];
  const loc = fields.filter(f => f.ft === "FT_STRING");
  if (loc.length) {
    const lcols = ["ID", ...loc.map(f => `${f.name}_lang`)].map((c, i, a) => c + (i < a.length - 1 ? ", " : ""));
    lines.push(wrapStmt(`    PREPARE_LOCALE_STMT(${stmt}, "SELECT `, lcols, [` FROM ${rawTable}_locale`, " WHERE (`VerifiedBuild` > 0) = ? AND locale = ?"], "\", CONNECTION_SYNCH);"));
  }
  return lines.join("\n");
}

const expand = (b: DbdBuild) => b.fields.flatMap(f => Array.from({ length: f.arrayLen }, (_, i) => ({ key: `${f.name}#${i + 1}`, f, k: i + 1 })));

// LoadInfo fields for a new build: names carried from TrinityCore (paired by position), signs follow the new Meta
// because DB2FileLoader validates LoadInfo signedness against it (ID and parent index are always unsigned).
const metaSigned = (f: DbdField) => !f.isRelation && isSigned(f);
const ftL = (f: DbdField) => (f.noninline && f.isRelation ? "FT_INT" : ft(f)); // loader reads a non-inline parent as int32
export function carryLoadFields(nb: DbdBuild, ob: DbdBuild | null, tc: LoadField[]): LoadField[] {
  const old = ob ? expand(ob) : [];
  const carry = new Map<string, LoadField>();
  if (old.length === tc.length) old.forEach((o, i) => carry.set(o.key, tc[i]));
  const nexp = expand(nb);
  const named = new Set(nexp.map(n => n.key).filter(k => carry.has(k)));
  const kind = (t: string) => (t.startsWith("FT_STRING") ? "s" : "n");
  const own = (f: DbdField, k: number) => tcName(f.name) + (f.arrayLen > 1 ? String(k) : "");
  let ptr = 0; // WoWDBDefs placeholders ("Field_x_x_x_x_nnn") borrow unmatched old names in order (see db2-struct-diff "≈")
  const oldLen = new Map((ob?.fields ?? []).map(f => [f.name, f.arrayLen]));
  const out = nexp.map(({ key, f, k }): LoadField => {
    const base = f.arrayLen > 1 && oldLen.get(f.name) === 1 ? carry.get(`${f.name}#1`) : undefined;
    if (base) return { signed: metaSigned(f), ft: ftL(f), name: base.name + k }; // scalar became an array
    const c = carry.get(key);
    if (c) return { signed: metaSigned(f), ft: ftL(f), name: c.name };
    if (/^Field_\d+_\d+_\d+_\d+_\d+(_lang)?$/.test(f.name) && old.length === tc.length) {
      while (ptr < old.length && (named.has(old[ptr].key) || kind(tc[ptr].ft) !== kind(ft(f)))) ptr++;
      if (ptr < old.length) { const b = tc[ptr++]; return { signed: metaSigned(f), ft: ftL(f), name: b.name, borrowed: true }; }
    }
    return { signed: metaSigned(f), ft: ftL(f), name: own(f, k) };
  });
  // A carried/borrowed name loses to a field whose own WoWDBDefs name is that name.
  const owners = new Set(nexp.map(({ f, k }, i) => (out[i].name === own(f, k) ? out[i].name : "")).filter(Boolean));
  nexp.forEach(({ f, k }, i) => {
    if (out[i].name !== own(f, k) && owners.has(out[i].name)) out[i] = { signed: metaSigned(f), ft: ftL(f), name: own(f, k) };
  });
  return out;
}

export function emitLoadInfoFields(table: string, fields: LoadField[], stmt: string, metaName = table): string {
  const lines = fields.map(f => `        { ${f.signed}, ${f.ft}, "${f.name}" },`);
  return `struct ${table}LoadInfo\n{\n    static constexpr DB2FieldMeta Fields[${lines.length}] =\n    {\n${lines.join("\n")}\n    };\n\n` +
    `    static constexpr DB2LoadInfo Instance{ Fields, ${lines.length}, &${metaName}Meta::Instance, ${stmt} };\n};`;
}

// LoadInfo blocks keyed by the Meta they reference (some differ in name, e.g. CfgCategoriesLoadInfo -> Cfg_CategoriesMeta).
export function indexLoadInfoByMeta(src: string): Map<string, { name: string; text: string }> {
  const out = new Map<string, { name: string; text: string }>();
  for (const m of src.matchAll(/struct (\w+)LoadInfo\n\{[\s\S]*?&(\w+)Meta::Instance[^\n]*\n\};/g)) out.set(m[2], { name: m[1], text: m[0] });
  return out;
}

const TEXT = "text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
const SQL_INT: Record<string, string> = { FT_BYTE: "tinyint", FT_SHORT: "smallint", FT_INT: "int", FT_LONG: "bigint" };
const LOCALES = ["deDE", "esES", "esMX", "frFR", "itIT", "koKR", "ptBR", "ruRU", "zhCN", "zhTW"];

function sqlType(f: LoadField): string {
  if (f.ft === "FT_STRING" || f.ft === "FT_STRING_NOT_LOCALIZED") return TEXT;
  if (f.ft === "FT_FLOAT") return "float NOT NULL DEFAULT '0'";
  return `${SQL_INT[f.ft]}${f.signed ? "" : " unsigned"} NOT NULL DEFAULT '0'`;
}

// Hotfix table DDL in TDB style (CREATE TABLE plus the partitioned _locale table when the table has localized strings).
export function emitHotfixSql(fields: LoadField[], stmt: string): string {
  const t = stmt.replace(/^HOTFIX_SEL_/, "").toLowerCase();
  const tail = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
  const main = [`CREATE TABLE \`${t}\` (`, ...fields.map(f => `  \`${f.name}\` ${sqlType(f)},`),
    "  `VerifiedBuild` int NOT NULL DEFAULT '0',", "  PRIMARY KEY (`ID`,`VerifiedBuild`)", tail + ";"].join("\n");
  const loc = fields.filter(f => f.ft === "FT_STRING");
  if (!loc.length) return main;
  const parts = LOCALES.map((l, i) => `${i ? " " : "("}PARTITION ${l} VALUES IN ('${l}') ENGINE = InnoDB${i === LOCALES.length - 1 ? ") */;" : ","}`);
  const locale = [`CREATE TABLE \`${t}_locale\` (`, "  `ID` int unsigned NOT NULL DEFAULT '0',",
    "  `locale` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,",
    ...loc.map(f => `  \`${f.name}_lang\` ${TEXT},`), "  `VerifiedBuild` int NOT NULL DEFAULT '0',",
    "  PRIMARY KEY (`ID`,`locale`,`VerifiedBuild`)", tail, "/*!50500 PARTITION BY LIST  COLUMNS(locale)", ...parts].join("\n");
  return main + "\n\n" + locale;
}

if (import.meta.main) {
  const { parseDbd, selectBuild } = await import("./dbd");
  const [mode, build, root] = Bun.argv.slice(2);
  const norm = (s: string) => s.replace(/\r\n/g, "\n");
  const ds = `${root}/src/server/game/DataStores`;
  const metaSrc = norm(await Bun.file(`${ds}/DB2Metadata.h`).text());
  const loadSrc = norm(await Bun.file(`${ds}/DB2LoadInfo.h`).text());
  const defs = `${import.meta.dir}/../refs/wowdbdefs/definitions`;
  if (mode === "--check") {
    let bad = 0, badLoad = 0, missing = 0, badParent = 0;
    const samples: string[] = [];
    for (const e of parseMetaFile(metaSrc)) {
      const f = Bun.file(`${defs}/${e.table}.dbd`);
      if (!(await f.exists())) { missing++; continue; }
      const p = parseDbd(norm(await f.text()));
      const b = selectBuild(p, build);
      if (!b) { missing++; continue; }
      if (parentIndexOf(b) !== e.parentIndex) { badParent++; samples.push(`--- parent ${e.table}: tc ${e.parentIndex} computed ${parentIndexOf(b)}`); }
      const m = emitMeta(e.table, e.fdid, b, e.parentIndex);
      if (m !== e.text) { bad++; if (samples.length < 2000) samples.push(`--- ${e.table}Meta\n${e.text}\n+++\n${m}`); }
      const cur = loadSrc.match(new RegExp(`struct ${e.table}LoadInfo\\n\\{[\\s\\S]*?\\n\\};`))?.[0];
      if (cur && cur !== emitLoadInfo(e.table, b, p.columns)) {
        badLoad++; if (samples.length < 2000) samples.push(`--- ${e.table}LoadInfo\n${cur}\n+++\n${emitLoadInfo(e.table, b, p.columns)}`);
      }
    }
    console.log(`meta mismatches: ${bad}, loadinfo mismatches: ${badLoad}, parent mismatches: ${badParent}, missing defs: ${missing}`);
    await Bun.write(`${import.meta.dir}/../out/db2-check-${build}.txt`, samples.join("\n\n"));
  }
  if (mode === "--extractor") {
    const ep = `${root}/src/tools/extractor_common/ExtractorDB2LoadInfo.h`;
    const raw = await Bun.file(ep).text();
    let ext = norm(raw);
    const blockOf = (src: string, name: string) => src.match(new RegExp(`struct ${name}\\n\\{[\\s\\S]*?\\n\\};`, "i"))?.[0];
    let updated = 0;
    for (const m of [...ext.matchAll(/struct (\w+)LoadInfo\n\{[\s\S]*?\n\};/g)]) {
      const sm = blockOf(metaSrc, `${m[1]}Meta`);
      if (!sm) { console.log(`skip ${m[1]}: no server Meta`); continue; }
      const hash = (s: string) => s.match(/0x([0-9A-F]{8}), (?:Meta)?Fields/)?.[1];
      if (hash(sm) === hash(m[0])) continue;
      let sl = blockOf(loadSrc, `${m[1]}LoadInfo`);
      if (!sl) { // not loaded by the server: carry the extractor's own field names onto the new layout
        const p = parseDbd(norm(await Bun.file(`${defs}/${m[1]}.dbd`).text()));
        const fields = carryLoadFields(selectBuild(p, build)!, selectBuild(p, "4.4.2.60895"), parseLoadInfoBlock(m[0].replace("DB2FileLoadInfo Instance{ Fields, ", "DB2LoadInfo Instance{ Fields, ").replace(/&MetaInstance \}/, `&${m[1]}Meta::Instance, HOTFIX_SEL_X }`))!.fields);
        sl = emitLoadInfoFields(m[1], fields, "HOTFIX_SEL_X");
      }
      ext = ext.replace(m[0], rebuildExtractorBlock(m[0], sm, sl));
      updated++;
    }
    await Bun.write(ep, raw.includes("\r\n") ? ext.replace(/\n/g, "\r\n") : ext);
    console.log(`extractor blocks updated: ${updated}`);
  }
  if (mode === "--apply") {
    const OLD = "4.4.2.60895"; // build the current upstream blocks describe
    const shortBuild = build.split(".").pop();
    const hp = `${root}/src/server/database/Database/Implementation/HotfixDatabase`;
    const crlf = (await Bun.file(`${ds}/DB2Metadata.h`).text()).includes("\r\n");
    const back = (s: string) => (crlf ? s.replace(/\n/g, "\r\n") : s);
    let meta = metaSrc, load = loadSrc;
    let hcpp = norm(await Bun.file(`${hp}.cpp`).text()), hh = norm(await Bun.file(`${hp}.h`).text());
    const sql: string[] = [`-- Hotfix tables whose DB2 layout changed for client build ${build} (generated by tools/mop-re/src/gen_db2.ts).`,
      "-- Rows are dropped on purpose: TDB hotfix rows target 4.4.2 and the client's DB2 files are authoritative.", ""];
    const diff: string[] = [`# DB2 structure diff ${OLD} -> ${build}`, "", "Loaded tables whose layout changed. Update `DB2Structure.h` to match the new LoadInfo order.", ""];
    let changed = 0, unchanged = 0, absent = 0, rehashed = 0;
    const loadByMeta = indexLoadInfoByMeta(loadSrc);
    const { pickLayoutHash } = await import("./check_layout_hashes");
    const dumpPath = Bun.argv[5];
    const dump = dumpPath ? new Uint8Array(await Bun.file(dumpPath).arrayBuffer()) : null;
    for (const e of parseMetaFile(metaSrc)) {
      const f = Bun.file(`${defs}/${e.table}.dbd`);
      const p = (await f.exists()) ? parseDbd(norm(await f.text())) : null;
      const nb = p && selectBuild(p, build);
      if (!nb) { absent++; continue; }
      const pick = pickLayoutHash(nb.layoutHashes, dump);
      nb.layoutHashes = [pick, ...nb.layoutHashes.filter(h => h !== pick)];
      const curHash = e.text.match(/0x([0-9A-F]{8}), Fields/)![1];
      if (nb.layoutHashes.includes(curHash)) {
        unchanged++;
        if (curHash !== pick) { meta = meta.replace(e.text, e.text.replace(`0x${curHash}, Fields`, `0x${pick}, Fields`)); rehashed++; }
        continue;
      }
      changed++;
      meta = meta.replace(e.text, emitMeta(e.table, e.fdid, nb, parentIndexOf(nb)));
      const ent = loadByMeta.get(e.table);
      if (!ent) continue; // not loaded by the server
      const curLoad = ent.text, loadName = ent.name;
      const li = parseLoadInfoBlock(curLoad)!;
      const fields = carryLoadFields(nb, selectBuild(p!, OLD), li.fields);
      load = load.replace(curLoad, emitLoadInfoFields(loadName, fields, li.stmt, e.table));
      const curStmt = hcpp.match(new RegExp(`    // ${loadName}\\.db2\\n[\\s\\S]*?\\n(?=\\n)`))?.[0];
      if (curStmt) hcpp = hcpp.replace(curStmt, emitHotfixStatements(loadName, fields, li.stmt) + "\n");
      const hadLoc = li.fields.some(x => x.ft === "FT_STRING"), hasLoc = fields.some(x => x.ft === "FT_STRING");
      if (hadLoc && !hasLoc) hh = hh.replace(`    ${li.stmt}_LOCALE,\n`, "");
      if (!hadLoc && hasLoc) hh = hh.replace(`    ${li.stmt}_MAX_ID,\n`, `    ${li.stmt}_MAX_ID,\n    ${li.stmt}_LOCALE,\n`);
      const t = li.stmt.replace(/^HOTFIX_SEL_/, "").toLowerCase();
      sql.push(`DROP TABLE IF EXISTS \`${t}\`;`, `DROP TABLE IF EXISTS \`${t}_locale\`;`, emitHotfixSql(fields, li.stmt), "");
      const o = new Map(li.fields.map(x => [x.name, x]));
      const n = new Set(fields.map(x => x.name));
      diff.push(`## ${e.table}`, ...fields.map(x => !o.has(x.name) ? `+ ${x.name} ${x.ft}` : x.borrowed ? `≈ ${x.name} ${x.ft} (WoWDBDefs placeholder, name borrowed by position)` : o.get(x.name)!.ft !== x.ft ? `~ ${x.name} ${o.get(x.name)!.ft} -> ${x.ft}` : `  ${x.name} ${x.ft}`),
        ...li.fields.filter(x => !n.has(x.name)).map(x => `- ${x.name} ${x.ft}`), "");
    }
    await Bun.write(`${ds}/DB2Metadata.h`, back(meta));
    await Bun.write(`${ds}/DB2LoadInfo.h`, back(load));
    await Bun.write(`${hp}.cpp`, back(hcpp));
    await Bun.write(`${hp}.h`, back(hh));
    if (changed) { // a re-run on an already converted tree must not clobber the reports
      await Bun.write(`${import.meta.dir}/../out/${shortBuild}/hotfixes-changed.sql`, sql.join("\n"));
      await Bun.write(`${import.meta.dir}/../out/${shortBuild}/db2-struct-diff.md`, diff.join("\n"));
    }
    console.log(`changed: ${changed}, unchanged: ${unchanged} (rehashed from dump: ${rehashed}), absent: ${absent}`);
  }
}
