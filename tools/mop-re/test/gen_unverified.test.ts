import { expect, test } from "bun:test";
import { renderHeader, unverifiedServerOpcodes } from "../src/gen_unverified";

const H = `enum OpcodeServer : uint32
{
    SMSG_B                                             = 0x460010, // TODO(verify): low-confidence match
    SMSG_A                                             = 0x460002, // TODO(verify): low-confidence match
    SMSG_C                                             = 0x460001,
    SMSG_D                                             = UNKNOWN_OPCODE,
    CMSG_E                                             = 0x440001, // TODO(verify): low-confidence match
};`;

test("lists only TODO(verify) SMSGs, sorted by value for binary_search", () => {
  expect(unverifiedServerOpcodes(H)).toEqual([{ name: "SMSG_A", value: 0x460002 }, { name: "SMSG_B", value: 0x460010 }]);
});

test("header holds the sorted values", () => {
  const out = renderHeader(unverifiedServerOpcodes(H));
  expect(out).toContain("std::array<uint32, 2>");
  expect(out.indexOf("0x460002")).toBeLessThan(out.indexOf("0x460010"));
});
