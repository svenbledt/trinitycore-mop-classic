# Convert audit.json into the MatchResult shape src/gen_opcodes.ts consumes.
# Usage: py -3.12 audit_to_match.py <audit.json> <getters.json> <old match.json> <Opcodes.h> <out match.json> <overrides.json>
import json, re, sys

def main(audit, getters, old, opcodes_h, out, overrides):
    names = json.load(open(audit))["names"]
    ov = json.load(open(overrides))
    anchors = {k: v for k, v in {**ov.get("names", {}), **ov}.items() if isinstance(v, int)}
    client = {g["opcode"] for g in json.load(open(getters))}
    oldm = json.load(open(old))
    cur = {m.group(1): int(m.group(2), 16) for m in
           re.finditer(r"^\s+((?:CMSG|SMSG)_\w+)\s*=\s*0x([0-9A-Fa-f]+)", open(opcodes_h).read(), re.M)}
    matched, taken = [], {}
    # hand-verified values always win (some, like the connection group, have no getter to harvest)
    for n, v in sorted(anchors.items()):
        matched.append({"name": n, "value": v, "dir": n[:4], "confidence": "high"})
        taken[v] = n
    # solid names claim their slots before low-confidence guesses
    for n, r in sorted(names.items(), key=lambda x: (x[1].get("confidence") not in ("verified", "high"), x[0])):
        if n in anchors or r["value"] in taken:
            continue
        # merge_audits.py: high = exact layout, or both orderings/brackets backed by the layout (unverified SMSGs are not sent)
        conf = "high" if r.get("confidence") in ("verified", "high") else "low"
        matched.append({"name": n, "value": r["value"], "dir": n[:4], "confidence": conf})
        taken[r["value"]] = n
    kept = dropped = 0
    for n, v in sorted(cur.items()):
        if n in names or n in anchors:
            continue
        if v in client and v not in taken:
            matched.append({"name": n, "value": v, "dir": n[:4], "confidence": "low"})
            taken[v] = n
            kept += 1
        else:
            dropped += 1
    extra = {c["value"] for c in oldm.get("unmatchedClient", [])} | client
    unmatched = [{"dir": "CMSG" if v >> 16 <= 0x45 else "SMSG", "value": v} for v in sorted(extra - set(taken))]
    json.dump({"matched": matched, "unmatchedClient": unmatched, "absent": []}, open(out, "w"), indent=0)
    print(f"matched {len(matched)} (kept {kept} unplaced old values, dropped {dropped}); unmatched client {len(unmatched)}")

if __name__ == "__main__":
    main(*sys.argv[1:7])
