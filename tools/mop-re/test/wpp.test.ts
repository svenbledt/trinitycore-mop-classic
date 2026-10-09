import { expect, test } from "bun:test";
import { parseWppOpcodes } from "../src/wpp";
import { group, index } from "../src/types";

test("parses client and server opcode dictionaries", async () => {
  const src = await Bun.file(import.meta.dir + "/fixtures/wpp_Opcodes.cs").text();
  const e = parseWppOpcodes(src);
  expect(e).toEqual([
    { name: "CMSG_AUTH_SESSION", value: 0x390001, dir: "CMSG" },
    { name: "CMSG_ENUM_CHARACTERS", value: 0x380014, dir: "CMSG" },
    { name: "SMSG_AUTH_CHALLENGE", value: 0x410000, dir: "SMSG" },
  ]);
});

test("group/index split", () => {
  expect(group(0x390001)).toBe(0x39);
  expect(index(0x390001)).toBe(1);
});
