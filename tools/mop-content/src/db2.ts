// Minimal WDC5 reader for the integer fields of small client tables (no strings, no encrypted sections).
// Format: https://wowdev.wiki/DB2#WDC5 ; column names come from the WoWDBDefs layout that matches the file.
import { readFileSync } from "node:fs";
import { parseDbd, type DbdField } from "../../mop-re/src/dbd.ts";

export type Row = Record<string, number | number[]>;

interface Storage { offBits: number; sizeBits: number; addSize: number; type: number; v1: number; v2: number; v3: number }

export function readDb2(file: string, dbdFile: string): { layoutHash: string; rows: Row[] } {
  const b = readFileSync(file);
  if (b.toString("latin1", 0, 4) !== "WDC5") throw new Error(`${file}: not WDC5`);
  let p = 4 + 4 + 128;
  const u32 = () => { const v = b.readUInt32LE(p); p += 4; return v; };
  const u16 = () => { const v = b.readUInt16LE(p); p += 2; return v; };
  const recordCount = u32(), fieldCount = u32(), recordSize = u32(); u32(); u32();
  const layoutHash = u32().toString(16).toUpperCase().padStart(8, "0");
  u32(); u32(); u32();
  const flags = u16(), idIndex = u16(); u32(); u32(); u32();
  const storageSize = u32(), commonSize = u32(), palletSize = u32(), sectionCount = u32();
  void recordCount; void commonSize;
  const sections = [];
  for (let i = 0; i < sectionCount; i++) {
    const tact = b.readBigUInt64LE(p); p += 8;
    sections.push({ tact, fileOffset: u32(), recordCount: u32(), stringSize: u32(), recordsEnd: u32(), idListSize: u32(),
      relSize: u32(), offsetMapCount: u32(), copyCount: u32() });
  }
  p += fieldCount * 4;
  const st: Storage[] = [];
  for (let i = 0; i < storageSize / 24; i++)
    st.push({ offBits: u16(), sizeBits: u16(), addSize: u32(), type: u32(), v1: u32(), v2: u32(), v3: u32() });
  const palletBase = p; p += palletSize;
  const pallet: number[] = [], common: Map<number, number>[] = [];
  let po = palletBase;
  for (const s of st) {
    pallet.push(po);
    if (s.type === 3 || s.type === 4) po += s.addSize;
  }
  for (const s of st) {
    const m = new Map<number, number>();
    if (s.type === 2) for (let k = 0; k < s.addSize / 8; k++) { m.set(b.readUInt32LE(p), b.readUInt32LE(p + 4)); p += 8; }
    common.push(m);
  }
  if (flags & 1) throw new Error(`${file}: offset-map tables not supported`);

  const dbd = parseDbd(readFileSync(dbdFile, "utf8"));
  const layout = dbd.builds.find(x => x.block.layoutHashes.includes(layoutHash))?.block;
  if (!layout) throw new Error(`${file}: no DBD layout ${layoutHash}`);
  const inline: DbdField[] = layout.fields.filter(f => !f.noninline);
  const idField = layout.fields.find(f => f.isId);
  const relField = layout.fields.find(f => f.isRelation && f.noninline);

  const bits = (rec: number, off: number, n: number) => {
    let v = 0n;
    for (let k = 0; k < n; k++) {
      const bit = off + k;
      if (b[rec + (bit >> 3)] & (1 << (bit & 7))) v |= 1n << BigInt(k);
    }
    return v;
  };
  const rows: Row[] = [];
  for (const s of sections) {
    if (s.tact !== 0n) continue;
    const recBase = s.fileOffset;
    let q = recBase + s.recordCount * recordSize + s.stringSize;
    const ids: number[] = [];
    for (let k = 0; k < s.idListSize / 4; k++) ids.push(b.readUInt32LE(q + k * 4));
    q += s.idListSize;
    const copies: [number, number][] = [];
    for (let k = 0; k < s.copyCount; k++) copies.push([b.readUInt32LE(q + k * 8), b.readUInt32LE(q + k * 8 + 4)]);
    q += s.copyCount * 8 + s.offsetMapCount * 6;
    const rel = new Map<number, number>();
    if (s.relSize) {
      const n = b.readUInt32LE(q); q += 12;
      for (let k = 0; k < n; k++) rel.set(b.readUInt32LE(q + k * 8 + 4), b.readUInt32LE(q + k * 8));
    }
    const secRows: Row[] = [];
    for (let r = 0; r < s.recordCount; r++) {
      const rec = recBase + r * recordSize;
      const vals: (number | number[])[] = [];
      st.forEach((f, fi) => {
        switch (f.type) {
          case 0: {
            const n = inline[fi]?.arrayLen ?? 1, w = f.sizeBits / n;
            const arr = [];
            for (let k = 0; k < n; k++) arr.push(Number(bits(rec, f.offBits + k * w, Math.min(32, w))));
            vals.push(n === 1 ? arr[0] : arr); break;
          }
          case 1: case 5: {
            let v = Number(bits(rec, f.offBits, f.sizeBits));
            if (f.type === 5 && v >= 2 ** (f.sizeBits - 1)) v -= 2 ** f.sizeBits;
            vals.push(v); break;
          }
          case 2: vals.push(Number.NaN); break; // filled after the ID is known
          case 3: vals.push(b.readUInt32LE(pallet[fi] + Number(bits(rec, f.offBits, f.sizeBits)) * 4)); break;
          case 4: {
            const idx = Number(bits(rec, f.offBits, f.sizeBits)), arr = [];
            for (let k = 0; k < f.v3; k++) arr.push(b.readUInt32LE(pallet[fi] + (idx * f.v3 + k) * 4));
            vals.push(arr); break;
          }
          default: throw new Error(`${file}: storage type ${f.type}`);
        }
      });
      const id = ids.length ? ids[r] : (vals[idIndex] as number);
      const row: Row = {};
      st.forEach((f, fi) => { if (f.type === 2) vals[fi] = common[fi].get(id) ?? f.v1; });
      inline.forEach((f, fi) => { row[f.name] = vals[fi]; });
      if (idField) row[idField.name] = id;
      if (relField) row[relField.name] = rel.get(r) ?? 0;
      secRows.push(row);
    }
    rows.push(...secRows);
    const byId = new Map(rows.map(x => [idField ? (x[idField.name] as number) : 0, x]));
    for (const [newId, oldId] of copies) {
      const src = byId.get(oldId);
      if (src && idField) rows.push({ ...src, [idField.name]: newId });
    }
  }
  return { layoutHash, rows };
}
