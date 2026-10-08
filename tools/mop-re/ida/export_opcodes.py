# Export the opcode values a client build handles (SMSG) and sends (CMSG). Read-only idalib script.
# Method and per-build anchors: docs/mop-port/re-notes.md "Opcode tables". Usage: python export_opcodes.py <i64> <out.json>
import json, sys, collections
import idapro

CMSG_MAX_GROUP = 0x45  # TODO(verify) per build: groups above this are server->client
PUT32 = 0x142E4D5B0    # 70032 CDataStore put uint32; re-locate per build


def group_base(idc, ea):
    m = idc.print_insn_mnem(ea)
    if m not in ("lea", "add", "sub"):
        return None
    for n in (1, 2):
        if idc.get_operand_type(ea, n) in (idc.o_imm, idc.o_displ):
            v = idc.get_operand_value(ea, n) & 0xFFFFFFFF
            cand = v if m == "sub" else (-v) & 0xFFFFFFFF
            if cand & 0xFFFF == 0 and 0x2C <= (cand >> 16) <= 0x60:
                return cand >> 16
    return None


def main(idb, out):
    idapro.open_database(idb, run_auto_analysis=False)
    import idc, idautils, ida_funcs, ida_segment, ida_nalt, ida_xref

    text = ida_segment.get_segm_by_name(".text")
    found = collections.defaultdict(set)   # group -> opcode indices
    sites = collections.defaultdict(set)   # group -> evidence EAs
    ranges = collections.defaultdict(set)  # group -> N from "cmp reg, N-1" range checks
    ea = text.start_ea
    while ea < text.end_ea and ea != idc.BADADDR:
        base = group_base(idc, ea)
        if base is not None:
            nxt = ea
            seen_cmp = False
            for _ in range(20):
                nxt = idc.next_head(nxt, text.end_ea)
                if not seen_cmp and idc.print_insn_mnem(nxt) == "cmp" and idc.get_operand_type(nxt, 1) == idc.o_imm:
                    ranges[base].add(idc.get_operand_value(nxt, 1) + 1)
                    seen_cmp = True
                si = ida_nalt.get_switch_info(nxt)
                if si is None:
                    continue
                cases = ida_xref.calc_switch_cases(nxt, si)
                lo = base << 16
                for i in range(len(cases.cases) if cases else 0):
                    if cases.targets[i] == si.defjump:
                        continue
                    for c in cases.cases[i]:
                        c &= 0xFFFFFFFF
                        idx = c - lo if lo <= c < lo + 0x1000 else c
                        if 0 <= idx < 0x1000:
                            found[base].add(idx)
                sites[base].add(nxt)
                break
        ea = idc.next_head(ea, text.end_ea)

    # SMSG groups dispatched by range check without a jump table are dense: take 0..N-1.
    for g, ns in ranges.items():
        if g > CMSG_MAX_GROUP and g not in found:
            found[g].update(range(min(n for n in ns if n < 0x1000)))
            sites[g].add(0)

    # CMSG serializers start with a 32-bit write of their opcode immediate.
    for x in idautils.CodeRefsTo(PUT32, 0):
        f = ida_funcs.get_func(x)
        if not f:
            continue
        first = next((e for e in idautils.FuncItems(f.start_ea) if idc.print_insn_mnem(e) == "call"), None)
        if first != x:
            continue
        p = x
        for _ in range(8):
            p = idc.prev_head(p)
            mn = idc.print_insn_mnem(p)
            if mn == "call":
                break
            if mn == "mov" and idc.print_operand(p, 0) in ("edx", "rdx") and idc.get_operand_type(p, 1) == idc.o_imm:
                v = idc.get_operand_value(p, 1) & 0xFFFFFFFF
                if 0x2C <= (v >> 16) <= CMSG_MAX_GROUP and (v & 0xFFFF) < 0x1000:
                    found[v >> 16].add(v & 0xFFFF)
                    sites[v >> 16].add(f.start_ea)
                break

    rows = []
    for g, idxs in sorted(found.items()):
        d = "CMSG" if g <= CMSG_MAX_GROUP else "SMSG"
        for i in sorted(idxs):
            rows.append({"dir": d, "value": (g << 16) | i, "rva": hex(min(sites[g])), "size_hint": None})
    json.dump(rows, open(out, "w"), indent=1)
    print("exported", len(rows), "values in", len(found), "groups")
    for g in sorted(found):
        print(hex(g), len(found[g]), "max", max(found[g]) + 1, "range", sorted(ranges.get(g, []))[:3])
    idapro.close_database(save=False)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
