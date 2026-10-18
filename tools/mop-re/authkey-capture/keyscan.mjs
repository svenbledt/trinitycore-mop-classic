// Find a client build's 16-byte auth key: scan memory snapshots for the window that reproduces a captured auth digest.
// digest = HMAC-SHA512(key = SHA512(KeyData[64] || buildKey[16]), Local || Server || AuthCheckSeed)[0..24]
// Usage: bun keyscan.mjs <worldserver log> <dir with .bin snapshots from `authkey-capture stacks`>
// The log must contain the temporary AUTHKEY_DEBUG line (docs/mop-port/re-notes.md "Auth key capture").
import { createHash, createHmac } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const AuthCheckSeed = Buffer.from("DE3A2A8E6B895266889D7E7A771D5D1F4ED90C239BCD0EDCD2E8043A6864C7B0", "hex");

const [logPath, dir] = process.argv.slice(2);
const lines = readFileSync(logPath, "utf8").split(/\r?\n/).filter(l => l.includes("AUTHKEY_DEBUG"));
if (!lines.length)
  throw new Error("no AUTHKEY_DEBUG line in the log");
const field = (line, name) => Buffer.from(line.match(new RegExp(`${name}=([0-9A-Fa-f]+)`))[1], "hex");
// newest attempt first; each login attempt has its own challenges
const attempts = lines.reverse().map(l => ({
  KeyData: field(l, "KeyData"), Local: field(l, "Local"), Server: field(l, "Server"), Digest: field(l, "Digest"),
}));

const digestFor = (a, buildKey) => {
  const kh = createHash("sha512").update(a.KeyData).update(buildKey).digest();
  return createHmac("sha512", kh).update(a.Local).update(a.Server).update(AuthCheckSeed).digest().subarray(0, a.Digest.length);
};

// The key is a stack local: 8-byte aligned and random, so skip windows whose qwords look like pointers or small
// integers (top two bytes zero) and windows already tested in an earlier snapshot. `--full` tests every offset.
const full = process.argv.includes("--full");
const plausible = (b, i) => full || (b.readUInt16LE(i + 6) !== 0 && b.readUInt16LE(i + 14) !== 0);
const files = readdirSync(dir).filter(f => f.endsWith(".bin")).sort().reverse().map(f => join(dir, f));
console.log(`${attempts.length} login attempt(s), ${files.length} snapshot file(s)${full ? " (full scan)" : ""}`);
const seen = new Set();
let tested = 0;
for (const f of files) {
  const buf = readFileSync(f);
  for (let i = 0; i + 16 <= buf.length; i += full ? 1 : 8) {
    if (!plausible(buf, i))
      continue;
    const w = buf.subarray(i, i + 16);
    const k = w.toString("latin1");
    if (seen.has(k))
      continue;
    seen.add(k);
    tested++;
    for (const a of attempts) {
      if (digestFor(a, w).equals(a.Digest)) {
        console.log(`BUILD KEY = ${w.toString("hex").toUpperCase()} (${f} +0x${i.toString(16)}, ${tested} windows tested)`);
        process.exit(0);
      }
    }
  }
}
console.log(`${tested} windows tested`);
console.log("no match: retake the snapshots during the login (the key only lives on the stack briefly)");
process.exit(1);
