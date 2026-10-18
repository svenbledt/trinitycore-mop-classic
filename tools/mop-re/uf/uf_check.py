# Compare TrinityCore UpdateFields.cpp (WriteCreate/WriteUpdate) with a WowPacketParser UpdateFieldsHandler<ver>.cs
# (ReadCreate/ReadUpdate). Both come from the same generator; each function is normalized to one token per statement
# (field + width, mask tests and bit counts, loops, visibility flags, nested structs, sizes) and the lists are diffed.
# Usage: py -3.12 uf_check.py <UpdateFields.cpp> <UpdateFieldsHandlerX.cs> [Struct ...] [--show]
import difflib, re, sys
from pathlib import Path

CS_W = {"Int8": "8", "UInt8": "8", "Byte": "8", "SByte": "8", "Int16": "16", "UInt16": "16", "Int32": "32",
        "UInt32": "32", "Single": "f", "Int64": "64", "UInt64": "64", "PackedGuid128": "G", "Vector2": "v2",
        "Vector3": "v3", "Quaternion": "q", "Bit": "BIT"}
CPP_W = {"int8": "8", "uint8": "8", "bool": "BIT", "int16": "16", "uint16": "16", "int32": "32", "uint32": "32",
         "float": "f", "int64": "64", "uint64": "64", "ObjectGuid": "G", "TaggedPosition<Position::XY>": "v2",
         "TaggedPosition<Position::XYZ>": "v3", "QuaternionData": "q", "WowTime": "32"}


def functions(src, rx):
    out = {}
    for m in re.finditer(rx, src):
        i, depth = src.index("{", m.end() - 1) + 1, 1
        j = i
        while depth and j < len(src):
            depth += {"{": 1, "}": -1}.get(src[j], 0)
            j += 1
        out[(m.group(1), m.group(2))] = src[i:j - 1]
    return out


def header_types(h):
    types = {}
    for m in re.finditer(r"struct (\w+) : public IsUpdateFieldStructureTag[^{]*\{(.*?)\n\};", h, re.S):
        mem = types.setdefault(m.group(1), {})
        for mm in re.finditer(r"^\s*(?:(?:Optional|Dynamic)?UpdateField(?:Array)?<([^,<>]+(?:<[^<>]*>)?)[^;]*>|([\w:<>]+))\s+(\w+)(?:\[\w+\])?;",
                              m.group(2), re.M):
            mem[mm.group(3).lower()] = (mm.group(1) or mm.group(2)).strip()
    return types


def mask_expr(e):
    return re.sub(r"\s+", "", e)


def norm_cs(body):
    toks = []
    for raw in body.splitlines():
        l = raw.strip()
        if not l or l in ("{", "}", "else") or l.startswith(("var data", "return data", "//", "var changesMask",
                                                             "var maskMask", "var noneChangesMask")):
            continue
        if l.startswith("packet.ResetBitReader"):
            continue
        if re.match(r"var raw\w*Mask = new int", l):
            continue
        if re.match(r"var has\w+ = false;", l):
            continue
        if re.match(r"(?:var )?\w+ = packet\.ReadBit\(", l):
            toks.append("PRESENCE"); continue
        if re.match(r"if \(\w+\)$", l):
            toks.append("IFPRESENT"); continue
        m = re.search(r"data\.(\w+)(?:\[[^\]]*\])*\s*=\s*Substructures\.\w+\.Read\w+\(", l) or \
            re.search(r"Substructures\.\w+\.Read\w+\(packet, indexes, \"(\w+)\"", l)
        if m:
            toks.append(f"EXT {m.group(1).lower()}"); continue
        m = re.search(r"data\.(\w+)(?:\[[^\]]*\])*\s*=\s*packet\.ReadQuaternion\(", l)
        if m:
            toks += ["RD x f", "RD y f", "RD z f", "RD w f"]; continue
        if re.match(r"rawMaskMask\[\w+\] = packet\.ReadInt32\(\)", l):
            toks.append("MASKWORD"); continue
        if re.search(r"data\.\w+(?:\[\w+\])*\.ReadUpdateMask\(packet", l):
            toks.append("DYNMASK"); continue
        m = re.match(r"if \(data\.\w+(?:\[\w+\])*\.UpdateMask\[\w+\]\)", l)
        if m:
            toks.append("IFDYN"); continue
        m = re.match(r"if \(data\.(\w+) == (\w+)\)", l)
        if m:
            toks.append(f"IFEQ {m.group(1).lower()} {m.group(2)}"); continue
        m = re.match(r"if \(\(flags & \(([^)]+)\)\)", l)
        if m:
            toks.append("IFFLAG " + "|".join(sorted(x.strip().split(".")[-1] for x in m.group(1).split("|")))); continue
        m = re.search(r"data\.(\w+)(?:\[[^\]]*\])*\s*=\s*packet\.ReadWoWString\(", l)
        if m:
            toks.append(f"STR {m.group(1).lower()}"); continue
        m = re.match(r"rawMaskMask\[\w+\] = \(int\)packet\.ReadBits\((\d+)\)", l)
        if m:
            toks.append(f"BLOCKSMASK {m.group(1)}"); continue
        m = re.match(r"rawChangesMask\[\w+\] = \(int\)packet\.ReadBits\((\d+)\)", l)
        if m:
            toks.append(f"MASKBITS {m.group(1)}"); continue
        m = re.match(r"if \(maskMask\[(.+)\]\)", l)
        if m:
            toks.append("IFBLOCK"); continue
        m = re.match(r"if \((?:noneChangesMask|changesMask)\[(.+)\]\)$", l)
        if m:
            toks.append(f"IFMASK {mask_expr(m.group(1))}"); continue
        m = re.match(r"if \(\(flags & UpdateFieldFlag\.(\w+)\)", l)
        if m:
            toks.append(f"IFFLAG {m.group(1)}"); continue
        m = re.match(r"for \(var \w+ = 0; \w+ < ([^;]+);", l)
        if m:
            toks.append("FOR " + (m.group(1) if m.group(1).isdigit() else "n")); continue
        m = re.search(r"data\.(\w+)(?:\[[^\]]*\])*(?:\.\w+)?\s*=\s*Read(Create|Update)(\w+)\(", l)
        if m:
            toks.append(f"SUB {m.group(1).lower()} {m.group(2)}"); continue
        m = re.search(r"data\.(\w+)(?:\[[^\]]*\])*\s*=\s*packet\.ReadBits\(\"[^\"]*\", (\d+)", l)
        if m:
            toks.append(f"BITS {m.group(1).lower()} {m.group(2)}"); continue
        m = re.search(r"data\.(\w+)(?:\[[^\]]*\])*\s*=\s*packet\.Read(\w+?)(?:E<[^>]*>)?\(\"", l)
        if m:
            w = CS_W.get(m.group(2), m.group(2))
            toks.append(f"BIT {m.group(1).lower()}" if w == "BIT" else f"RD {m.group(1).lower()} {w}"); continue
        if re.search(r"packet\.ReadUInt32\(\)", l):
            toks.append("SIZE32"); continue
        m = re.search(r"packet\.ReadBits\((\d+)\)", l)
        if m:
            toks.append(f"SIZEBITS {m.group(1)}"); continue
        if re.search(r"packet\.ReadBit\(\)", l):
            toks.append("PRESENCE"); continue
        if re.match(r"(data\.\w+(\[[^\]]*\])?\s*=\s*new|data\.\w+\.Resize|\w+\s*=\s*new )", l):
            continue
        toks.append("?CS " + l[:90])
    return toks


def norm_cpp(body, members):
    toks = []
    for raw in body.splitlines():
        l = raw.strip()
        if not l or l in ("{", "}", "else") or l.startswith(("Mask changesMask", "changesMask.SetAll", "//", "UF::",
                                                             "ViewerDependentValue<", "noneChangesMask", "Mask ")):
            continue
        if l.startswith(("if (ignoreChangesMask", "if (ignoreNestedChangesMask", "data.FlushBits")):
            continue
        if re.match(r"\w+ = ViewerDependentValue<", l):
            continue
        if re.match(r"if \(\w+(?:->|\.)has_value\(\)\)", l) or re.match(r"if \(\w+\)$", l):
            toks.append("IFPRESENT"); continue
        if re.match(r"bool \w+ = data\.WriteBit\(", l):
            toks.append("PRESENCE"); continue
        if re.match(r"if \(!ignore\w*ChangesMask\)", l) or l.startswith("WriteCompleteDynamicFieldUpdateMask"):
            continue
        if re.match(r"data << uint32\(changesMask\.GetBlocksMask\(\w+\)\);", l):
            toks.append("MASKWORD"); continue
        if re.search(r"\w+(?:\[\w+\])*\.WriteUpdateMask\(data", l):
            toks.append("DYNMASK"); continue
        if re.match(r"if \(\w+(?:\[\w+\])*(?:->|\.)HasChanged\(\w+\) \|\| ignore\w*\)", l):
            toks.append("IFDYN"); continue
        m = re.match(r"if \((\w+) == (\w+)\)", l)
        if m:
            toks.append(f"IFEQ {m.group(1).lower()} {m.group(2)}"); continue
        m = re.match(r"if \(fieldVisibilityFlags\.HasFlag\(([^)]+\|[^)]+)\)\)", l)
        if m:
            toks.append("IFFLAG " + "|".join(sorted(x.strip().split("::")[-1] for x in m.group(1).split("|")))); continue
        m = re.match(r"data\.WriteString\((.+)\);", l)
        if m:
            toks.append(f"STR {re.findall(r'(\w+)', re.sub(r'\[\w+\]', '', m.group(1)))[-1].lower()}"); continue
        m = re.match(r"data\.WriteBits\(changesMask\.GetBlocksMask\(\w+\), (\d+)\)", l)
        if m:
            toks.append(f"BLOCKSMASK {m.group(1)}"); continue
        if re.match(r"if \(changesMask\.GetBlock\(\w+\)\)", l):
            toks.append("IFBLOCK"); continue
        m = re.match(r"data\.WriteBits\((?:changesMask|noneChangesMask)\.GetBlock\(\w+\), (\d+)\)", l)
        if m:
            toks.append(f"MASKBITS {m.group(1)}"); continue
        m = re.match(r"if \((?:noneChangesMask|changesMask)\[(.+)\]\)$", l)
        if m:
            toks.append(f"IFMASK {mask_expr(m.group(1))}"); continue
        m = re.match(r"if \(fieldVisibilityFlags\.HasFlag\(UpdateFieldFlag::(\w+)\)\)", l)
        if m:
            toks.append(f"IFFLAG {m.group(1)}"); continue
        m = re.match(r"for \((?:uint32|std::size_t|int32) \w+ = 0; \w+ < ([^;]+);", l)
        if m:
            toks.append("FOR " + (m.group(1) if m.group(1).isdigit() else "n")); continue
        m = re.search(r"(\w+)\)?(?:\[\w+\])*\)?(?:->|\.)Write(Create|Update)\(", l)
        if m:
            toks.append(f"SUB {m.group(1).lower()} {m.group(2)}"); continue
        if re.search(r"has_value\(\)|is_initialized\(\)", l) and "WriteBit" in l:
            toks.append("PRESENCE"); continue
        m = re.match(r"data\.WriteBits\(.*(?:size\(\)|\.size\(\)).*, (\d+)\)", l)
        if m:
            toks.append(f"SIZEBITS {m.group(1)}"); continue
        if re.match(r"data << uint32\(.*size\(\)\);", l):
            toks.append("SIZE32"); continue
        m = re.match(r"data\.WriteBits\(([^,]+), (\d+)\)", l)
        if m:
            toks.append(f"BITS {re.findall(r'(\w+)', m.group(1))[-1].lower()} {m.group(2)}"); continue
        m = re.match(r"data\.WriteBit\((.+)\);", l)
        if m:
            toks.append(f"BIT {re.findall(r'(\w+)', m.group(1))[-1].lower()}"); continue
        m = re.match(r"data << (u?int(?:8|16|32|64)|float|bool)\((.+)\);", l)
        if m:
            vd = re.search(r"ViewerDependentValue<(\w+?)Tag>", m.group(2))
            name = vd.group(1) if vd else re.findall(r"(\w+)", re.sub(r"\[\w+\]", "", m.group(2)))[-1]
            toks.append(f"RD {name.lower()} {CPP_W[m.group(1)]}"); continue
        m = re.match(r"data << (.+);", l)
        if m:
            name = re.findall(r"(\w+)", re.sub(r"\[\w+\]", "", m.group(1)))[-1].lower()
            t = members.get(name)
            toks.append(f"EXT {name}" if t and "::" in t and t not in CPP_W else f"RD {name} {CPP_W.get(t, '?' + str(t))}"); continue
        toks.append("?CPP " + l[:90])
    return toks


def main(cpp_path, cs_path, *args):
    show = "--show" in args
    want = [a for a in args if not a.startswith("--")]
    cpp = open(cpp_path, encoding="utf-8").read()
    types = header_types(Path(cpp_path).with_suffix(".h").read_text(encoding="utf-8"))
    cs = open(cs_path, encoding="utf-8").read()
    fc = functions(cpp, r"void (\w+)::Write(Create|Update)\(ByteBuffer& data, [^)]*\) const\s*\{")
    # TC has an extra WriteUpdate(changesMask, ...) overload for the top-level structs; keep the mask-taking one
    fc2 = functions(cpp, r"void (\w+)::Write(Update)\(ByteBuffer& data, Mask const& changesMask[^)]*\) const\s*\{")
    fc.update(fc2)
    fs = functions(cs, r"I?\w+ Read(Create|Update)(\w+)\(Packet packet[^)]*\)\s*\{")
    fs = {(k[1], k[0]): v for k, v in fs.items()}
    differing = 0
    for key in sorted(set(fs) | set(fc)):
        if want and key[0] not in want:
            continue
        if key not in fc or key not in fs:
            print(f"{key[0]}::{key[1]}: only in {'WPP' if key not in fc else 'TC'}")
            differing += 1
            continue
        a = norm_cpp(fc[key], types.get(key[0], {}))
        b = norm_cs(fs[key])
        if a != b:
            d = [l for l in difflib.unified_diff(a, b, "TC", "WPP", lineterm="", n=1) if not l.startswith(("---", "+++"))]
            differing += 1
            print(f"== {key[0]}::{key[1]}: {sum(1 for l in d if l[:1] in '+-')} differing tokens")
            if show:
                print("\n".join(d[:120]))
    print("functions differing:", differing)


if __name__ == "__main__":
    main(*sys.argv[1:])
