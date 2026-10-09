// Guards against two opcode names sharing a value (e.g. the 0x460320 NPC_INTERACTION/SOCIAL_CONTRACT collision).
// gen_opcodes rejects dupes at generation; this re-checks the committed Opcodes.h so hand-edits can't reintroduce one.
import { test, expect } from "bun:test";
import { readFileSync } from "fs";

const header = `${import.meta.dir}/../../../src/server/game/Server/Protocol/Opcodes.h`;

function duplicateValues(src: string, enumName: string): string[] {
  const body = src.split(`enum ${enumName} : uint32`)[1]?.split("};")[0] ?? "";
  const seen = new Map<string, string>();
  const dups: string[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*((?:CMSG|SMSG)_\w+)\s*=\s*(0x[0-9A-Fa-f]+)/);
    if (!m) continue;
    const value = m[2].toLowerCase();
    if (value === "0xbadd") continue; // UNKNOWN_OPCODE sentinel, shared by design
    if (seen.has(value)) dups.push(`${value}: ${seen.get(value)} and ${m[1]}`);
    else seen.set(value, m[1]);
  }
  return dups;
}

test("no duplicate OpcodeClient/OpcodeServer values in Opcodes.h", () => {
  const src = readFileSync(header, "utf8");
  expect(duplicateValues(src, "OpcodeClient")).toEqual([]);
  expect(duplicateValues(src, "OpcodeServer")).toEqual([]);
});
