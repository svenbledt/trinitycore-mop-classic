import { expect, test } from "bun:test";
import { matchOpcodes, renderReport } from "../src/match";

const W = (name: string, value: number) => ({ name, value, dir: name.slice(0, 4) as "CMSG" | "SMSG" });
const C = (dir: "CMSG" | "SMSG", value: number) => ({ dir, value, rva: "0x0" });
const val = (r: ReturnType<typeof matchOpcodes>, n: string) => r.matched.find(m => m.name === n);

test("group map renumbers groups; identical index sets match high", () => {
  const r = matchOpcodes(
    [W("CMSG_A", 0x380000), W("CMSG_B", 0x380014)],
    [C("CMSG", 0x440000), C("CMSG", 0x440014)],
    { groupMap: { CMSG: { "0x38": "0x44" } } });
  expect(val(r, "CMSG_A")).toEqual({ name: "CMSG_A", value: 0x440000, dir: "CMSG", confidence: "high" });
  expect(val(r, "CMSG_B")?.value).toBe(0x440014);
});

test("monotone offset alignment follows an insertion in a sparse group", () => {
  // client inserted one opcode at index 2: WPP 2,3 -> client 3,4
  const r = matchOpcodes(
    [W("CMSG_A", 0x390000), W("CMSG_B", 0x390001), W("CMSG_C", 0x390002), W("CMSG_D", 0x390003)],
    [0, 1, 3, 4].map(i => C("CMSG", 0x450000 | i)),
    { groupMap: { CMSG: { "0x39": "0x45" } } });
  expect(r.matched.map(m => [m.name, m.value])).toEqual([
    ["CMSG_A", 0x450000], ["CMSG_B", 0x450001], ["CMSG_C", 0x450003], ["CMSG_D", 0x450004],
  ]);
  expect(r.matched.every(m => m.confidence === "high")).toBe(true);
});

test("anchors are hard constraints; dense groups are low confidence between anchors", () => {
  const client = Array.from({ length: 40 }, (_, i) => C("SMSG", 0x460000 | i));
  const r = matchOpcodes(
    [W("SMSG_A", 0x3a0001), W("SMSG_B", 0x3a0005), W("SMSG_C", 0x3a0006)],
    client,
    { groupMap: { SMSG: { "0x3a": "0x46" } }, names: { SMSG_A: 0x460001, SMSG_C: 0x460010 } });
  expect(val(r, "SMSG_A")?.confidence).toBe("override");
  expect(val(r, "SMSG_C")).toEqual({ name: "SMSG_C", value: 0x460010, dir: "SMSG", confidence: "override" });
  const b = val(r, "SMSG_B")!;
  expect(b.confidence).toBe("low");
  expect(b.value).toBeGreaterThan(0x460001);
  expect(b.value).toBeLessThan(0x460010);
});

test("names in unmapped groups are absent; unassigned client values are reported", () => {
  const r = matchOpcodes(
    [W("SMSG_X", 0x520000), W("CMSG_A", 0x380000)],
    [C("CMSG", 0x440000), C("CMSG", 0x440001)],
    { groupMap: { CMSG: { "0x38": "0x44" } } });
  expect(r.absent.map(a => a.name)).toEqual(["SMSG_X"]);
  expect(r.unmatchedClient.map(c => c.value)).toEqual([0x440001]);
});

test("override names outside any mapped group still win", () => {
  const r = matchOpcodes([W("SMSG_Y", 0x410003)], [C("SMSG", 0x4d0006)], { names: { SMSG_Y: 0x4d0006 } });
  expect(r.matched).toEqual([{ name: "SMSG_Y", value: 0x4d0006, dir: "SMSG", confidence: "override" }]);
  expect(r.absent).toEqual([]);
});

test("duplicate WPP values: first entry wins, later duplicates are absent", () => {
  const r = matchOpcodes(
    [W("SMSG_REAL", 0x3a0005), W("SMSG_NYI", 0x3a0005)],
    Array.from({ length: 8 }, (_, i) => C("SMSG", 0x460000 | i)),
    { groupMap: { SMSG: { "0x3a": "0x46" } } });
  expect(r.matched.map(m => m.name)).toEqual(["SMSG_REAL"]);
  expect(r.absent.map(a => a.name)).toEqual(["SMSG_NYI"]);
});

test("report summarises counts", () => {
  const r = matchOpcodes([W("CMSG_A", 0x380000)], [C("CMSG", 0x440000)], { groupMap: { CMSG: { "0x38": "0x44" } } });
  expect(renderReport(r)).toContain("matched: 1 (low: 0)");
});
