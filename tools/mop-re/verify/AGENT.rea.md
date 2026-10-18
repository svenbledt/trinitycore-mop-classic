# Opcode verification with REA on client 5.5.4.70449

Follow `verify/AGENT.md` (inputs, where layouts live, proof standard, output format) with these overrides. Opcode values
are identical in 70032 and 70449 (`docs/mop-port/opcode-harvest.md` "70032 → 70449"), so a value proven here holds for
both builds.

## Inputs and output
- Chunk: `out/70449/verify/chunks3/<chunk>.json`; open slots: `out/70449/verify/open-slots.json`. Addresses are 70449.
- Harvest: `out/70449/harvest/` (`getters.json`, `layouts.json`, `audit.json` is still `out/70032/harvest/audit.json`).
- Write results to `out/70449/verify/results/<chunk>.json`, same format as AGENT.md.

## Tools: REA only (`mcp__rea__*`)
- The session lead already opened `D:\WoW\World of Warcraft\_classic_\WowClassic_orion.exe` with `provider_id: "ida"`.
  REA is *attached* to the user's IDA GUI database (`WowClassic_orion.exe.i64`). Never call `open_binary` or
  `close_binary`, and never touch the GUI (no navigation, renames, comments, types, patches).
- Works directly: `procedure_callees`, `xrefs`, `search_strings` (exact literal or regex, returns addresses).
- `procedure_pseudo_code` and `procedure_assembly` return an `unreadable_output` error because the plugin's reply
  format is newer than REA expects, but the result is complete inside the error: read
  `details.partial_observation.raw_result.observations[]` (the `decompile` entry's `result.code`, or the `disasm`
  entry's `result.asm.lines`). Use one call per function; `batch_decompile` only gives the error.
- Byte reads are not available: for data (strings behind pointers, tables) use `xrefs` + `search_strings`, or note
  the address in the evidence and the lead resolves it statically.
- Calls are serial through the GUI. Do not retry a failed call in a loop.

## 70449 addresses (replace the 70032 ones in AGENT.md)
SMSG read: u8 `0x142D90670`, u16 `0x142D906C0`, u32/float `0x142D90710`, u64 `0x142D90760`, bytes `0x142D90C80`,
string `0x142D90CD0`, packed GUID `0x142DE21B0`.
CMSG write: u32 `0x142D91160`, u8 `0x142D91020`, u16 `0x142D910C0`, u64 `0x142D91360`, float `0x142D91200`, bytes
`0x142D91820`, GUID `0x142DE21E0`, bits `0x140581720..0x140581960`, bit flush `0x140581BA0`.
Game error N: string pointer at `0x143A9FBC0 + 24*N`. Calendar callbacks: registered in `0x141BCF190`.
