// Cross-checks DB2Metadata.h layout hashes against the client dump (each hash must appear as a little-endian uint32).
export function findLayoutHashes(dump: Uint8Array, hashes: string[]): Map<string, number> {
  const buf = Buffer.from(dump.buffer, dump.byteOffset, dump.byteLength);
  const out = new Map<string, number>();
  for (const h of hashes) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(parseInt(h, 16) >>> 0);
    out.set(h, buf.indexOf(b));
  }
  return out;
}

// WoWDBDefs may list several hashes for one layout; the client dump decides which one the files carry.
export function pickLayoutHash(hashes: string[], dump: Uint8Array | null): string {
  if (dump && hashes.length > 1) {
    const found = findLayoutHashes(dump, hashes);
    const hit = hashes.find(h => found.get(h)! >= 0);
    if (hit) return hit;
  }
  return hashes[0];
}

// usage: bun src/check_layout_hashes.ts <dump.exe> <repo root>
if (import.meta.main) {
  const [dumpPath, root] = Bun.argv.slice(2);
  const meta = (await Bun.file(`${root}/src/server/game/DataStores/DB2Metadata.h`).text()).replace(/\r\n/g, "\n");
  const entries = [...meta.matchAll(/struct (\w+)Meta\n[\s\S]*?Instance\{[^}]*?0x([0-9A-F]{8}), Fields/g)].map(m => ({ table: m[1], hash: m[2] }));
  const r = findLayoutHashes(new Uint8Array(await Bun.file(dumpPath).arrayBuffer()), entries.map(e => e.hash));
  const missing = entries.filter(e => r.get(e.hash)! < 0);
  console.log(`layout hashes: ${entries.length}, missing in dump: ${missing.length}`);
  for (const m of missing) console.log(`  ${m.table} 0x${m.hash}`);
}
