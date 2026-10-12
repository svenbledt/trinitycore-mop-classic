# For every opcode getter, locate its packet vtable, the (de)serializer and the ordered call sequence.
# Usage: py -3.12 harvest_layouts.py <dump.exe> <getters.json> <out.json>. Method: docs/mop-port/opcode-harvest.md
import json, re, struct, sys
import pefile
from capstone import Cs, CS_ARCH_X86, CS_MODE_64

SIZED = {0x142E4D0D0, 0x142E4D120}  # 70032 read-bytes(n) / read-string(n): keep the size immediate

def main(path, gpath, out):
    pe = pefile.PE(path, fast_load=True)
    base = pe.OPTIONAL_HEADER.ImageBase
    data = pe.__data__
    text = next(s for s in pe.sections if s.Name.startswith(b".text"))
    tb = bytes(data[text.PointerToRawData:text.PointerToRawData + text.SizeOfRawData])
    tva = base + text.VirtualAddress
    getters = json.load(open(gpath))
    vt = {}
    for g in getters:
        vt[g["vtables"][0]["slot"] - 0x18] = g
    # rip-relative LEA to a vtable start = constructor storing the vtable
    ctors = {}
    for m in re.finditer(rb"[\x48\x4C]\x8D[\x05\x0D\x15\x1D\x25\x2D\x35\x3D]", tb):
        off = m.start()
        tgt = tva + off + 7 + struct.unpack_from("<i", tb, off + 3)[0]
        if tgt in vt:
            ctors.setdefault(tgt, []).append(tva + off)
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    def calls(ea, limit=0x1800):
        o = ea - tva
        seq = []
        r8 = None
        for ins in md.disasm(tb[o:o + limit], ea):
            if ins.mnemonic == "mov" and ins.op_str.startswith("r8d, 0x"):
                r8 = int(ins.op_str.split(", ")[1], 16)
            if ins.mnemonic == "call" and ins.op_str.startswith("0x"):
                t = int(ins.op_str, 16)
                seq.append([t, r8] if t in SIZED else t)
                r8 = None
            elif ins.mnemonic == "jmp" and ins.op_str.startswith("0x") and not (ea <= int(ins.op_str, 16) < ea + limit):
                seq.append(int(ins.op_str, 16)); break  # tail call
            if ins.mnemonic in ("ret", "int3"):
                break
        return seq
    def func_start(ea):
        # walk back to the CC/C3 padding preceding the function
        o = ea - tva
        while o > 0 and not (tb[o - 1] in (0xCC, 0xC3) and (tb[o - 2] in (0xCC, 0xC3) or tb[o - 1] == 0xCC)):
            o -= 1
        return tva + o
    res = []
    for start, g in sorted(vt.items(), key=lambda x: x[1]["opcode"]):
        ctx = g["vtables"][0]["ctx"]  # ctx[6] is the getter slot
        ent = {"opcode": g["opcode"], "getter": g["getter"], "vtable": start, "slots": ctx[3:8]}
        if g["opcode"] >> 16 <= 0x45:
            ent["writer"] = ctx[4]
            ent["calls"] = calls(ctx[4])
        else:
            refs = ctors.get(start, [])
            ent["ctor_refs"] = refs
            if refs:
                f = func_start(refs[0])
                ent["ctor"] = f
                ent["calls"] = calls(f)
        res.append(ent)
    json.dump(res, open(out, "w"))
    print(len(res), "packets;", sum(1 for r in res if r.get("calls") is not None), "with call sequences;",
          sum(1 for r in res if r["opcode"] >> 16 > 0x45 and len(r.get("ctor_refs", [])) != 1), "SMSG with !=1 ctor ref")

if __name__ == "__main__":
    main(*sys.argv[1:4])
