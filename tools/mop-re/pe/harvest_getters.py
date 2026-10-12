# Harvest per-packet opcode getters ("mov dword [rdx], OPCODE; mov rax, rdx; ret") and their vtables
# from a client dump, statically. Usage: py -3.12 harvest_getters.py <dump.exe> <out.json>
import json, re, struct, sys
import pefile

def main(path, out):
    pe = pefile.PE(path, fast_load=True)
    base = pe.OPTIONAL_HEADER.ImageBase
    secs = {s.Name.rstrip(b"\0").decode(): s for s in pe.sections}
    data = pe.__data__
    def sec_bytes(n):
        s = secs[n]; return s, bytes(data[s.PointerToRawData:s.PointerToRawData + s.SizeOfRawData])
    text, tb = sec_bytes(".text")
    tva = base + text.VirtualAddress
    getters = {}
    for m in re.finditer(rb"\xC7\x02(....)\x48\x8B\xC2\xC3", tb, re.S):
        op = struct.unpack("<I", m.group(1))[0]
        if op >> 16 and (op & 0xFFFF) < 0x1000:  # no group cap: 70032 has packet groups above 0x60
            getters[tva + m.start()] = op
    # vtable slots referencing each getter
    slots = {}
    for n in (".rdata", ".data"):
        if n not in secs: continue
        s, b = sec_bytes(n)
        sva = base + s.VirtualAddress
        for off in range(0, len(b) - 8, 8):
            q = struct.unpack_from("<Q", b, off)[0]
            if q in getters:
                ctx = [struct.unpack_from("<Q", b, off + 8 * k)[0] for k in range(-6, 7)]
                slots.setdefault(q, []).append({"slot": sva + off, "ctx": ctx})
    # packet classes share the method after the getter slot; other classes reuse the getter shape (70032: 0xAD/0xAE)
    nxt = {}
    for vs in slots.values():
        for v in vs:
            nxt[v["ctx"][7]] = nxt.get(v["ctx"][7], 0) + 1
    common = max(nxt, key=nxt.get)
    slots = {g: [v for v in vs if v["ctx"][7] == common] for g, vs in slots.items()}
    getters = {g: op for g, op in getters.items() if slots.get(g)}
    res = [{"getter": g, "opcode": op, "vtables": slots.get(g, [])} for g, op in sorted(getters.items(), key=lambda x: x[1])]
    json.dump(res, open(out, "w"), indent=0)
    print(len(res), "getters;", sum(1 for r in res if r["vtables"]), "with vtable refs")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
