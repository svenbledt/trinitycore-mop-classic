import { expect, test } from "bun:test";
import { rewriteStruct } from "../src/gen_struct";

const F = (name: string, ft: string, signed = false) => ({ signed, ft, name });

const oldStruct = [
  "struct DemoEntry",
  "{",
  "    LocalizedString Text;",
  "    DBCPosition3D Pos;",
  "    uint32 ID;",
  "    uint16 Flags;",
  "    std::array<uint16, MAX_DEMO_EMOTES> EmoteID;",
  "    int32 Removed;",
  "",
  "    bool HasFlag() const { return Flags != 0; }",
  "};",
].join("\n");

const oldFields = [
  F("Text", "FT_STRING"), F("PosX", "FT_FLOAT"), F("PosY", "FT_FLOAT"), F("PosZ", "FT_FLOAT"), F("ID", "FT_INT"),
  F("Flags", "FT_SHORT"), F("EmoteID1", "FT_SHORT"), F("EmoteID2", "FT_SHORT"), F("EmoteID3", "FT_SHORT"), F("Removed", "FT_INT", true),
];

test("keeps unchanged members verbatim, retypes, adds, drops, keeps methods", () => {
  const newFields = [
    F("Text", "FT_STRING"), F("PosX", "FT_FLOAT"), F("PosY", "FT_FLOAT"), F("PosZ", "FT_FLOAT"), F("ID", "FT_INT"),
    F("Flags", "FT_INT"), F("NewThing", "FT_BYTE", true), F("EmoteID1", "FT_SHORT"), F("EmoteID2", "FT_SHORT"), F("EmoteID3", "FT_SHORT"),
    F("Other1", "FT_INT", true), F("Other2", "FT_INT", true),
  ];
  const r = rewriteStruct(oldStruct, oldFields, newFields);
  expect(r.text).toBe([
    "struct DemoEntry",
    "{",
    "    LocalizedString Text;",
    "    DBCPosition3D Pos;",
    "    uint32 ID;",
    "    uint32 Flags;",
    "    int8 NewThing;",
    "    std::array<uint16, MAX_DEMO_EMOTES> EmoteID;",
    "    std::array<int32, 2> Other;",
    "",
    "    bool HasFlag() const { return Flags != 0; }",
    "};",
  ].join("\n"));
  expect(r.removed).toEqual(["Removed"]);
  expect(r.added).toEqual(["NewThing", "Other"]);
});

test("array size change rewrites the extent", () => {
  const newFields = [...oldFields.slice(0, 6), F("EmoteID1", "FT_SHORT"), F("EmoteID2", "FT_SHORT"), F("Removed", "FT_INT", true)];
  const r = rewriteStruct(oldStruct, oldFields, newFields);
  expect(r.text).toContain("    std::array<uint16, 2> EmoteID; // TODO(verify): 5.5 size, was MAX_DEMO_EMOTES");
});

test("refuses when old fields cannot be mapped onto the members", () => {
  expect(() => rewriteStruct(oldStruct, oldFields.slice(1), oldFields)).toThrow(/cannot map/);
});

test("a member does not swallow a field that is another member's exact name", () => {
  const s = ["struct TwoEntry", "{", "    LocalizedString Text;", "    LocalizedString Text1;", "    uint32 ID;", "};"].join("\n");
  const f = [F("Text", "FT_STRING"), F("Text1", "FT_STRING"), F("ID", "FT_INT")];
  expect(rewriteStruct(s, f, f).text).toBe(s);
});
