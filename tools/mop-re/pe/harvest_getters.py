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
        if 0x2C <= op >> 16 <= 0x60 and (op & 0xFFFF) < 0x1000:
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
    res = [{"getter": g, "opcode": op, "vtables": slots.get(g, [])} for g, op in sorted(getters.items(), key=lambda x: x[1])]
    json.dump(res, open(out, "w"), indent=0)
    print(len(res), "getters;", sum(1 for r in res if r["vtables"]), "with vtable refs")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
