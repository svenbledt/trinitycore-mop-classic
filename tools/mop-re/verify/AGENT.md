# Opcode verification task (client 5.5.4.70032)

You verify which client opcode slot belongs to each packet name in your chunk, from the client binary. Static analysis
only. Work in `F:\WorkDir\trinitycore-mop-classic\tools\mop-re`.

## Inputs
- Your chunk: `out/70032/verify/chunks/<chunk>.json`. Each item has `name`, `candidates` (client slots proposed by the
  aligners; may be empty), and per-slot `ctor` / `writer` / `handlers` / `dispatcherCase` / `clientTokens` / `claimedBy`.
- `out/70032/verify/open-slots.json`: every client slot without a proven name (search here when the candidates are
  wrong or empty; prefer slots in the same group as the candidates).
- `out/70032/harvest/audit.json` `names`: current placements (`evidence` anchor/exact = proven by layout).
- Expected layouts: TrinityCore `src/server/game/Server/Packets/*Packets.{h,cpp}` (`Write()` for SMSG, `Read()` for
  CMSG; this branch is Cata Classic 4.4 adapted), WowPacketParser parsers in `refs/wpp/WowPacketParserModule.V5_5_0_61735`
  (MoP Classic 5.5.0) and `refs/wpp/WowPacketParserModule.V1_60_1_69876` (newest Classic-family build).
- Opcode tables for order context: `refs/wpp/WowPacketParser/Enums/Version/{V5_5_3_64802,V1_60_69876}/Opcodes.cs`.

## IDA
Use the IDA MCP tools (`mcp__plugin_ida-pro-mcp_idalib__*`). Find the session with `idb_list`; if none is reachable,
`idb_open` `D:\WoW\World of Warcraft\_classic_\WowClassic_dump.exe.i64` with `mode: "prefer_gui"`. Never start a new
analysis, never copy the dump, never run it, and never modify the database (no rename/comment/type/patch calls).
Image base 0x140000000. Decompile/disassemble only what you need.

Client primitives (SMSG read): u8 `0x142E4CAC0`, u16 `0x142E4CB10`, u32/float `0x142E4CB60`, u64 `0x142E4CBB0`,
bytes `0x142E4D0D0`, string `0x142E4D120`, packed GUID `0x142E9E600`; bit reads are inline shifts on the stream.
CMSG write: u32 `0x142E4D5B0`, u8 `0x142E4D470`, u16 `0x142E4D510`, u64 `0x142E4D7B0`, float `0x142E4D650`, bytes
`0x142E4DC70`, GUID `0x142E9E630`, bits `0x140583180..0x1405833C0`, bit flush `0x140583600`.

Where the layout is:
- SMSG with `ctor`: the ctor is the deserializer. If it only calls the bytes primitive with the remaining length
  (`*(a4+24) - *(a4+28)`), the packet is raw: the handler (`handlers`) reads a struct from `*(pkt+0x20)` by offset.
- SMSG with `dispatcherCase`: the packet is parsed inline in a group dispatcher; disassemble from that address.
- CMSG: `writer` is the body serializer. To learn what the packet means, find who builds it (xrefs to its vtable/ctor)
  and the Lua API or UI function around that (strings).
- Handler meaning: strings, Lua event names, the game subsystem it touches, and which fields it uses.

## Proof standard
A value is **proven** only if client code ties the slot to the packet's meaning:
- the field layout matches the expected layout and no other plausible name in the neighbourhood has the same layout; or
- the handler/builder behaviour (strings, events, subsystem, field use) identifies the packet, and the layout is
  compatible.
Index order alone is not proof. Short layouts (`G`, `I`, `B`, `BGB`) almost always need handler evidence. If all you
have is layout shape plus order, the verdict is `ambiguous`, not `proven`.

## Output
Write a JSON array to `out/70032/verify/results/<chunk>.json` (create the directory if needed), one entry per item:
```json
{"name": "SMSG_X", "verdict": "proven|absent|ambiguous|unknown", "value": "0x46002F or null",
 "evidence": "<= 250 chars, cite addresses: ctor/handler and what it shows",
 "clientLayout": "client field order, e.g. u32 MapID, f32 x4 Pos, u32 Reason",
 "layoutDiff": "differences vs our TrinityCore Write()/Read(), or empty if identical / not checked"}
```
- `absent`: the packet does not exist in this client (no slot with that meaning); say why.
- `ambiguous`: two or more slots fit; list them in evidence.
- Do not edit any other file. Your final message: counts per verdict and anything surprising, max 10 lines.
