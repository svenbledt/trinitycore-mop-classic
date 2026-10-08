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
}
