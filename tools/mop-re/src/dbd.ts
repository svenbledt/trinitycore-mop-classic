// WoWDBDefs .dbd parser (format: https://github.com/wowdev/WoWDBDefs/blob/master/README.md).
export interface DbdColumn { type: "int" | "float" | "string" | "locstring"; foreign?: string; name: string; verified: boolean }
export interface DbdField {
  name: string; size?: 8 | 16 | 32 | 64; unsigned: boolean; arrayLen: number;
  isId: boolean; isRelation: boolean; noninline: boolean; type: DbdColumn["type"];
}
export interface DbdBuild { layoutHashes: string[]; fields: DbdField[] }
export interface Dbd { columns: Map<string, DbdColumn>; builds: { specs: string[]; block: DbdBuild }[] }

const ver = (b: string) => b.split(".").map(Number);
const cmp = (a: number[], b: number[]) => { for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
const specMatches = (spec: string, build: string) => {
  if (spec.includes("-")) { const [lo, hi] = spec.split("-"); return cmp(ver(build), ver(lo)) >= 0 && cmp(ver(build), ver(hi)) <= 0; }
  return spec === build;
};

export function parseDbd(src: string): Dbd {
  const lines = src.split(/\r?\n/);
  const columns = new Map<string, DbdColumn>();
  let i = 0;
  if (lines[0].trim() === "COLUMNS") {
    for (i = 1; i < lines.length && lines[i].trim() !== ""; i++) {
      const m = lines[i].trim().match(/^(\w+)(?:<([\w:]+)>)?\s+(\w+?)(\?)?(?:\s*\/\/.*)?$/);
      if (m) columns.set(m[3], { type: m[1] as DbdColumn["type"], foreign: m[2], name: m[3], verified: !m[4] });
    }
  }
  const builds: Dbd["builds"] = [];
  let cur: Dbd["builds"][number] | null = null;
  for (; i <= lines.length; i++) {
    const l = (lines[i] ?? "").trim();
    if (l === "") { if (cur && cur.block.fields.length) builds.push(cur); cur = null; continue; }
    cur ??= { specs: [], block: { layoutHashes: [], fields: [] } };
    if (l.startsWith("LAYOUT ")) cur.block.layoutHashes.push(...l.slice(7).split(",").map(s => s.trim().toUpperCase()));
    else if (l.startsWith("BUILD ")) cur.specs.push(...l.slice(6).split(",").map(s => s.trim()));
    else if (l.startsWith("COMMENT")) continue;
    else {
      const m = l.match(/^(?:\$([\w,]+)\$)?(\w+)(?:<(u?)(\d+)>)?(?:\[(\d+)\])?/);
      if (!m) continue;
      const anns = (m[1] ?? "").split(",");
      cur.block.fields.push({
        name: m[2], size: m[4] ? (Number(m[4]) as 8 | 16 | 32 | 64) : undefined, unsigned: m[3] === "u",
        arrayLen: m[5] ? Number(m[5]) : 1, isId: anns.includes("id"), isRelation: anns.includes("relation"),
        noninline: anns.includes("noninline"), type: columns.get(m[2])?.type ?? "int",
      });
    }
  }
  return { columns, builds };
}

export function selectBuild(p: Dbd, build: string): DbdBuild | null {
  return p.builds.find(b => b.specs.some(s => specMatches(s, build)))?.block ?? null;
}
