# Merge the per-reference audits (audit_opcodes.py with MOP_REF=...) into audit.json + a verification worklist.
# A value is solid if anchored, an exact informative layout match, or placed identically by both references with a
# non-contradicting layout. Usage: py -3.12 merge_audits.py <harvest dir> <ref1> <ref2>
import difflib, functools, json, re, sys
from pathlib import Path


def ok(r):
    return r is not None and "collision" not in r


def exact(r):
    return ok(r) and r.get("confidence") == "high" and r["score"] >= 0.999


def contradicts(r):
    return bool(r["wppTokens"]) and bool(r["clientTokens"]) and len(r["wppTokens"]) >= 3 and r["score"] < 0.85


@functools.cache
def client_ops(h):
    return frozenset(g["opcode"] for g in json.load(open(h / "getters.json")))


@functools.cache
def ref_table(ref):
    src = Path(f"refs/wpp/WowPacketParser/Enums/Version/{ref}/Opcodes.cs").read_text()
    return {m.group(1): int(m.group(2), 16) for m in
            re.finditer(r"\{\s*Opcode\.((?:CMSG|SMSG)_\w+)\s*,\s*0x([0-9A-Fa-f]+)\s*\}", src)}


def bracket_spans(h, refs, gmaps, names, solid_ev):
    # yields (name, client value) for every reference name inside a one-to-one bracket of solid names
    client = client_ops(h)
    for ref, gm in zip(refs, gmaps):
        W = ref_table(ref)
        for key, cg in gm.items():
            d, wg = key.split(":")
            wg, cg = int(wg, 16), int(cg.split()[0], 16)
            ws = sorted((v & 0xFFFF, n) for n, v in W.items() if n[:4] == d and v >> 16 == wg)
            solid = [(wi, n, names[n]["value"] & 0xFFFF) for wi, n in ws
                     if n in names and names[n]["evidence"] in solid_ev and names[n]["value"] >> 16 == cg]
            for (w0, _, c0), (w1, _, c1) in zip(solid, solid[1:]):
                if c0 - w0 != c1 - w1:
                    continue
                inner_w = [(wi, n) for wi, n in ws if w0 < wi < w1]
                inner_c = sorted(o & 0xFFFF for o in client if o >> 16 == cg and c0 < (o & 0xFFFF) < c1)
                if [wi + c0 - w0 for wi, _ in inner_w] == inner_c:
                    for wi, n in inner_w:
                        yield n, (cg << 16) | (wi + c0 - w0)


def bracket(h, refs, gmaps, names, work, ctok):
    # Between two solid names with the same index shift, if the reference's indices and the client's indices pair
    # one-to-one (no gaps either side), order alone fixes every value in between. Iterates to a fixpoint.
    done, conflict = set(), set()
    while True:
        proven = {}
        for n, v in bracket_spans(h, refs, gmaps, names, ("anchor", "exact", "agree", "bracket")):
            if n in names:
                proven.setdefault(n, set()).add(v)
        new = 0
        for n, vs in proven.items():
            r = names[n]
            if len(vs) > 1 or (r["evidence"] in ("exact", "agree") and r["value"] not in vs):
                if r["evidence"] != "anchor" and n not in conflict:
                    conflict.add(n)  # order and layout disagree (short layouts are ambiguous): needs the client
                    r.update(confidence="low", evidence=None, alt=sorted(set(r["alt"]) | vs | {r["value"]}))
                    work.append({"name": n, "candidates": sorted(hex(x) for x in set(r["alt"])), "conflict": "bracket"})
                continue
            if r["evidence"] or n in conflict or r.get("conflict"):
                continue
            v = next(iter(vs))
            if v != r["value"]:  # re-score the layout at the slot the order proves
                ct = ctok.get(hex(v))
                r.update(clientTokens=ct, score=0.55 if not r.get("wppTokens") or not ct or ct == "S" else round(
                    difflib.SequenceMatcher(None, r["wppTokens"], ct, autojunk=False).ratio(), 3))
            r.update(value=v, confidence="high", evidence="bracket")
            done.add(n)
            new += 1
        if not new:
            break
    work[:] = [w for w in work if w["name"] not in done]


def selfcheck(h, refs, gmaps, names):
    # leave-one-out: brackets built from the other solid names must reproduce each solid value
    proven = {n: r for n, r in names.items() if r["evidence"] in ("anchor", "exact", "agree")}
    ok, bad = 0, {}
    for n in proven:
        held = {k: r for k, r in proven.items() if k != n}
        for m, v in bracket_spans(h, refs, gmaps, held, ("anchor", "exact", "agree")):
            if m == n:
                if v == names[n]["value"]:
                    ok += 1
                else:
                    bad.setdefault(n, set()).add(v)
    return ok, bad


def main(hdir, ref1, ref2):
    h = Path(hdir)
    A, B = (json.load(open(h / f"audit.{r}.json")) for r in (ref1, ref2))
    a, b = A["names"], B["names"]
    ctok = {**B["clientTokens"], **A["clientTokens"]}
    names, work = {}, []
    for n in sorted(set(a) | set(b)):
        ra, rb = a.get(n), b.get(n)
        cands = [r for r in (ra, rb) if ok(r)]
        if not cands:
            continue
        solid = next((r for r in cands if r.get("confidence") == "verified"), None) or next(
            (r for r in cands if exact(r)), None)
        why = "anchor" if solid and solid.get("confidence") == "verified" else "exact" if solid else None
        if not solid and ok(ra) and ok(rb) and ra["value"] == rb["value"] and not contradicts(ra):
            # both references put it here; with no layout on either side that is position only: handler check needed
            solid, why = ra, "agree" if ra["score"] != 0.55 else None
        if solid and any(r["value"] != solid["value"] and exact(r) for r in cands):
            solid, why = None, None  # two exact matches disagree
        best = solid or max(cands, key=lambda r: r["score"])
        names[n] = dict(best, confidence="verified" if why == "anchor" else "high" if why else "low", evidence=why,
                        alt=sorted({r["value"] for r in cands} - {best["value"]}))
        if not why:
            work.append({"name": n, "candidates": sorted({hex(r["value"]) for r in cands} | {hex(best["value"])}),
                         "refs": {ref1: ra and ra["wpp"], ref2: rb and rb["wpp"]},
                         "wppTokens": best["wppTokens"], "clientTokens": best["clientTokens"]})
    n_ok, bad = selfcheck(h, (ref1, ref2), (A["groupMap"], B["groupMap"]), names)
    print(f"leave-one-out bracket check: reproduced {n_ok}, contradicted {len(bad)}")
    for n, vs in sorted(bad.items()):
        r = names[n]
        print(f"  {n}: {r['evidence']} {r['value']:#x} vs order {[hex(v) for v in vs]}")
        if r["evidence"] == "anchor":
            continue  # hand-verified; the reference order is what changed
        r.update(confidence="low", evidence=None, alt=sorted(set(r["alt"]) | vs), conflict=True)
        work.append({"name": n, "candidates": sorted(hex(x) for x in set(r["alt"]) | {r["value"]}), "conflict": "order"})
    bracket(h, (ref1, ref2), (A["groupMap"], B["groupMap"]), names, work, ctok)
    # order evidence (agree/bracket) is solid only when the client layout supports it too; otherwise needs the client
    for n, r in names.items():
        if r["evidence"] in ("agree", "bracket"):
            ct = r.get("clientTokens")
            if not ct or ct == "S" or r["score"] < 0.85 or r.get("layoutChanged"):
                r["confidence"] = "low"
                work.append({"name": n, "candidates": [hex(r["value"])], "orderOnly": r["evidence"]})
    # the same client slot may be claimed solid by two names: demote both
    seen = {}
    for n, r in names.items():
        if r["confidence"] != "low":
            seen.setdefault(r["value"], []).append(n)
    for v, ns in seen.items():
        if len(ns) > 1:
            for n in ns:
                if names[n]["evidence"] != "anchor":
                    names[n].update(confidence="low")
                    work.append({"name": n, "candidates": [hex(v)], "clash": ns})
    json.dump({"groupMap": {ref1: A["groupMap"], ref2: B["groupMap"]}, "names": names, "clientTokens": ctok},
              open(h / "audit.json", "w"), indent=1)
    lay = {e["opcode"]: e for e in json.load(open(h / "layouts.json"))}
    hand = {int(k, 16): v["handlers"] for k, v in json.load(open(h / "handlers.json")).items()}
    inl = {int(k, 16): v for k, v in json.load(open(h / "inline.json")).items()}
    for w in work:
        w["slots"] = {}
        for c in w["candidates"]:
            op = int(c, 16)
            e, i = lay.get(op, {}), inl.get(op, {})
            w["slots"][c] = {"ctor": hex(e["ctor"]) if e.get("ctor") else None,
                             "writer": hex(e["writer"]) if e.get("writer") else None,
                             "handlers": [hex(x) for x in hand.get(op, []) or i.get("handlers", [])],
                             "dispatcherCase": hex(i["ref"]) if i else None, "clientTokens": ctok.get(c),
                             "claimedBy": [m for m, r in names.items() if r["value"] == op and r["evidence"]]}
    json.dump(work, open(h / "worklist.json", "w"), indent=1)
    ev = {}
    for r in names.values():
        k = f"{r['evidence']}"
        ev[k] = ev.get(k, 0) + 1
    print("names", len(names), ev, "worklist", len(work))


if __name__ == "__main__":
    main(*sys.argv[1:4])
