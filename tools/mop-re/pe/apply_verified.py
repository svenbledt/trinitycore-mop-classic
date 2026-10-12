# Fold verifier results (verify/AGENT.md) into overrides/<build>.json as anchors with their evidence, and collect
# client layout differences for the server writers. Usage: py -3.12 apply_verified.py <results dir> <overrides.json> <diffs.md>
import json, sys
from pathlib import Path


def main(rdir, overrides, diffs_md):
    ov = json.load(open(overrides))
    ev = ov.setdefault("evidence", {})
    anchors = {k: v for k, v in ov.items() if isinstance(v, int)}
    res = [r for f in sorted(Path(rdir).glob("*.json")) for r in json.load(open(f))]
    proven = {}
    for r in res:
        if r.get("verdict") == "proven" and r.get("value"):
            proven.setdefault(r["name"], set()).add(int(r["value"], 16))
    byval, problems = {}, []
    for n, vs in proven.items():
        if len(vs) > 1:
            problems.append(f"{n}: proven at several values {sorted(map(hex, vs))}")
            continue
        byval.setdefault(next(iter(vs)), []).append(n)
    taken = {v: n for n, v in anchors.items()}
    added = 0
    for v, ns in sorted(byval.items()):
        if len(ns) > 1:
            problems.append(f"{v:#x}: proven for several names {ns}")
            continue
        n = ns[0]
        if n in anchors and anchors[n] != v:
            problems.append(f"{n}: proven {v:#x} but anchored {anchors[n]:#x}")
            continue
        if v in taken and taken[v] != n:
            problems.append(f"{v:#x}: proven for {n} but anchored to {taken[v]}")
            continue
        if n not in anchors:
            ov[n] = v
            added += 1
        r = next(x for x in res if x["name"] == n and x.get("verdict") == "proven")
        ev[n] = r["evidence"]
    keys = sorted(k for k in ov if isinstance(ov[k], int))
    out = {"_comment": ov["_comment"], **{k: ov[k] for k in keys}, "groupMap": ov["groupMap"],
           "evidence": dict(sorted(ev.items()))}
    json.dump(out, open(overrides, "w"), indent=2)
    open(overrides, "a").write("\n")
    with open(diffs_md, "w") as f:
        f.write("| Packet | Value | Client layout | Differences vs TrinityCore |\n|---|---|---|---|\n")
        for r in sorted(res, key=lambda x: x["name"]):
            if r.get("verdict") == "proven" and r.get("layoutDiff"):
                f.write(f"| {r['name']} | {r['value']} | {r.get('clientLayout', '')} | {r['layoutDiff']} |\n")
    verdicts = {}
    for r in res:
        verdicts[r.get("verdict")] = verdicts.get(r.get("verdict"), 0) + 1
    print("results", len(res), verdicts, "new anchors", added)
    for p in problems:
        print("  CONFLICT", p)


if __name__ == "__main__":
    main(*sys.argv[1:4])
