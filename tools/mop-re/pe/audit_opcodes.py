# Structural opcode audit: align WowPacketParser's nearest Classic-family opcode table (REF) to client 70032 packets by
# comparing the client's (de)serializer primitive sequence with WPP's parser. Method: docs/mop-port/opcode-harvest.md
# Usage: py -3.12 audit_opcodes.py <dump.exe> <layouts.json> <wpp root> <Opcodes.h> <overrides.json> <out dir>
import difflib, json, os, re, struct, sys
from pathlib import Path
import pefile
from capstone import Cs, CS_ARCH_X86, CS_MODE_64

# 70032 CDataStore primitives (re-locate per build, see the doc)
SMSG_PRIM = {0x142E4CAC0: "B", 0x142E4CB10: "H", 0x142E4CB60: "I", 0x142E4CBB0: "Q", 0x142E4D0D0: "S",
             0x142E4D120: "S", 0x142E9E600: "G"}
CMSG_PRIM = {0x142E4D5B0: "I", 0x142E4D470: "B", 0x142E9E630: "G", 0x140583600: "B", 0x142E4DC70: "S",
             0x142E4D7B0: "Q", 0x142E4D650: "I", 0x142E4D510: "H", 0x140583540: "B", 0x140583480: "B",
             0x140583240: "B", 0x140583180: "B", 0x140583300: "B", 0x1405833C0: "B"}
NOISE = {0x142E027A0, 0x142DE2EA0, 0x142DE2D80, 0x142FC00E0, 0x142FC0780, 0x1401D0C60}
CMSG_MAX_GROUP = 0x45
MAX_TOKENS = 40
# WoW Forever beta 1.60.69876: same opcode groups as 70032, small piecewise index shifts (5.5.3 used other group ids)
REF = os.environ.get("MOP_REF", "V1_60_69876")

WPP_TOK = [
    (r"ReadPackedGuid128|ReadGuid\b", "G"),
    (r"ReadU?Int64E?|ReadTime64|ReadPackedQuaternion", "Q"),
    (r"ReadU?Int32E?|ReadSingle|ReadPackedTime|ReadTime\b|ReadEntry|ReadIPAddress", "I"),
    (r"ReadVector2", "II"), (r"ReadVector3", "III"), (r"ReadVector4|ReadQuaternion", "IIII"),
    (r"ReadU?Int16E?", "H"),
    (r"ReadS?ByteE?|ReadBool", "B"),
    (r"ReadBits?E?", "b"),
    (r"ReadWoWString|ReadDynamicString|ReadBytes|ReadCString|ReadToEnd|ReadBytesTable", "S"),
]


def collapse(seq):
    out = []
    for t in seq:
        t = "B" if t == "b" else t
        if t == "B" and out and out[-1] == "B":
            continue
        out.append(t)
    return "".join(out[:MAX_TOKENS])


class Client:
    def __init__(self, path):
        pe = pefile.PE(path, fast_load=True)
        base = pe.OPTIONAL_HEADER.ImageBase
        t = next(s for s in pe.sections if s.Name.startswith(b".text"))
        self.tb = bytes(pe.__data__[t.PointerToRawData:t.PointerToRawData + t.SizeOfRawData])
        self.tva = base + t.VirtualAddress
        self.md = Cs(CS_ARCH_X86, CS_MODE_64)
        self.cache = {}

    def calls(self, ea, limit=0x2000):
        if ea in self.cache:
            return self.cache[ea]
        o = ea - self.tva
        seq = []
        if 0 <= o < len(self.tb):
            for ins in self.md.disasm(self.tb[o:o + limit], ea):
                if ins.mnemonic == "call" and ins.op_str.startswith("0x"):
                    seq.append(int(ins.op_str, 16))
                elif ins.mnemonic == "jmp" and ins.op_str.startswith("0x"):
                    tgt = int(ins.op_str, 16)
                    if not ea <= tgt < ea + limit:
                        seq.append(tgt)
                        break
                if ins.mnemonic in ("ret", "int3"):
                    break
        self.cache[ea] = seq
        return seq

    def tokens(self, ea, prim, depth=0, stack=()):
        out = []
        for c in self.calls(ea):
            if c in prim:
                out.append(prim[c])
            elif c not in NOISE and depth < 3 and c not in stack:
                out += self.tokens(c, prim, depth + 1, stack + (ea,))
            if len(out) > 4 * MAX_TOKENS:
                break
        return out


# parser modules by closeness to 5.5.x Classic; a packet without a 5.5.0 parser takes the first module that has one
WPP_MODULES = ["V5_5_0_61735", "V1_60_1_69876", "V4_4_0_54481", "V3_4_0_45166", "V2_5_1_38707", "V1_13_2_31446",
               "V12_0_0_65390", "V11_0_0_55666"]


def wpp_methods(root):
    methods, parsers = {}, {}
    files = [f for mod in WPP_MODULES for f in sorted(Path(root).glob(f"WowPacketParserModule.{mod}/Parsers/*.cs"))]
    for f in files:
        src = f.read_text(encoding="utf-8", errors="replace")
        cls = f.stem
        for m in re.finditer(r"((?:\s*\[Parser\([^\]]*\)\]\s*)*)\s*public static \w+(?:<[^>]*>)? (\w+)\(\s*Packet packet[^)]*\)\s*\{", src):
            i, depth = m.end(), 1
            while depth and i < len(src):
                depth += {"{": 1, "}": -1}.get(src[i], 0)
                i += 1
            body = src[m.end():i - 1]
            methods.setdefault(m.group(2), body)
            methods.setdefault(f"{cls}.{m.group(2)}", body)
            for op in re.findall(r"Opcode\.(\w+)", m.group(1)):
                parsers.setdefault(op, body)
    return methods, parsers


def wpp_tokens(body, methods, depth=0):
    out = []
    rx = re.compile(r"packet\.(Read\w+)|(?:(\w+)\.)?(\w+)\(\s*packet\b")
    for m in rx.finditer(body):
        if m.group(1):
            for pat, tok in WPP_TOK:
                if re.fullmatch(pat, m.group(1)):
                    out += list(tok)
                    break
        elif depth < 3:
            callee = methods.get(f"{m.group(2)}.{m.group(3)}") or methods.get(m.group(3))
            if callee is not None:
                out += wpp_tokens(callee, methods, depth + 1)
    return out


def wpp_opcodes(root):
    src = (Path(root) / f"WowPacketParser/Enums/Version/{REF}/Opcodes.cs").read_text()
    res = {}
    for m in re.finditer(r"\{\s*Opcode\.((?:CMSG|SMSG)_\w+)\s*,\s*0x([0-9A-Fa-f]+)\s*\}", src):
        res[m.group(1)] = int(m.group(2), 16)
    return res


def ctor_of(client, ent):
    # SMSG: smallest function holding a vtable store; CMSG: body serializer slot
    if ent["opcode"] >> 16 <= CMSG_MAX_GROUP:
        return ent.get("writer")
    best = None
    for ref in ent.get("ctor_refs", []):
        o = ref - client.tva
        while o > 0 and not (client.tb[o - 1] == 0xCC and client.tb[o - 2] == 0xCC):
            o -= 1
        f = client.tva + o
        n = len(client.calls(f))
        if best is None or n < best[1]:
            best = (f, n)
    return best[0] if best and best[1] <= 60 else None


def align(wl, cl, score, anchors):
    # monotone alignment of WPP (name, idx) list to client idx list maximising sum(score - 0.5)
    n, m = len(wl), len(cl)
    dp = [[0.0] * (m + 1) for _ in range(n + 1)]
    bt = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        name, widx = wl[i - 1]
        for j in range(1, m + 1):
            best, how = dp[i - 1][j], 1
            if dp[i][j - 1] > best:
                best, how = dp[i][j - 1], 2
            cidx = cl[j - 1]
            if name in anchors:
                g = 1000.0 if anchors[name] == cidx else None
            elif cidx in anchors.values():
                g = None
            elif -0x20 <= cidx - widx <= 0x40:
                g = score(name, cidx) - 0.5 - 0.002 * abs(cidx - widx)  # ties: prefer the smaller shift
            else:
                g = None
            if g is not None and dp[i - 1][j - 1] + g > best:
                best, how = dp[i - 1][j - 1] + g, 3
            dp[i][j], bt[i][j] = best, how
    res, i, j = {}, n, m
    while i and j:
        if bt[i][j] == 3:
            res[wl[i - 1][0]] = cl[j - 1]
            i, j = i - 1, j - 1
        elif bt[i][j] == 1:
            i -= 1
        else:
            j -= 1
    return res


def main(dump, layouts, wpp_root, opcodes_h, overrides, outdir):
    client = Client(dump)
    ents = json.load(open(layouts))
    ctok, ctor_fn = {}, {}
    for e in ents:
        ctor_fn[e["opcode"]] = ctor_of(client, e)
    smsg_fns = [f for op, f in ctor_fn.items() if f and op >> 16 > CMSG_MAX_GROUP]
    shared = {f for f in smsg_fns if smsg_fns.count(f) > 1}
    for e in ents:
        f = ctor_fn[e["opcode"]]
        prim = CMSG_PRIM if e["opcode"] >> 16 <= CMSG_MAX_GROUP else SMSG_PRIM
        # an SMSG "ctor" shared by several packets is a dispatcher with inlined ctors, not this packet's layout
        # (CMSG serializers with identical bodies are legitimately folded into one function)
        smsg = e["opcode"] >> 16 > CMSG_MAX_GROUP
        ctok[e["opcode"]] = collapse(client.tokens(f, prim)) if f and not (smsg and f in shared) else None
    # dispatcher-inlined ctors (harvest_inline.py): case calls, or the handler if the case only keeps the raw payload
    ipath = Path(layouts).with_name("inline.json")
    for op, r in (json.load(open(ipath)).items() if ipath.exists() else []):
        op = int(op, 16)
        if ctok.get(op):
            continue
        t = []
        for c in r["calls"]:
            if c in SMSG_PRIM:
                t.append(SMSG_PRIM[c])
            elif c not in NOISE:
                t += client.tokens(c, SMSG_PRIM, 1)
        t = collapse(t)
        if t == "S" and len(r["handlers"]) == 1:
            t = collapse(client.tokens(r["handlers"][0], SMSG_PRIM)) or "S"
        ctok[op] = t or None
    # ctors that only keep the raw payload ("S") are parsed by their handler (harvest_handlers.py)
    hpath = Path(layouts).with_name("handlers.json")
    for op, h in (json.load(open(hpath)).items() if hpath.exists() else []):
        op = int(op, 16)
        if ctok.get(op) == "S" and len(h["handlers"]) == 1:
            t = collapse(client.tokens(h["handlers"][0], SMSG_PRIM))
            ctok[op] = t or "S"
    methods, parsers = wpp_methods(wpp_root)
    wops = wpp_opcodes(wpp_root)
    wtok = {n: collapse(wpp_tokens(parsers[n], methods)) if n in parsers else None for n in wops}

    def score(name, cop):
        a, b = wtok.get(name), ctok.get(cop)
        if a is None or b is None or b == "S":
            return 0.55  # no parser / unresolved ctor / raw payload left to the handler: positional evidence only
        if not a and not b:
            return 0.6
        return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()

    ov = json.load(open(overrides))
    anchors = dict(ov.get("names", {}))
    anchors.update({k: v for k, v in ov.items() if isinstance(v, int)})

    cgroups = {}
    for op in ctok:
        cgroups.setdefault(op >> 16, []).append(op & 0xFFFF)
    wgroups = {}
    for n, v in wops.items():
        wgroups.setdefault((n[:4], v >> 16), []).append((n, v & 0xFFFF))

    # group map: verified pairs from overrides stay fixed; the rest are assigned one-to-one by alignment gain
    gmo = ov.get("groupMap", {}).get(REF, {})
    fixed = {(d, int(w, 16)): int(c, 16) for d, gm in gmo.items() if isinstance(gm, dict) for w, c in gm.items()}
    cand = []
    for (d, wg), wl in sorted(wgroups.items()):
        wl.sort(key=lambda x: x[1])
        for cg, cl in cgroups.items():
            if (cg <= CMSG_MAX_GROUP) != (d == "CMSG"):
                continue
            if (d, wg) in fixed and fixed[(d, wg)] != cg:
                continue
            loc_anchor = {k: v & 0xFFFF for k, v in anchors.items() if v >> 16 == cg and k.startswith(d)}
            sc = lambda n, ci, cg=cg: score(n, (cg << 16) | ci)
            a = align(wl, sorted(cl), sc, loc_anchor)
            gain = sum(sc(n, ci) - 0.5 for n, ci in a.items())
            cand.append((1e9 if (d, wg) in fixed else gain, d, wg, cg, a))
    gmap, result, used_w, used_c = {}, {}, set(), set()
    for gain, d, wg, cg, a in sorted(cand, key=lambda x: -x[0]):
        if (d, wg) in used_w or cg in used_c or gain <= 0:
            continue
        used_w.add((d, wg))
        used_c.add(cg)
        gmap[f"{d}:{wg:#x}"] = f"{cg:#x}" + ("" if gain >= 1e9 else f" (gain {gain:.1f})")
        for n, ci in a.items():
            op = (cg << 16) | ci
            result[n] = {"value": op, "score": round(score(n, op), 3), "wpp": wops[n],
                         "wppTokens": wtok.get(n), "clientTokens": ctok.get(op), "anchor": n in anchors}

    # resolve collisions between WPP groups mapped onto the same client group: keep the higher score
    byop = {}
    for n, r in sorted(result.items(), key=lambda x: -x[1]["score"]):
        if r["value"] in byop and not r["anchor"]:
            r["collision"] = byop[r["value"]]
            continue
        byop.setdefault(r["value"], n)
    for r in result.values():
        if "collision" in r:
            continue
        a, ct = r["wppTokens"], r["clientTokens"]
        informative = a and ct and len(a) >= 3
        r["confidence"] = ("verified" if r["anchor"] else "high" if informative and r["score"] >= 0.85
                           else "medium" if r["score"] >= 0.7 else "low")

    cur = {m.group(1): int(m.group(2), 16) for m in
           re.finditer(r"^\s+((?:CMSG|SMSG)_\w+)\s*=\s*0x([0-9A-Fa-f]+)", Path(opcodes_h).read_text(), re.M)}
    Path(outdir).mkdir(parents=True, exist_ok=True)
    json.dump({"groupMap": gmap, "names": result, "clientTokens": {hex(k): v for k, v in ctok.items()}},
              open(Path(outdir) / f"audit.{REF}.json", "w"), indent=1)
    diffs = []
    for n, r in sorted(result.items()):
        if "collision" in r:
            continue
        if cur.get(n) != r["value"]:
            diffs.append((n, cur.get(n), r))
    with open(Path(outdir) / f"audit-diff.{REF}.md", "w") as f:
        f.write("| Name | Opcodes.h | Audit | Confidence | Score | WPP tokens | Client tokens |\n|---|---|---|---|---|---|---|\n")
        for n, c, r in diffs:
            f.write(f"| {n} | {hex(c) if c is not None else '-'} | {r['value']:#x} | {r['confidence']} | {r['score']} | "
                    f"`{r['wppTokens']}` | `{r['clientTokens']}` |\n")
    conf = {}
    for r in result.values():
        conf[r.get("confidence", "collision")] = conf.get(r.get("confidence", "collision"), 0) + 1
    print("groups:", gmap)
    print("named:", len(result), conf, "diffs vs Opcodes.h:", len(diffs))


if __name__ == "__main__":
    main(*sys.argv[1:7])
