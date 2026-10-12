# SMSGs parsed inline in a group dispatcher (one function holds many packets' vtable stores): from each case's vtable
# LEA, collect direct calls up to the handler-global load, and resolve that global to the handler function.
# Usage: py -3.12 harvest_inline.py <dump.exe> <layouts.json> <out.json>. Method: docs/mop-port/opcode-harvest.md
import json, re, struct, sys
import pefile
from capstone import Cs, CS_ARCH_X86, CS_MODE_64

CMSG_MAX_GROUP = 0x45
SPAN = 0x600  # max bytes of one inlined case


def main(path, lpath, out):
    pe = pefile.PE(path, fast_load=True)
    base = pe.OPTIONAL_HEADER.ImageBase
    t = next(s for s in pe.sections if s.Name.startswith(b".text"))
    tb = bytes(pe.__data__[t.PointerToRawData:t.PointerToRawData + t.SizeOfRawData])
    tva = base + t.VirtualAddress
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    ents = [e for e in json.load(open(lpath)) if e["opcode"] >> 16 > CMSG_MAX_GROUP]

    def func_start(ea):
        o = ea - tva
        while o > 0 and not (tb[o - 1] == 0xCC and tb[o - 2] == 0xCC):
            o -= 1
        return tva + o

    # a "ctor" function shared by several opcodes is a dispatcher with inlined ctors
    owner = {}
    for e in ents:
        for r in e.get("ctor_refs", []):
            owner.setdefault(func_start(r), set()).add(e["opcode"])
    dispatchers = {f for f, ops in owner.items() if len(ops) > 1}

    res, globs = {}, set()
    for e in ents:
        refs = [r for r in e.get("ctor_refs", []) if func_start(r) in dispatchers]
        if not refs:
            continue
        ref = refs[0]
        calls, glob = [], None
        r8 = None
        for ins in md.disasm(tb[ref - tva:ref - tva + SPAN], ref):
            m = re.fullmatch(r"(?:mov|cmp) (?:\w+), qword ptr \[rip \+ 0x([0-9a-f]+)\]", ins.mnemonic + " " + ins.op_str)
            if m:
                g = ins.address + ins.size + int(m.group(1), 16)
                nxt = next(md.disasm(tb[ins.address + ins.size - tva:ins.address + ins.size - tva + 16], ins.address + ins.size), None)
                if nxt is not None and nxt.mnemonic == "test":
                    glob = g
                    break
            if ins.mnemonic == "mov" and ins.op_str.startswith("r8d, 0x"):
                r8 = int(ins.op_str.split(", ")[1], 16)
            if ins.mnemonic == "call" and ins.op_str.startswith("0x"):
                calls.append(int(ins.op_str, 16))
            if ins.mnemonic in ("ret", "int3", "jmp"):
                break
        res[e["opcode"]] = {"dispatcher": func_start(ref), "ref": ref, "calls": calls, "global": glob}
        if glob:
            globs.add(glob)

    # handler = function stored into the global by init code ("lea reg, H; mov [G], reg")
    writes = {}
    for m in re.finditer(rb"[\x48\x4C]\x89[\x05\x0D\x15\x1D\x25\x2D\x35\x3D]", tb):
        o = m.start()
        g = tva + o + 7 + struct.unpack_from("<i", tb, o + 3)[0]
        if g not in globs:
            continue
        reg = (tb[o + 2] >> 3) & 7 | (8 if tb[o] == 0x4C else 0)
        for back in range(7, 40):
            p = o - back
            if tb[p] in (0x48, 0x4C) and tb[p + 1] == 0x8D and tb[p + 2] & 0xC7 == 0x05:
                if ((tb[p + 2] >> 3) & 7 | (8 if tb[p] == 0x4C else 0)) == reg:
                    writes.setdefault(g, set()).add(tva + p + 7 + struct.unpack_from("<i", tb, p + 3)[0])
                    break
    for r in res.values():
        r["handlers"] = sorted(writes.get(r["global"], []))
    json.dump({hex(k): v for k, v in sorted(res.items())}, open(out, "w"), indent=0)
    print(len(dispatchers), "dispatchers;", len(res), "inline SMSGs;", sum(1 for r in res.values() if r["global"]),
          "with handler global;", sum(1 for r in res.values() if r["handlers"]), "with handler")


if __name__ == "__main__":
    main(*sys.argv[1:4])
