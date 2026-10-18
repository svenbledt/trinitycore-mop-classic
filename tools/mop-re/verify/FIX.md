# Packet layout fix task (client 5.5.4.70449)

You make TrinityCore's packet (de)serializers match the MoP Classic client, one packet at a time, from client code.
Work in `F:\WorkDir\trinitycore-mop-classic`. Read `tools/mop-re/verify/AGENT.md` (proof standard, primitives) and
`tools/mop-re/verify/AGENT.rea.md` (REA attached to the user's IDA GUI; how to read pseudocode from the error details;
70449 addresses) first. Same tool rules: REA only, never open/close the binary, never modify the IDA database.

## Input
`tools/mop-re/out/70449/layouts/worklist.json`; you get a list of source files, take every item whose `file` is one
of them. Per item: `name`, `value` (opcode, already proven), `class`, `tc` (our tokens), `client` (client tokens),
`status` (`diff` / `unparsed` = our tokenizer could not read the server code / `no-client-layout` = raw payload, the
handler parses it), and client addresses `ctor` (SMSG deserializer), `writer` (CMSG serializer), `dispatcherCase`,
`handlers`. Tokens: `B` byte/bits (runs collapsed), `H` u16, `I` u32/float, `Q` u64, `G` packed GUID, `S` string/bytes;
both sides are truncated at 40 tokens. Our tokenizer has known false positives: client loops unrolled (`SSSSS` vs
`S`), `append()` of fixed arrays shown as `S`, client tokens cut short when the ctor calls a helper it could not follow.

## Per packet
1. Read the client code for the packet (ctor / dispatcher case / CMSG writer, plus helpers it calls) and write down
   the exact wire order: field widths, bit fields with their bit counts, optional blocks and their presence bits,
   loops and their counters, strings and their length bits.
2. Compare with our `Write()` (SMSG) / `Read()` (CMSG) and every `operator<<`/`operator>>` it uses.
3. If they differ, change our code to the client order. Rules:
   - Follow the surrounding TrinityCore style (`<< int32(X)`, `Bits<N>`, `OptionalInit`, `SizedString`, `FlushBits`).
   - A new field gets a member with a neutral default (0/false/empty). If its meaning is not proven from client code,
     name it after what you can prove (or `Unk<offset>`) and put `// TODO(verify): <what is unknown>` on it.
   - A changed field width: change the member type only if callers still compile; otherwise cast in `Write()`.
   - If you rename or retype a member, update every use (`grep -rn` under `src/server`). The code must compile.
   - Do not refactor anything else. Do not touch `Opcodes.*`, update fields, DB2 or SQL.
   - Inline comments: 2 lines max, only the non-obvious why. A hook enforces this on every edit; fix any run it reports.
4. A shared struct serializer (e.g. used by several packets) changes for all of them: check one other user first.

## Output
JSON array at `tools/mop-re/out/70449/layouts/results/<your batch>.json`, one entry per item:
```json
{"name": "SMSG_X", "verdict": "fixed|already-correct|tokenizer-noise|unknown",
 "clientLayout": "exact client order", "change": "what you changed in which file/function, or empty",
 "evidence": "<= 250 chars, client addresses"}
```
`unknown` = you could not read the client code well enough; say what is missing. Do not build; the lead builds.
Final message: counts per verdict, files changed, any fix that touched a shared struct or handler code. Max 15 lines.
