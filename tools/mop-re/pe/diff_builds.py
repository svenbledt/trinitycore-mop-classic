# Re-baseline helper: prove which opcode values keep their packet between two client builds.
# Usage: py -3.12 diff_builds.py <old.exe> <old harvest dir> <new.exe> <new harvest dir> <out.json>
# Method: docs/mop-port/opcode-harvest.md "Re-baselining a new build".
import collections, json, re, sys
import pefile
from prims import BUILDS
from capstone import Cs, CS_ARCH_X86, CS_MODE_64

ADDR = re.compile(r"0x14[0-9a-f]{7}|0x[0-9a-f]{6,}")  # absolute VAs and image-relative table offsets
RIP = re.compile(r"\[rip [+-] 0x[0-9a-f]+\]")


class Image:
    def __init__(self, path):
        pe = pefile.PE(path, fast_load=True)
        t = next(s for s in pe.sections if s.Name.startswith(b".text"))
        self.tb = bytes(pe.__data__[t.PointerToRawData:t.PointerToRawData + t.SizeOfRawData])
        self.tva = pe.OPTIONAL_HEADER.ImageBase + t.VirtualAddress
        self.md = Cs(CS_ARCH_X86, CS_MODE_64)
        self.cache = {}

    def body(self, ea, limit=0x2000):
        # (call targets, instruction mnemonic shape) up to the first ret/int3 or tail jump
        if ea in self.cache:
            return self.cache[ea]
        o = ea - self.tva
        calls, shape = [], []
        if 0 <= o < len(self.tb):
            for ins in self.md.disasm(self.tb[o:o + limit], ea):
                # keep field offsets/immediates, drop absolute addresses and rip displacements (they move per build)
                ops = "A" if ins.mnemonic in ("call", "jmp") or ins.mnemonic.startswith("j") else \
                    ADDR.sub("A", RIP.sub("[rip+A]", ins.op_str))
                shape.append(f"{ins.mnemonic} {ops}")
                if ins.mnemonic == "call" and ins.op_str.startswith("0x"):
                    calls.append(int(ins.op_str, 16))
                elif ins.mnemonic == "jmp" and ins.op_str.startswith("0x"):
                    tgt = int(ins.op_str, 16)
                    if not ea <= tgt < ea + limit:
                        calls.append(tgt)
                        break
                if ins.mnemonic in ("ret", "int3"):
                    break
        self.cache[ea] = (calls, " ".join(shape))
        return self.cache[ea]


def roots(hdir):
    lay = {e["opcode"]: e for e in json.load(open(f"{hdir}/layouts.json"))}
    hnd = json.load(open(f"{hdir}/handlers.json"))
    inl = json.load(open(f"{hdir}/inline.json"))
    res = {}
    for op, e in lay.items():
        r = {"getter": e["getter"], "ctor": e.get("writer") or e.get("ctor")}
        k = hex(op)
        hs = (hnd.get(k) or {}).get("handlers") or (inl.get(k) or {}).get("handlers") or []
        if hs:
            r["handler"] = hs[0]
        if k in inl:
            r["inline"] = inl[k]["calls"]
        res[op] = r
    return res


def main(old_exe, old_dir, new_exe, new_dir, out):
    A, B = Image(old_exe), Image(new_exe)
    ra, rb = roots(old_dir), roots(new_dir)
    votes = collections.defaultdict(collections.Counter)
    work = []
    for op in ra:
        for k in ("getter", "ctor", "handler"):
            if ra[op].get(k) and rb.get(op, {}).get(k):
                work.append((ra[op][k], rb[op][k]))
        ia, ib = ra[op].get("inline"), rb.get(op, {}).get("inline")
        if ia and ib and len(ia) == len(ib):
            work += list(zip(ia, ib))
    # propagate correspondence through equal-length call lists, depth-limited by a visited set
    seen = set()
    while work:
        a, b = work.pop()
        votes[a][b] += 1
        if (a, b) in seen:
            continue
        seen.add((a, b))
        ca, cb = A.body(a)[0], B.body(b)[0]
        if len(ca) == len(cb) and len(seen) < 400000:
            work += list(zip(ca, cb))
    fmap = {a: c.most_common(1)[0][0] for a, c in votes.items()}

    # primitives are leaves: their own bodies are library code recompiled per build
    leaves = {a for p in BUILDS.values() for k in ("smsg", "cmsg", "noise") for a in p[k]}
    ctor_use = collections.Counter(r.get("ctor") for r in ra.values())

    def same(a, b, depth=0, stack=(), max_depth=4):
        # structural equality of a and b: same instruction shape and recursively mapped callees
        if fmap.get(a) != b:
            return False
        if a in leaves:
            return True
        ca, sa = A.body(a)
        cb, sb = B.body(b)
        if sa != sb or len(ca) != len(cb):
            return False
        if depth >= max_depth:
            return all(fmap.get(x) == y for x, y in zip(ca, cb))
        return all(x in stack or same(x, y, depth + 1, stack + (x,), max_depth) for x, y in zip(ca, cb))

    res = {}
    for op in sorted(ra):
        if op not in rb:
            res[hex(op)] = {"status": "missing"}
            continue
        diffs = []
        for k in ("ctor", "handler"):
            a, b = ra[op].get(k), rb[op].get(k)
            if bool(a) != bool(b):
                diffs.append(f"{k}:presence")
            elif a and k == "ctor" and ctor_use[a] > 1:
                pass  # dispatcher fragment shared by several packets: covered by "inline"
            elif a and not same(a, b, max_depth=4 if k == "ctor" else 0):
                # handlers: own body + callee identity; deeper helpers are shared game code
                diffs.append(k)
        ia, ib = ra[op].get("inline"), rb[op].get("inline")
        if (ia or ib) and not (ia and ib and len(ia) == len(ib) and all(same(x, y) for x, y in zip(ia, ib))):
            diffs.append("inline")
        res[hex(op)] = {"status": "changed" if diffs else "same", "diffs": diffs,
                        "old": {k: hex(v) for k, v in ra[op].items() if isinstance(v, int)},
                        "new": {k: hex(v) for k, v in rb[op].items() if isinstance(v, int)}}
    json.dump(res, open(out, "w"), indent=1)
    c = collections.Counter(v["status"] for v in res.values())
    print(dict(c), "; function pairs:", len(fmap))


if __name__ == "__main__":
    main(*sys.argv[1:6])
