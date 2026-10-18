# Layout check: tokenize TrinityCore packet Write()/Read() bodies into the client token alphabet (audit_opcodes.py) and
# compare them with the client's (de)serializer per opcode. Heuristic screen; every mismatch is reviewed against client
# code before the server is changed. Usage: py -3.12 tc_layouts.py <repo> <audit.json with clientTokens> <out.json>
import difflib, json, re, sys
from pathlib import Path

MAX_TOKENS = 40
SCALAR = {
    "uint8": "B", "int8": "B", "bool": "B", "char": "B",
    "uint16": "H", "int16": "H",
    "uint32": "I", "int32": "I", "float": "I", "Seconds": "I", "Milliseconds": "I",
    "uint64": "Q", "int64": "Q", "time_t": "Q", "Timestamp": "Q", "double": "Q",
    "ObjectGuid": "G", "std::string": "S", "std::string_view": "S",
    "TaggedPosition<Position::XYZ>": "III", "TaggedPosition<Position::XYZO>": "IIII", "TaggedPosition<Position::XY>": "II",
    "Position": "IIII", "G3D::Vector3": "III", "Vector3": "III", "Vector2": "II",
}


def strip_comments(s):
    return re.sub(r"//[^\n]*|/\*.*?\*/", "", s, flags=re.S)


def bodies(src, head_rx):
    # yield (match, body) for every function whose signature matches head_rx
    for m in re.finditer(head_rx, src):
        i, depth = m.end(), 1
        while depth and i < len(src):
            depth += {"{": 1, "}": -1}.get(src[i], 0)
            i += 1
        yield m, src[m.end():i - 1]


def collect(repo):
    pk = Path(repo) / "src/server/game/Server/Packets"
    hdr = "\n".join(strip_comments(p.read_text(errors="replace")) for p in sorted(pk.glob("*.h")))
    cpp = "\n".join(strip_comments(p.read_text(errors="replace")) for p in sorted(pk.glob("*.cpp")))
    # class/struct members: name -> type, per class
    members, opcode_of = {}, {}
    for m, body in bodies(hdr, r"(?:class|struct)\s+(\w+)(?:\s+final)?(?:\s*:\s*public\s+[\w:]+)?\s*\{"):
        cls = m.group(1)
        mem = members.setdefault(cls, {})
        for mm in re.finditer(r"^\s*((?:std::)?[\w:]+(?:<[^;{}()]*>)?)\s+(\w+)(?:\s*=\s*[^;]+|\s*\{[^;]*\})?\s*;", body, re.M):
            t, n = mm.group(1), mm.group(2)
            if t not in ("return", "using", "typedef", "friend"):
                mem[n] = t
        for mm in re.finditer(r"\b(?:Server|Client)Packet\(\s*((?:SMSG|CMSG)_\w+)", body):
            opcode_of.setdefault(mm.group(1), cls)
    writes = {m.group(1).split("::")[-1]: b for m, b in bodies(cpp, r"WorldPacket const\*\s+([\w:]+)::Write\(\)\s*\{")}
    reads = {m.group(1).split("::")[-1]: b for m, b in bodies(cpp, r"void\s+([\w:]+)::Read\(\)\s*\{")}
    ops_w = {re.sub(r"\s+", "", m.group(1)).split("::")[-1]: (m.group(2), b) for m, b in bodies(
        cpp, r"ByteBuffer&\s*operator<<\(ByteBuffer&\s*\w+,\s*(?:WorldPackets::)?([\w:<>]+)\s+const&\s*(\w+)\)\s*\{")}
    ops_r = {re.sub(r"\s+", "", m.group(1)).split("::")[-1]: (m.group(2), b) for m, b in bodies(
        cpp, r"ByteBuffer&\s*operator>>\(ByteBuffer&\s*\w+,\s*(?:WorldPackets::)?([\w:<>]+)&\s*(\w+)\)\s*\{")}
    return members, opcode_of, writes, reads, ops_w, ops_r


class Tok:
    def __init__(self, members, ops):
        self.members, self.ops = members, ops

    def type_tokens(self, t, depth):
        t = t.replace("const", "").replace("&", "").strip()
        t = re.sub(r"^(?:WorldPackets::)?(?:\w+::)*(?=\w+$)", "", t) if "<" not in t else t
        if t in SCALAR:
            return SCALAR[t]
        if re.fullmatch(r"u?int(8|16|32|64)", t):
            return SCALAR[t]
        t = re.sub(r"^WorldPackets::", "", t)
        if t == "WowTime":
            return "I"
        m = re.fullmatch(r"Timestamp<\s*(\w*)\s*>", t)
        if m:
            return SCALAR.get(m.group(1) or "int64", "Q")
        m = re.fullmatch(r"Duration<[\w:]+\s*(?:,\s*(\w+))?\s*>", t)
        if m:
            return SCALAR.get(m.group(1) or "int64", "Q")
        m = re.fullmatch(r"(?:std::)?(?:Optional|optional|unique_ptr)<(.+)>", t)
        if m:
            return "B" + self.type_tokens(m.group(1), depth)  # presence bit (heuristic)
        m = re.fullmatch(r"(?:std::)?(?:vector|Array|array)<([^,>]+(?:<[^>]*>)?)[^>]*>", t)
        if m:
            return self.type_tokens(m.group(1), depth)
        base = t.split("::")[-1]
        if base in self.ops and depth < 4:
            var, body = self.ops[base]
            return self.body(body, base, depth + 1, var)
        return "?"

    def expr_tokens(self, e, cls, depth, var, scope):
        e = e.strip().rstrip(";").strip()
        if not e:
            return ""
        e = re.sub(r"\.(?:emplace|value|get)\(\)", "", e)
        m = re.match(r"(?:Bits<\d+>|BitsSize<\d+>|OptionalInit|PtrInit|SizedString::BitsSize<\d+>|SizedCString::BitsSize<\d+>)\(", e)
        if m:
            return "B"
        m = re.match(r"Size<(\w+)>\(", e)
        if m:
            return SCALAR.get(m.group(1), "I")
        if e.endswith("PositionXYZOStream()"):
            return "IIII"
        if e.endswith("PositionXYZStream()"):
            return "III"
        if re.match(r"(?:SizedString|SizedCString)::Data\(", e):
            return "S"
        m = re.match(r"(?:static_cast<)?(u?int(?:8|16|32|64)|float|bool|double)>?\(", e)
        if m:
            return SCALAR[m.group(1)]
        m = re.match(r"As<(u?int(?:8|16|32|64))>\(", e)
        if m:
            return SCALAR[m.group(1)]
        # member access: Foo, var.Foo, Foo.Bar, *Opt
        e2 = e.lstrip("*").strip()
        parts = [p for p in re.split(r"\.|->", e2) if p]
        if not parts:
            return "?"
        head = parts[0]
        t = scope.get(head)
        if t is None:
            t = self.members.get(cls, {}).get(head)
        if t is None:
            return "?"
        for p in parts[1:]:
            base = re.sub(r"<.*", "", t.replace("const", "").replace("&", "").strip()).split("::")[-1]
            m = re.fullmatch(r"(?:std::)?(?:Optional|optional)<(.+)>", t.strip())
            if m:
                base = m.group(1).split("::")[-1]
            t = self.members.get(base, {}).get(p)
            if t is None:
                return "?"
        if e.startswith("*"):
            m = re.fullmatch(r"(?:std::)?(?:Optional|optional)<(.+)>", t.strip())
            if m:
                return self.type_tokens(m.group(1), depth)
        return self.type_tokens(t, depth)

    def body(self, body, cls, depth=0, var=None):
        out = []
        scope = {}
        if var:
            scope[var] = cls
        body = body.replace("->", ".")
        for dm in re.finditer(r"(?:^|[;{}(])\s*((?:std::)?[A-Za-z_][\w:]*(?:<[^;{}()]*>)?)\s+(\w+)\s*(?:=[^;]*)?;", body):
            if dm.group(1) not in ("return", "else", "delete", "case", "goto"):
                scope.setdefault(dm.group(2), dm.group(1))
        for line in body.split(";"):
            for fm in re.finditer(r"for\s*\(\s*(?:const\s+)?([\w:<>]+|auto)\s*(?:const)?\s*&?\s*(\w+)\s*:\s*([^)]+)\)", line):
                t, n, cont = fm.group(1), fm.group(2), fm.group(3).strip()
                if t == "auto":
                    ct = self.expr_type(cont, cls, scope)
                    m = re.search(r"<([^,>]+(?:<[^>]*>)?)", ct or "")
                    t = m.group(1) if m else "?"
                scope[n] = t
            if re.search(r"\bWriteBits?\(|\bReadBits?\(|\bReadBit\(|\bFlushBits\(|\bResetBitPos\(", line):
                out.append("B")
            if re.search(r"\b(?:WriteString|ReadString|append)\(", line):
                out.append("S")
            for chain in re.findall(r"(?:_worldPacket|data|\w+)\s*((?:(?:<<|>>)[^<>;]*(?:<[^<>;]*>[^<>;]*)*)+)", line):
                for operand in re.split(r"<<|>>", chain)[1:]:
                    out.append(self.expr_tokens(operand, cls, depth, var, scope))
        return "".join(out)

    def expr_type(self, e, cls, scope):
        parts = [p for p in re.split(r"\.|->", e.strip()) if p]
        t = scope.get(parts[0]) or self.members.get(cls, {}).get(parts[0])
        for p in parts[1:]:
            if t is None:
                return None
            t = self.members.get(t.split("::")[-1], {}).get(p)
        return t


def collapse(seq):
    out = []
    for t in seq:
        t = "B" if t == "b" else t
        if t == "B" and out and out[-1] == "B":
            continue
        out.append(t)
    return "".join(out[:MAX_TOKENS])


def opcode_values(repo):
    src = (Path(repo) / "src/server/game/Server/Protocol/Opcodes.h").read_text()
    vals = {}
    for m in re.finditer(r"\b((?:CMSG|SMSG)_\w+)\s*=\s*0x([0-9A-Fa-f]+)\s*,?\s*(//[^\n]*)?", src):
        vals[m.group(1)] = (int(m.group(2), 16), bool(m.group(3) and "TODO" in m.group(3)))
    return vals


def main(repo, audit, out):
    members, opcode_of, writes, reads, ops_w, ops_r = collect(repo)
    ctok = json.load(open(audit))["clientTokens"]
    vals = opcode_values(repo)
    tw, tr = Tok(members, ops_w), Tok(members, ops_r)
    res = []
    for name, cls in sorted(opcode_of.items()):
        if name not in vals:
            continue
        v, todo = vals[name]
        body = writes.get(cls) if name.startswith("SMSG") else reads.get(cls)
        if body is None:
            continue
        raw = (tw if name.startswith("SMSG") else tr).body(body, cls)
        tc = collapse(list(raw))
        cl = ctok.get(hex(v))
        if cl is None or cl == "" or set(cl) <= {"S"}:
            status = "no-client-layout"
        elif "?" in tc:
            status = "unparsed"
        elif tc == cl:
            status = "match"
        else:
            status = "diff"
        res.append({"name": name, "value": hex(v), "todo": todo, "class": cls, "tc": tc, "client": cl, "status": status,
                    "ratio": round(difflib.SequenceMatcher(None, tc, cl or "").ratio(), 2)})
    json.dump(res, open(out, "w"), indent=1)
    from collections import Counter
    print(Counter((r["status"], r["todo"]) for r in res))


if __name__ == "__main__":
    main(*sys.argv[1:4])
