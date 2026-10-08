// Rewrites a DB2Structure.h entry struct so its data members follow a new LoadInfo field list.
import type { LoadField } from "./gen_db2";

const CPP: Record<string, [string, string]> = {
  FT_BYTE: ["int8", "uint8"], FT_SHORT: ["int16", "uint16"], FT_INT: ["int32", "uint32"], FT_LONG: ["int64", "uint64"],
};
export function cppType(f: LoadField): string {
  if (f.ft === "FT_STRING") return "LocalizedString";
  if (f.ft === "FT_STRING_NOT_LOCALIZED") return "char const*";
  if (f.ft === "FT_FLOAT") return "float";
  return CPP[f.ft][f.signed ? 0 : 1];
}

interface Member { line: string; type: string; name: string; fields: LoadField[] }
const MEMBER = /^    (.+?) (\w+);(\s*\/\/.*)?$/;
const belongs = (m: string, f: string) => f === m || new RegExp(`^${m}(\\d+|[XYZW])$`).test(f);

export function rewriteStruct(text: string, oldFields: LoadField[], newFields: LoadField[]) {
  const lines = text.split("\n");
  const open = lines.indexOf("{");
  let end = open + 1;
  const members: Member[] = [];
  for (; end < lines.length; end++) {
    const m = lines[end].match(MEMBER);
    if (!m || m[1].startsWith("return")) break;
    members.push({ line: lines[end], type: m[1], name: m[2], fields: [] });
  }
  let fi = 0;
  const memberNames = new Set(members.map(m => m.name));
  for (const m of members) {
    while (fi < oldFields.length && belongs(m.name, oldFields[fi].name)
      && (oldFields[fi].name === m.name || !memberNames.has(oldFields[fi].name))) m.fields.push(oldFields[fi++]);
    if (!m.fields.length) throw new Error(`cannot map old fields onto member ${m.name} (next field ${oldFields[fi]?.name})`);
  }
  if (fi !== oldFields.length) throw new Error(`cannot map old field ${oldFields[fi].name} onto any member`);
  const owner = new Map<string, Member>();
  for (const m of members) for (const f of m.fields) owner.set(f.name, m);

  const out: string[] = [], added: string[] = [], emitted = new Set<Member>();
  for (let i = 0; i < newFields.length;) {
    const f = newFields[i], m = owner.get(f.name);
    if (m && !emitted.has(m)) {
      let n = 0;
      while (i + n < newFields.length && owner.get(newFields[i + n].name) === m) n++;
      emitted.add(m);
      const arr = m.type.match(/^std::array<(\w+), (\w+)>$/);
      if (arr) {
        const t = m.fields[0].ft === f.ft ? arr[1] : cppType(f);
        out.push(n === m.fields.length ? m.line.replace(`<${arr[1]},`, `<${t},`)
          : `    std::array<${t}, ${n}> ${m.name}; // TODO(verify): 5.5 size, was ${arr[2]}`);
      } else if (n === m.fields.length && (m.fields.length > 1 || m.fields[0].ft === f.ft)) out.push(m.line);
      else out.push(`    ${cppType(f)} ${m.name};`);
      i += n;
      continue;
    }
    const base = f.name.match(/^(\w*?[A-Za-z_])(\d+)$/);
    let n = 1;
    if (base && base[2] === "1")
      while (i + n < newFields.length && newFields[i + n].name === `${base[1]}${n + 1}` && newFields[i + n].ft === f.ft) n++;
    const name = n > 1 ? base![1] : f.name;
    out.push(n > 1 ? `    std::array<${cppType(f)}, ${n}> ${name};` : `    ${cppType(f)} ${name};`);
    added.push(name);
    i += n;
  }
  const removed = members.filter(m => !emitted.has(m)).map(m => m.name);
  return { text: [...lines.slice(0, open + 1), ...out, ...lines.slice(end)].join("\n"), added, removed };
}

// usage: bun src/gen_struct.ts <repo root>  (old LoadInfo from git HEAD, new from the working tree)
if (import.meta.main) {
  const { parseLoadInfoBlock } = await import("./gen_db2");
  const root = Bun.argv[2];
  const norm = (s: string) => s.replace(/\r\n/g, "\n");
  const ds = `${root}/src/server/game/DataStores`;
  const oldLoad = norm(Bun.spawnSync(["git", "-C", root, "show", "HEAD:src/server/game/DataStores/DB2LoadInfo.h"]).stdout.toString());
  const newLoad = norm(await Bun.file(`${ds}/DB2LoadInfo.h`).text());
  const stores = norm(await Bun.file(`${ds}/DB2Stores.cpp`).text());
  const crlf = (await Bun.file(`${ds}/DB2Structure.h`).text()).includes("\r\n");
  let structs = norm(await Bun.file(`${ds}/DB2Structure.h`).text());
  const entryOf = new Map([...stores.matchAll(/DB2Storage<(\w+)>\s+s\w+\("\w+\.db2", &(\w+)LoadInfo::Instance\)/g)].map(m => [m[2], m[1]]));
  const report: string[] = [];
  let done = 0;
  for (const m of newLoad.matchAll(/struct (\w+)LoadInfo\n\{[\s\S]*?\n\};/g)) {
    const oldBlock = oldLoad.match(new RegExp(`struct ${m[1]}LoadInfo\\n\\{[\\s\\S]*?\\n\\};`))?.[0];
    if (!oldBlock || oldBlock === m[0]) continue;
    const entry = entryOf.get(m[1]);
    const cur = entry && structs.match(new RegExp(`struct ${entry}\\n\\{[\\s\\S]*?\\n\\};`))?.[0];
    if (!cur) { report.push(`- ${m[1]}: no ${entry ?? "entry"} struct found`); continue; }
    try {
      const r = rewriteStruct(cur, parseLoadInfoBlock(oldBlock)!.fields, parseLoadInfoBlock(m[0])!.fields);
      structs = structs.replace(cur, r.text);
      done++;
      if (r.added.length || r.removed.length) report.push(`- ${entry}: +[${r.added.join(", ")}] -[${r.removed.join(", ")}]`);
    } catch (e) { report.push(`- ${entry}: MANUAL (${(e as Error).message})`); }
  }
  await Bun.write(`${ds}/DB2Structure.h`, crlf ? structs.replace(/\n/g, "\r\n") : structs);
  await Bun.write(`${import.meta.dir}/../out/struct-report.md`, report.join("\n"));
  console.log(`structs rewritten: ${done}; manual: ${report.filter(r => r.includes("MANUAL") || r.includes("no ")).length}`);
}
