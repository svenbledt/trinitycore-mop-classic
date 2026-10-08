import { expect, test } from "bun:test";
import { parseDbd, selectBuild } from "../src/dbd";
import { emitMeta, emitLoadInfo, parentIndexOf, parseLoadInfoBlock, emitHotfixStatements, emitHotfixSql, carryLoadFields } from "../src/gen_db2";

const crlf = (s: string) => s.replace(/\r\n/g, "\n");
const metaH = crlf(await Bun.file(import.meta.dir + "/fixtures/golden-60895.h").text()); // snapshot of upstream 4.4.2.60895 blocks
const loadH = metaH;
const block = (src: string, name: string) => src.match(new RegExp(`struct ${name}\\n\\{[\\s\\S]*?\\n\\};`))![0];
const chr = async () => parseDbd(crlf(await Bun.file(import.meta.dir + "/fixtures/ChrClasses.dbd").text()));

test("ChrClasses meta for 4.4.2.60895 equals current DB2Metadata.h", async () => {
  const b = selectBuild(await chr(), "4.4.2.60895")!;
  expect(emitMeta("ChrClasses", 1361031, b, -1)).toBe(block(metaH, "ChrClassesMeta"));
});

test("ChrClasses load info for 4.4.2.60895 equals current DB2LoadInfo.h", async () => {
  const p = await chr();
  expect(emitLoadInfo("ChrClasses", selectBuild(p, "4.4.2.60895")!, p.columns)).toBe(block(loadH, "ChrClassesLoadInfo"));
});

test("unknown build yields null", async () => {
  expect(selectBuild(await chr(), "0.0.1.1")).toBeNull();
});

test("non-inline relation: listed in meta, not stored; parent index points at it", async () => {
  const p = parseDbd(crlf(await Bun.file(import.meta.dir + "/fixtures/ActionBarGroupEntry.dbd").text()));
  const b = selectBuild(p, "4.4.2.60895")!;
  expect(parentIndexOf(b)).toBe(4);
  expect(emitMeta("ActionBarGroupEntry", 4572797, b, parentIndexOf(b))).toBe(block(metaH, "ActionBarGroupEntryMeta"));
});

const hotfix = crlf(await Bun.file(import.meta.dir + "/fixtures/golden-hotfix-60895.cpp").text());
const hblock = (t: string) => hotfix.match(new RegExp(`    // ${t}\\.db2\\n[\\s\\S]*?\\n(?=\\n|$)`))![0];

// SQL text per statement with C++ string-literal wrapping removed (upstream wrapping is not fully consistent)
const sqlOf = (code: string) => code.split("\n").filter(l => !l.trim().startsWith("//")).join("\n")
  .replace(/"\s*\n\s*"/g, "").match(/\w+\(HOTFIX_SEL_\w+, "[^"]*"/g);

for (const t of ["Achievement", "AreaTrigger", "ChrClasses"])
  test(`${t} hotfix statements produce the upstream SQL`, () => {
    const li = parseLoadInfoBlock(block(metaH, `${t}LoadInfo`))!;
    expect(sqlOf(emitHotfixStatements(t, li.fields, li.stmt))).toEqual(sqlOf(hblock(t)));
  });

test("ChrClasses hotfix DDL equals TDB 442.26081 (table and locale table)", async () => {
  const ddl = crlf(await Bun.file(import.meta.dir + "/fixtures/golden-hotfix-ddl-60895.sql").text());
  const li = parseLoadInfoBlock(block(metaH, "ChrClassesLoadInfo"))!;
  expect(emitHotfixSql(li.fields, li.stmt)).toBe(ddl.trim());
});

test("carry-over keeps TrinityCore names/signs for fields that existed, generic rules for new ones", () => {
  const p = parseDbd([
    "COLUMNS", "int ID", "int Alpha_value", "int Beta", "int Gamma", "float Pos", "",
    "LAYOUT 00000001", "BUILD 4.4.2.60895", "$id$ID<32>", "Alpha_value<32>", "Beta<u16>", "Pos[2]", "",
    "LAYOUT 00000002", "BUILD 5.5.4.70032", "$id$ID<32>", "Alpha_value<32>", "Gamma<8>", "Beta<u32>", "Pos[2]", "",
  ].join("\n"));
  const tc = [
    { signed: false, ft: "FT_INT", name: "ID" }, { signed: false, ft: "FT_INT", name: "AlphaRenamed" },
    { signed: false, ft: "FT_SHORT", name: "Beta" }, { signed: false, ft: "FT_FLOAT", name: "PosX" }, { signed: false, ft: "FT_FLOAT", name: "PosY" },
  ];
  const f = carryLoadFields(selectBuild(p, "5.5.4.70032")!, selectBuild(p, "4.4.2.60895")!, tc);
  expect(f).toEqual([
    { signed: false, ft: "FT_INT", name: "ID" },
    { signed: false, ft: "FT_INT", name: "AlphaRenamed" },
    { signed: true, ft: "FT_BYTE", name: "Gamma" },
    { signed: false, ft: "FT_INT", name: "Beta" },
    { signed: false, ft: "FT_FLOAT", name: "PosX" },
    { signed: false, ft: "FT_FLOAT", name: "PosY" },
  ]);
});

test("placeholder field names borrow the next unmatched old name of the same kind, in order", () => {
  const p = parseDbd([
    "COLUMNS", "locstring Text_lang", "int ID", "int Flags", "int Field_1_15_8_63829_000", "locstring Field_1_15_8_63829_001_lang", "int Field_1_15_8_63829_002", "",
    "LAYOUT 00000001", "BUILD 4.4.2.60895", "Text_lang", "$id$ID<32>", "Flags<u16>", "",
    "LAYOUT 00000002", "BUILD 5.5.4.70032", "Field_1_15_8_63829_001_lang", "$id$ID<32>", "Field_1_15_8_63829_000<u32>", "Field_1_15_8_63829_002<32>", "",
  ].join("\n"));
  const tc = [{ signed: false, ft: "FT_STRING", name: "Text" }, { signed: false, ft: "FT_INT", name: "ID" }, { signed: false, ft: "FT_SHORT", name: "Flags" }];
  expect(carryLoadFields(selectBuild(p, "5.5.4.70032")!, selectBuild(p, "4.4.2.60895")!, tc).map(f => f.name))
    .toEqual(["Text", "ID", "Flags", "Field115863829002"]);
});

test("a carried name that collides with a real field name in the new build falls back to its own name", () => {
  const p = parseDbd([
    "COLUMNS", "int ID", "int EffectiveLevel", "int WeaponDPS1H", "",
    "LAYOUT 00000001", "BUILD 4.4.2.60895", "$id$ID<32>", "EffectiveLevel<32>", "",
    "LAYOUT 00000002", "BUILD 5.5.4.70032", "$id$ID<32>", "EffectiveLevel<32>", "WeaponDPS1H<32>", "",
  ].join("\n"));
  const tc = [{ signed: false, ft: "FT_INT", name: "ID" }, { signed: true, ft: "FT_INT", name: "WeaponDPS1H" }];
  expect(carryLoadFields(selectBuild(p, "5.5.4.70032")!, selectBuild(p, "4.4.2.60895")!, tc).map(f => f.name))
    .toEqual(["ID", "EffectiveLevel", "WeaponDPS1H"]);
});

test("a scalar that became an array gets array element names", () => {
  const p = parseDbd([
    "COLUMNS", "int ID", "int Racemask", "",
    "LAYOUT 00000001", "BUILD 4.4.2.60895", "Racemask<64>", "$id$ID<32>", "",
    "LAYOUT 00000002", "BUILD 5.5.4.70032", "$id$ID<32>", "Racemask<32>[2]", "",
  ].join("\n"));
  const tc = [{ signed: true, ft: "FT_LONG", name: "RaceMask" }, { signed: false, ft: "FT_INT", name: "ID" }];
  expect(carryLoadFields(selectBuild(p, "5.5.4.70032")!, selectBuild(p, "4.4.2.60895")!, tc).map(f => f.name))
    .toEqual(["ID", "RaceMask1", "RaceMask2"]);
});

test("Achievement hotfix statements are byte-identical to upstream", () => {
  const li = parseLoadInfoBlock(block(metaH, "AchievementLoadInfo"))!;
  expect(emitHotfixStatements("Achievement", li.fields, li.stmt) + "\n").toBe(hblock("Achievement"));
});
