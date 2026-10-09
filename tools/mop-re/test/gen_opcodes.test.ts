import { expect, test } from "bun:test";
import { rewriteOpcodesH, rewriteOpcodesCpp } from "../src/gen_opcodes";

const r = {
  matched: [
    { name: "CMSG_ACCEPT_TRADE", value: 0x3f0005, dir: "CMSG", confidence: "high" },
    { name: "CMSG_AUTH_SESSION", value: 0x450001, dir: "CMSG", confidence: "override" },
    { name: "CMSG_LEARN_TALENTS", value: 0x3f00f2, dir: "CMSG", confidence: "low" },
    { name: "SMSG_AUTH_CHALLENGE", value: 0x4d0003, dir: "SMSG", confidence: "override" },
    { name: "SMSG_AUTH_RESPONSE", value: 0x460001, dir: "SMSG", confidence: "override" },
  ],
  unmatchedClient: [{ dir: "CMSG", value: 0x450010, rva: "0x0" }],
  absent: [{ name: "CMSG_QUERY_VOID_STORAGE", value: 0x340000, dir: "CMSG" }],
} as any;

const H = async () => Bun.file(import.meta.dir + "/fixtures/Opcodes.h.in").text();
const CPP = async () => Bun.file(import.meta.dir + "/fixtures/Opcodes.cpp.in").text();

test("rewrites values, keeps TC-only names as UNKNOWN_OPCODE, adds new names", async () => {
  const h = rewriteOpcodesH(await H(), r, "70032");
  expect(h).toContain("    CMSG_AUTH_SESSION                                  = 0x450001,");
  expect(h).toContain("    CMSG_QUERY_VOID_STORAGE                            = UNKNOWN_OPCODE,");
  expect(h).toContain("    SMSG_WEEKLY_REWARDS_RESULT                         = UNKNOWN_OPCODE,");
  expect(h).toMatch(/    CMSG_LEARN_TALENTS\s+= 0x3F00F2, \/\/ TODO\(verify\): low-confidence match/);
  expect(h.indexOf("CMSG_LEARN_TALENTS")).toBeLessThan(h.indexOf("CMSG_QUERY_VOID_STORAGE"));
});

test("index switch is sized from all client values, named or not", async () => {
  const h = rewriteOpcodesH(await H(), r, "70032");
  expect(h).toContain("        case 0x3F: return idInGroup < 243 ? idInGroup + 0 : -1;");
  expect(h).toContain("        case 0x45: return idInGroup < 17 ? idInGroup + 243 : -1;");
  expect(h).toContain("NUM_CMSG_OPCODES = 260;");
  expect(h).toContain("        case 0x46: return idInGroup < 2 ? idInGroup + 0 : -1;");
  expect(h).toContain("        case 0x4D: return idInGroup < 4 ? idInGroup + 2 : -1;");
  expect(h).not.toContain("case 0x2E:");
});

test("registration: new names unhandled, existing lines untouched", async () => {
  const cpp = rewriteOpcodesCpp(await CPP(), r);
  expect(cpp).toContain("    DEFINE_HANDLER(CMSG_LEARN_TALENTS,                                      STATUS_UNHANDLED, PROCESS_INPLACE,      &WorldSession::Handle_NULL);");
  expect(cpp).toContain("DEFINE_HANDLER(CMSG_QUERY_VOID_STORAGE,");
  expect(cpp.indexOf("CMSG_LEARN_TALENTS")).toBeLessThan(cpp.indexOf("CMSG_QUERY_VOID_STORAGE"));
});

test("idempotent", async () => {
  const once = rewriteOpcodesH(await H(), r, "70032");
  expect(rewriteOpcodesH(once, r, "70032")).toBe(once);
  const c1 = rewriteOpcodesCpp(await CPP(), r);
  expect(rewriteOpcodesCpp(c1, r)).toBe(c1);
});

test("duplicate values are rejected", async () => {
  const dup = { ...r, matched: [...r.matched, { name: "CMSG_X", value: 0x450001, dir: "CMSG", confidence: "low" }] };
  expect(() => rewriteOpcodesH("", dup, "70032")).toThrow(/duplicate/);
});

test("new registrations go between existing registration lines, never before the macro definition", async () => {
  const r2 = { ...r, matched: [...r.matched, { name: "SMSG_AAA_FIRST", value: 0x460000, dir: "SMSG", confidence: "low" }] };
  const cpp = rewriteOpcodesCpp(await CPP(), r2);
  expect(cpp.indexOf("CMSG_LEARN_TALENTS")).toBeGreaterThan(cpp.indexOf("#define DEFINE_HANDLER"));
  expect(cpp.indexOf("SMSG_AAA_FIRST")).toBeGreaterThan(cpp.indexOf("#define DEFINE_SERVER_OPCODE_HANDLER"));
  expect(cpp.indexOf("SMSG_AAA_FIRST")).toBeLessThan(cpp.indexOf("DEFINE_SERVER_OPCODE_HANDLER(SMSG_AUTH_CHALLENGE"));
});
