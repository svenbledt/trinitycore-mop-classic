import { type Direction, group, index } from "./types";
import type { MatchResult } from "./match";

const hex6 = (v: number) => "0x" + v.toString(16).toUpperCase().padStart(6, "0");
const pad = (s: string, col: number) => s + " ".repeat(Math.max(1, col - s.length));
const ENUM: Record<Direction, string> = { CMSG: "OpcodeClient", SMSG: "OpcodeServer" };
const BANNER = "// Values generated for client build ";

function checkUnique(r: MatchResult) {
  const seen = new Map<string, string>();
  for (const m of r.matched) {
    const k = `${m.dir}:${m.value}`;
    if (seen.has(k)) throw new Error(`duplicate value ${hex6(m.value)}: ${seen.get(k)} and ${m.name}`);
    seen.set(k, m.name);
  }
}

function enumBody(existing: string, r: MatchResult, dir: Direction): string {
  const byName = new Map(r.matched.filter(m => m.dir === dir).map(m => [m.name, m]));
  const names = new Set([...existing.matchAll(/^    ((?:CMSG|SMSG)_\w+)\s*=/gm)].map(m => m[1]));
  for (const n of byName.keys()) names.add(n);
  return [...names].sort().map(n => {
    const m = byName.get(n);
    if (!m) return pad(`    ${n}`, 55) + "= UNKNOWN_OPCODE,";
    return pad(`    ${n}`, 55) + `= ${hex6(m.value)},` + (m.confidence === "low" ? " // TODO(verify): low-confidence match" : "");
  }).join("\n");
}

function indexBlock(r: MatchResult, dir: Direction): { num: number; cases: string } {
  const sizes = new Map<number, number>();
  const values = [...r.matched.filter(m => m.dir === dir), ...r.unmatchedClient.filter(c => c.dir === dir)].map(x => x.value);
  for (const v of values) sizes.set(group(v), Math.max(sizes.get(group(v)) ?? 0, index(v) + 1));
  let off = 0;
  const cases: string[] = [];
  for (const g of [...sizes.keys()].sort((a, b) => a - b)) {
    const n = sizes.get(g)!;
    cases.push(`        case 0x${g.toString(16).toUpperCase().padStart(2, "0")}: return idInGroup < ${n} ? idInGroup + ${off} : -1;`);
    off += n;
  }
  return { num: off, cases: cases.join("\n") };
}

export function rewriteOpcodesH(src: string, r: MatchResult, build: string): string {
  checkUnique(r);
  let out = src.replace(new RegExp(`${BANNER}.*\\n`), "");
  for (const dir of ["CMSG", "SMSG"] as Direction[]) {
    const e = ENUM[dir];
    out = out.replace(new RegExp(`(enum ${e} : uint32\\n\\{\\n)([\\s\\S]*?)(\\n\\};)`), (_m, a, body, c) => a + enumBody(body, r, dir) + c);
    const { num, cases } = indexBlock(r, dir);
    out = out.replace(new RegExp(`NUM_${dir}_OPCODES = \\d+;`), `NUM_${dir}_OPCODES = ${num};`);
    out = out.replace(new RegExp(`(GetOpcodeArrayIndex\\(${e} opcode\\)[\\s\\S]*?switch \\(opcode >> 16\\)\\n    \\{\\n)[\\s\\S]*?(\\n        default: return -1;)`), `$1${cases}$2`);
  }
  return out.replace("enum OpcodeClient : uint32", `${BANNER}${build} by tools/mop-re; see docs/mop-port/re-notes.md\nenum OpcodeClient : uint32`);
}

export function rewriteOpcodesCpp(src: string, r: MatchResult): string {
  const lines = src.split("\n");
  const nameOf = (l: string) => l.match(/^\s+DEFINE_(?:SERVER_OPCODE_)?HANDLER\(((?:CMSG|SMSG)_\w+),/)?.[1];
  const present = new Set(lines.map(nameOf).filter(Boolean) as string[]);
  for (const m of [...r.matched].sort((a, b) => a.name.localeCompare(b.name))) {
    if (present.has(m.name)) continue;
    const macro = m.dir === "CMSG" ? "DEFINE_HANDLER(" : "DEFINE_SERVER_OPCODE_HANDLER(";
    const line = m.dir === "CMSG"
      ? pad(`    DEFINE_HANDLER(${m.name},`, 76) + "STATUS_UNHANDLED, PROCESS_INPLACE,      &WorldSession::Handle_NULL);"
      : pad(`    DEFINE_SERVER_OPCODE_HANDLER(${m.name},`, 79) + "STATUS_UNHANDLED,    CONNECTION_TYPE_DEFAULT);";
    const same = lines.map((l, i) => (l.includes(macro) && nameOf(l) ? i : -1)).filter(i => i >= 0);
    const at = same.find(i => (nameOf(lines[i]) ?? "") > m.name);
    lines.splice(at ?? same[same.length - 1] + 1, 0, line);
    present.add(m.name);
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const [build, root, matchFile] = Bun.argv.slice(2);
  const r = await Bun.file(matchFile ?? `${import.meta.dir}/../out/${build}/match.json`).json();
  const hp = `${root}/src/server/game/Server/Protocol/Opcodes.h`, cp = `${root}/src/server/game/Server/Protocol/Opcodes.cpp`;
  const crlf = (await Bun.file(hp).text()).includes("\r\n");
  const norm = (s: string) => s.replace(/\r\n/g, "\n"), back = (s: string) => (crlf ? s.replace(/\n/g, "\r\n") : s);
  await Bun.write(hp, back(rewriteOpcodesH(norm(await Bun.file(hp).text()), r, build)));
  await Bun.write(cp, back(rewriteOpcodesCpp(norm(await Bun.file(cp).text()), r)));
}
