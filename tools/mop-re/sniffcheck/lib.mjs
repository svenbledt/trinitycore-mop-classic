// Sniff (.pkt v3.1) loader + TC-ByteBuffer-compatible reader for layout checks.
import fs from "fs";

export const OPCODES_H = new URL("../../../src/server/game/Server/Protocol/Opcodes.h", import.meta.url);

export function loadOpcodeNames(path = OPCODES_H) {
  const names = { C: {}, S: {} }, values = {};
  for (const m of fs.readFileSync(path, "utf8").matchAll(/^\s*((C|S)MSG_\w+)\s*=\s*(0x[0-9A-Fa-f]+)/gm)) {
    names[m[2]][parseInt(m[3], 16)] = m[1];
    values[m[1]] = parseInt(m[3], 16);
  }
  return { names, values };
}

export function loadPkt(file, names) {
  const b = fs.readFileSync(file);
  let o = 3 + 2 + 1 + 4 + 4 + 40 + 4 + 4;
  o += 4 + b.readUInt32LE(o);
  const pk = [];
  while (o + 20 <= b.length) {
    const dir = b.readUInt32LE(o), conn = b.readUInt32LE(o + 4), ticks = b.readUInt32LE(o + 8);
    const opt = b.readUInt32LE(o + 12), len = b.readUInt32LE(o + 16);
    o += 20 + opt;
    const op = b.readUInt32LE(o);
    const data = b.subarray(o + 4, o + len);
    o += len;
    const d = dir === 0x47534D53 ? "S" : "C";
    pk.push({ idx: pk.length, d, conn, ticks, op, data, name: names?.[d][op] ?? "?" });
  }
  return pk;
}

export class ParseError extends Error {}

// Mirrors TC ByteBuffer: bits MSB-first; any byte read resets the bit position.
export class Reader {
  constructor(buf) { this.b = buf; this.p = 0; this.bitpos = 8; this.cur = 0; this.trace = []; this.tracing = false; }
  need(n) { if (this.p + n > this.b.length) throw new ParseError(`read past end at ${this.p}+${n} (size ${this.b.length})`); }
  rs() { this.bitpos = 8; this.cur = 0; }
  log(name, v, off) { if (this.tracing) this.trace.push(`${off}: ${name} = ${typeof v === "bigint" ? "0x" + v.toString(16) : JSON.stringify(v)}`); return v; }
  u8(n = "u8") { this.rs(); this.need(1); const o = this.p; const v = this.b[this.p++]; return this.log(n, v, o); }
  i8(n = "i8") { this.rs(); this.need(1); const o = this.p; const v = this.b.readInt8(this.p++); return this.log(n, v, o); }
  u16(n = "u16") { this.rs(); this.need(2); const o = this.p; const v = this.b.readUInt16LE(this.p); this.p += 2; return this.log(n, v, o); }
  i16(n = "i16") { this.rs(); this.need(2); const o = this.p; const v = this.b.readInt16LE(this.p); this.p += 2; return this.log(n, v, o); }
  u32(n = "u32") { this.rs(); this.need(4); const o = this.p; const v = this.b.readUInt32LE(this.p); this.p += 4; return this.log(n, v, o); }
  i32(n = "i32") { this.rs(); this.need(4); const o = this.p; const v = this.b.readInt32LE(this.p); this.p += 4; return this.log(n, v, o); }
  u64(n = "u64") { this.rs(); this.need(8); const o = this.p; const v = this.b.readBigUInt64LE(this.p); this.p += 8; return this.log(n, v, o); }
  f32(n = "f32") { this.rs(); this.need(4); const o = this.p; const v = this.b.readFloatLE(this.p); this.p += 4; return this.log(n, +v.toFixed(4), o); }
  bit(n = "bit") {
    if (this.bitpos >= 8) { this.need(1); this.cur = this.b[this.p++]; this.bitpos = 0; }
    const v = ((this.cur >> (8 - ++this.bitpos)) & 1) !== 0;
    return this.log(n, v ? 1 : 0, `${this.p - 1}.${this.bitpos - 1}`) === 1;
  }
  bits(k, n = "bits") {
    let v = 0;
    const wasTracing = this.tracing; this.tracing = false;
    const at = `${this.p}.${this.bitpos}`;
    for (let i = 0; i < k; i++) v = (v << 1) | (this.bit() ? 1 : 0);
    this.tracing = wasTracing;
    return this.log(n + `:${k}`, v >>> 0, at);
  }
  flush() { this.rs(); }
  bytes(k, n = "bytes") { this.rs(); this.need(k); const o = this.p; const v = this.b.subarray(this.p, this.p + k); this.p += k; this.log(n, v.toString("hex").slice(0, 64), o); return v; }
  str(k, n = "str") { const v = this.bytes(k, n).toString("utf8"); return v; }
  cstr(n = "cstr") { this.rs(); const o = this.p; let e = this.p; while (e < this.b.length && this.b[e]) e++; if (e >= this.b.length) throw new ParseError("unterminated cstring"); const v = this.b.subarray(this.p, e).toString("utf8"); this.p = e + 1; return this.log(n, v, o); }
  // ObjectGuid packed128: lowMask, highMask, then non-zero bytes.
  guid(n = "guid") {
    this.rs(); const o = this.p;
    const lm = this.u8n(), hm = this.u8n();
    let lo = 0n, hi = 0n;
    for (let i = 0; i < 8; i++) if (lm & (1 << i)) lo |= BigInt(this.u8n()) << BigInt(8 * i);
    for (let i = 0; i < 8; i++) if (hm & (1 << i)) hi |= BigInt(this.u8n()) << BigInt(8 * i);
    const s = hi === 0n && lo === 0n ? "0" : `${hi.toString(16)}:${lo.toString(16)}`;
    const t = Number((hi >> 58n) & 0x3Fn);
    return this.log(n, s + (s !== "0" ? ` (type ${t})` : ""), o), { hi, lo, s, type: t };
  }
  u8n() { this.need(1); return this.b[this.p++]; }
  // fixed 16-byte ObjectGuid (e.g. inside update fields / some packets)
  guid128(n = "guid128") { const lo = this.u64(n + ".lo"), hi = this.u64(n + ".hi"); return { lo, hi }; }
  left() { return this.b.length - this.p; }
  pos() { return this.p; }
}

export function hex(buf, max = 512) {
  const h = buf.subarray(0, max).toString("hex");
  return h.match(/.{1,64}/g)?.join("\n") ?? "";
}
