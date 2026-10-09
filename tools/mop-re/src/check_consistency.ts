// Mirrors the LoadDB2 assert in DB2Stores.cpp: Meta field types (arrays expanded, relation as FT_INT) must equal LoadInfo types.
import { indexLoadInfoByMeta, parseLoadInfoBlock } from "./gen_db2";

const FT: Record<string, string> = { FT_STRING: "s", FT_STRING_NOT_LOCALIZED: "S", FT_FLOAT: "f", FT_INT: "i", FT_BYTE: "b", FT_SHORT: "h", FT_LONG: "l" };

export function consistencyErrors(metaSrc: string, loadSrc: string): string[] {
  const errors: string[] = [];
  const byMeta = indexLoadInfoByMeta(loadSrc);
  for (const m of metaSrc.matchAll(/struct (\w+)Meta\n\{([\s\S]*?)Instance\{ \d+, (-?\d+), \d+, (\d+), 0x[0-9A-F]+, Fields, (-?\d+) \};\n\};/g)) {
    const li = byMeta.get(m[1]);
    if (!li) continue;
    const fields = [...m[2].matchAll(/\{ (FT_\w+), (\d+), (?:true|false) \}/g)].map(x => ({ t: x[1], n: +x[2] }));
    const fileFieldCount = +m[4], parent = +m[5];
    let client = "";
    fields.forEach((f, i) => { for (let j = 0; j < f.n; j++) client += FT[i >= fileFieldCount && i === parent ? "FT_INT" : f.t]; });
    const lf = parseLoadInfoBlock(li.text)!.fields;
    const ours = lf.slice(+m[3] === -1 ? 1 : 0).map(f => FT[f.ft]).join("");
    if (client !== ours) errors.push(`${m[1]}: meta ${client} != loadinfo ${ours}`);
  }
  return errors;
}

if (import.meta.main) {
  const root = Bun.argv[2];
  const rd = async (p: string) => (await Bun.file(`${root}/src/server/game/DataStores/${p}`).text()).replace(/\r\n/g, "\n");
  const errs = consistencyErrors(await rd("DB2Metadata.h"), await rd("DB2LoadInfo.h"));
  console.log(`meta/loadinfo mismatches: ${errs.length}`);
  for (const e of errs) console.log("  " + e);
}
