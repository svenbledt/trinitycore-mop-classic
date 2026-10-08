import { expect, test } from "bun:test";
import { parseDbd, selectBuild } from "../src/dbd";
import { emitMeta, emitLoadInfo, parentIndexOf } from "../src/gen_db2";

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
