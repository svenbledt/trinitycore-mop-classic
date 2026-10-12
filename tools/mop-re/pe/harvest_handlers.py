# Resolve each SMSG to its client handler: thunk before the getter jumps through a global that init code fills
# with "lea reg, handler; mov [global], reg". Usage: py -3.12 harvest_handlers.py <dump.exe> <layouts.json> <out.json>
import json, re, struct, sys
import pefile

def main(path, lpath, out):
    pe = pefile.PE(path, fast_load=True)
    base = pe.OPTIONAL_HEADER.ImageBase
    t = next(s for s in pe.sections if s.Name.startswith(b".text"))
    tb = bytes(pe.__data__[t.PointerToRawData:t.PointerToRawData + t.SizeOfRawData])
    tva = base + t.VirtualAddress
    ents = json.load(open(lpath))
    glob = {}
    for e in ents:
        if e["opcode"] >> 16 <= 0x45:
            continue
        o = e["getter"] - tva - 0x10
        if tb[o:o + 3] == b"\x48\x8B\x05" and tb[o + 7:o + 11] == b"\x48\x85\xC0\x74":
            glob[e["getter"] - 0x10 + 7 + struct.unpack_from("<i", tb, o + 3)[0]] = e["opcode"]
    writes = {}
    for m in re.finditer(rb"[\x48\x4C]\x89[\x05\x0D\x15\x1D\x25\x2D\x35\x3D]", tb):
        o = m.start()
        g = tva + o + 7 + struct.unpack_from("<i", tb, o + 3)[0]
        if g not in glob:
            continue
        reg = (tb[o + 2] >> 3) & 7 | (8 if tb[o] == 0x4C else 0)
        for back in range(7, 40):
            p = o - back
            if tb[p] in (0x48, 0x4C) and tb[p + 1] == 0x8D and tb[p + 2] & 0xC7 == 0x05:
                if ((tb[p + 2] >> 3) & 7 | (8 if tb[p] == 0x4C else 0)) == reg:
                    writes.setdefault(glob[g], set()).add(tva + p + 7 + struct.unpack_from("<i", tb, p + 3)[0])
                    break
    res = {hex(op): {"global": g, "handlers": sorted(writes.get(op, []))} for g, op in glob.items()}
    json.dump(res, open(out, "w"), indent=0)
    print(len(glob), "thunks;", sum(1 for v in res.values() if v["handlers"]), "with handler")

if __name__ == "__main__":
    main(*sys.argv[1:4])
