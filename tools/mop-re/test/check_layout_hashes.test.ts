import { expect, test } from "bun:test";
import { findLayoutHashes, pickLayoutHash } from "../src/check_layout_hashes";

test("pickLayoutHash prefers the hash present in the client dump", () => {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setUint32(0, 0xb47c6f05, true);
  expect(pickLayoutHash(["32401DC5", "B47C6F05"], buf)).toBe("B47C6F05");
  expect(pickLayoutHash(["32401DC5"], buf)).toBe("32401DC5");
  expect(pickLayoutHash(["32401DC5", "B47C6F05"], null)).toBe("32401DC5");
});

test("finds little-endian layout hashes and reports missing ones as -1", () => {
  const buf = new Uint8Array(16);
  new DataView(buf.buffer).setUint32(4, 0xafc9b0c2, true);
  const r = findLayoutHashes(buf, ["AFC9B0C2", "DEADBEEF"]);
  expect(r.get("AFC9B0C2")).toBe(4);
  expect(r.get("DEADBEEF")).toBe(-1);
});
