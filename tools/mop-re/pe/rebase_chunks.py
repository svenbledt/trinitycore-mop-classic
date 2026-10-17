# Re-address verifier chunks and open slots to another build whose opcode values were proven identical (diff_builds.py).
# Usage: py -3.12 rebase_chunks.py <new harvest dir> <in chunk/open-slots json> <out json>
import json, os, sys


def main(hdir, src, out):
    lay = {e["opcode"]: e for e in json.load(open(f"{hdir}/layouts.json"))}
    hand = {int(k, 16): v["handlers"] for k, v in json.load(open(f"{hdir}/handlers.json")).items()}
    inl = {int(k, 16): v for k, v in json.load(open(f"{hdir}/inline.json")).items()}

    def addrs(slot):
        op = int(slot, 16)
        e, i = lay.get(op, {}), inl.get(op, {})
        return {"ctor": hex(e["ctor"]) if e.get("ctor") else None,
                "writer": hex(e["writer"]) if e.get("writer") else None,
                "handlers": [hex(x) for x in hand.get(op, []) or i.get("handlers", [])],
                "dispatcherCase": hex(i["ref"]) if i else None}

    items = json.load(open(src))
    for it in items:
        if "slots" in it:
            for slot, info in it["slots"].items():
                info.update(addrs(slot))
        else:
            it.update(addrs(it["slot"]))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(items, open(out, "w"), indent=1)
    print(len(items), "items ->", out)


if __name__ == "__main__":
    main(*sys.argv[1:4])
