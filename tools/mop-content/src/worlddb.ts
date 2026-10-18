// Shared helpers for the world-DB content generators: MySQL access through the dev container and SQL emission
// with the live `world` column list (only columns world has are written; missing ones get their DEFAULT).
import { readDb2 } from "./db2.ts";

export type Row = Record<string, string | null>;

export const root = (p: string) => new URL(`../../../${p}`, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
export const list = (xs: Iterable<number | string>) => { const a = [...new Set(xs)]; return a.length ? a.join(",") : "NULL"; };
export const n = (v: string | null | undefined) => Number(v ?? 0);

export function mysql(container: string) {
  return (sql: string): Row[] => {
    const r = Bun.spawnSync(["docker", "exec", "-i", container, "mysql", "-uroot", "-proot", "-B", "--default-character-set=utf8mb4"],
      { stdin: Buffer.from(sql) });
    if (r.exitCode !== 0) throw new Error(`${sql.slice(0, 400)}\n${r.stderr.toString()}`);
    const lines = r.stdout.toString().split("\n").filter(l => l.length);
    if (!lines.length) return [];
    const head = lines[0].split("\t");
    // mysql -B escapes tab, newline and backslash in values; undo it so the emitter can re-escape.
    const unesc = (s: string) => s.replace(/\\(.)/g, (_, c) => (c === "n" ? "\n" : c === "t" ? "\t" : c === "0" ? "\0" : c));
    return lines.slice(1).map(l => {
      const v = l.split("\t"), o: Row = {};
      head.forEach((h, i) => { o[h] = v[i] === "NULL" ? null : unesc(v[i]); });
      return o;
    });
  };
}

export function db2Sets(db2Dir: string) {
  const DBD = root("tools/mop-re/refs/wowdbdefs/definitions/");
  const rows = (name: string) => readDb2(`${db2Dir}/${name}.db2`, `${DBD}${name}.dbd`).rows;
  const ids = (name: string) => new Set(rows(name).map(r => r.ID as number));
  return { rows, ids };
}

type Col = { name: string; numeric: boolean };
export class SqlOut {
  private cols = new Map<string, Col[]>();
  readonly lines: string[] = [];
  readonly summary: string[] = [];
  constructor(q: (s: string) => Row[]) {
    for (const r of q(`SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE TABLE_SCHEMA='world' ORDER BY TABLE_NAME, ORDINAL_POSITION`)) {
      const t = r.TABLE_NAME!, l = this.cols.get(t) ?? this.cols.set(t, []).get(t)!;
      l.push({ name: r.COLUMN_NAME!, numeric: /int|float|double|decimal/.test(r.DATA_TYPE!) });
    }
  }
  has(table: string, col: string) { return !!this.cols.get(table)?.some(c => c.name === col); }
  emit(table: string, rows: Row[], del: string, note: string) {
    const cols = this.cols.get(table);
    if (!cols) throw new Error(`world has no table ${table}`);
    this.summary.push(`${table}: ${rows.length}`);
    this.lines.push(`-- ${table}: ${note} (${rows.length} rows)`);
    this.lines.push(`DELETE FROM \`${table}\` WHERE ${del};`);
    if (!rows.length) { this.lines.push(""); return; }
    const use = cols.filter(c => rows.some(r => c.name in r));
    const lit = (c: Col, v: string | null | undefined) =>
      v === undefined ? "DEFAULT" : v === null ? "NULL"
        : c.numeric ? (/^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(v) ? v : String(Number(v)))
        : `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
    for (let i = 0; i < rows.length; i += 500) {
      this.lines.push(`INSERT INTO \`${table}\` (${use.map(c => `\`${c.name}\``).join(",")}) VALUES`);
      this.lines.push(rows.slice(i, i + 500).map(r => `(${use.map(c => lit(c, r[c.name])).join(",")})`).join(",\n") + ";");
    }
    this.lines.push("");
  }
}

// Keys a previous run of a generator wrote: `DELETE FROM `t` WHERE col IN (...)` lines of its own output files.
// Subtracting them from `world` gives the world the generator started from, so re-runs after an apply stay identical.
export function ownKeys(files: string[], read: (f: string) => string | undefined) {
  const own = new Map<string, Set<number>>();
  for (const f of files) {
    const text = read(f);
    if (!text) continue;
    for (const m of text.matchAll(/^DELETE FROM `(\w+)` WHERE `?(\w+)`? IN \(([-\d,]+)\);$/gm)) {
      const s = own.get(`${m[1]}.${m[2]}`) ?? own.set(`${m[1]}.${m[2]}`, new Set()).get(`${m[1]}.${m[2]}`)!;
      for (const x of m[3].split(",")) s.add(Number(x));
    }
  }
  return own;
}
