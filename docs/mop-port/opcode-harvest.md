# Opcode harvest and audit (5.5.4.70032)

Replaces the Phase 1 constant-offset matcher (`src/match.ts`) as the source of `Opcodes.h`. Static analysis of the
dump only (never executed). Addresses are IDA EAs, image base `0x140000000`.

## Pipeline (`tools/mop-re/pe/`, run with `py -3.12`, needs `pefile` + `capstone`)
1. `harvest_getters.py <dump> getters.json`: every packet class has a getter `mov dword [rdx], OPCODE; mov rax, rdx; ret`
   in its vtable. 70032: **2295 packets (860 CMSG + 1435 SMSG)**, one getter and one vtable each. This is the
   complete set the client can send/parse, except the connection group handled in `NetClient::HandleData`.
2. `harvest_layouts.py <dump> getters.json layouts.json`: vtable = getter slot - 0x18. SMSG ctor = function storing the
   vtable (it is the deserializer, called from the group dispatch); CMSG body serializer = vtable slot +8.
3. `harvest_handlers.py <dump> layouts.json handlers.json`: each SMSG has a 16-byte thunk right before its getter
   (`mov rax,[rip+G]; test; jz; jmp rax`); init code does `lea reg, handler; mov [G], reg`. Resolves 564 handlers;
   needed for ctors that only keep the raw payload and let the handler parse it.
3b. `harvest_inline.py <dump> layouts.json inline.json` (2026-10-12): 20 group dispatchers (every SMSG group except
   most of 0x46) parse packets inline; from each case's vtable LEA it collects calls up to the handler-global load and
   resolves that global to its handler. Adds layouts for 545 SMSGs; before this, groups 0x47-0x60 had no client evidence
   and their values were index guesses (SMSG low 587 -> 271, high 152 -> 252).
4. `MOP_REF=<table> audit_opcodes.py <dump> layouts.json refs/wpp Opcodes.h overrides/70032.json outdir`, run once per
   reference opcode table (`V1_60_69876`, `V5_5_3_64802`): flattens each client (de)serializer to primitive tokens
   (`B` byte/bits, `H` u16, `I` u32/float, `Q` u64, `G` packed GUID, `S` bytes/string) and each WowPacketParser parser
   to the same alphabet (5.5.0 module first, then the nearest Classic/retail module that parses the packet), then
   aligns the reference's names to client indices per group with a monotone DP. Anchors are hard constraints. A raw
   payload (`S`) counts as no evidence, not as a mismatch. Writes `audit.<table>.json`.
5. `merge_audits.py <harvest dir> V1_60_69876 V5_5_3_64802` (2026-10-12) merges both runs into `audit.json` and
   `worklist.json`. A value is solid (`high`) when it is an anchor, an exact informative layout match, or placed by
   order (both references agree, or a one-to-one bracket, below) *and* backed by the client layout. Everything else is
   `low` and goes to the worklist with its ctor/handler addresses.
   - **Bracket:** between two solid names with the same index shift, if the reference's indices and the client's
     indices inside pair one-to-one, order fixes every value in between. Iterated to a fixpoint over both references.
   - **Leave-one-out self-check:** every solid value is hidden in turn and must be reproduced by the brackets of the
     others; contradicted ones are demoted. 70032: 1395 reproduced, 8 contradicted (e.g. NEW_WORLD, where an insert
     and a removal cancel out inside a bracket). So order alone is ~99.4% right, not proof.
6. `audit_to_match.py ...` + `bun src/gen_opcodes.ts 70032 ../.. <match-audit.json>` + `bun src/gen_unverified.ts ../..`
   regenerate `Opcodes.h/.cpp` and `OpcodesUnverified.h`. Solid names claim their slots first; `low` →
   `// TODO(verify)`; names without client evidence keep their old value only if the slot is free, else `UNKNOWN_OPCODE`.
7. Verification of the worklist (`tools/mop-re/verify/AGENT.md`): chunks of neighbouring names are checked in IDA
   against ctor/handler/builder code; `pe/apply_verified.py <results> overrides/70032.json <diffs.md>` turns proven
   values into anchors (with their evidence under `evidence`) and lists client layout changes for the server writers.

### Why two reference tables
WPP `V1_60_69876` ("WoW Forever" beta, build 69876) is the closest Classic-family client: same group ids as 70032 for
the core groups and 21/30 anchors at the identical value. It splits spells, quests, player and void storage packets
out of the big group into their own groups and adds housing groups, which 70032 keeps in 0x46. `V5_5_3_64802` keeps
the MoP grouping but uses other group ids and has fewer names. Names both place identically are independent evidence.

70032 primitives (re-locate per build): read u8 `0x142E4CAC0`, u16 `0x142E4CB10`, u32 `0x142E4CB60`, u64 `0x142E4CBB0`,
bytes `0x142E4D0D0`, string `0x142E4D120`, GUID `0x142E9E600`; write u32 `0x142E4D5B0`, u8 `0x142E4D470`, u16
`0x142E4D510`, u64 `0x142E4D7B0`, float `0x142E4D650`, bytes `0x142E4DC70`, GUID `0x142E9E630`, bits `0x140583180..3C0`,
bit flush `0x140583600`.

## Why the old table was wrong
Index drift between WPP 5.5.3 and 70032 is piecewise, not constant: in group 0x46 it is +0x0/+0xA/+0xB in different
ranges and **+0x11 from about index 0x260 up**; the connection group is +3 then +4. The old matcher used one offset per
range and marked many wrong values "high". Example misses fixed by the audit: NEW_WORLD 0x460036→0x46002D,
DISPLAY_GAME_ERROR 0x460040→0x460036, and ~60 more live opcodes with an exact layout match at a different value.

## Hand-verified login / character-screen packets
| Packet | Value | Evidence (client) | Repo before |
|---|---|---|---|
| SMSG_UPDATE_GAME_TIME_STATE | 0x4602DB | ctor `sub_1405CFC30` GameTimeInfo; handler "Handle Update Game Time State" | 0x4602D5, never sent |
| SMSG_TUTORIAL_FLAGS | 0x460272 | handler `sub_141AF3890` copies 32 bytes into `TSFixedArray<uint,8>` | 0x46026C (1-bit packet) |
| SMSG_BATTLE_NET_CONNECTION_STATUS | 0x4602BB | ctor `sub_1405CCFA0`: State = top 2 bits, Suppress = bit 5 | 0x4602B5 (u32 + array) |
| SMSG_UNDELETE_COOLDOWN_STATUS_RESPONSE | 0x460280 | ctor reads u32, u32, bit | 0x46027A (bit + array) |
| SMSG_SOCIAL_CONTRACT_REQUEST_RESPONSE | 0x460331 | ctor `sub_1405D5DE0` one bit; handler `sub_141C23020` fires the event hash `sub_140766130` uses for SOCIAL_CONTRACT_STATUS_UPDATE | 0x460320 (blob packet) |
| SMSG_NPC_INTERACTION_OPEN_RESULT | 0x460326 | ctor reads GUID, u32, bit | 0x460315 (BIII) |
| SMSG_PONG | 0x4D0009 | handler `sub_1413DFA90` matches serial, records latency | 0x4D000A |
| SMSG_SUSPEND_COMMS / RESUME / DROP_NEW_CONNECTION / RESET_COMPRESSION_CONTEXT | 0x4D0005 / 06 / 07 / 0A | case 5 handler acks serial+time (SUSPEND_COMMS_ACK); +3 run with CONNECT_TO 0x4D0008 | 07 was 05, 0A was 09 |
| Group 0x4A (DB_REPLY … QUERY_ARENA_TEAM_RESPONSE) | 0x4A0000 + WPP index | inline cases in `sub_1406B8F70` match WPP 0x3E layouts index-for-index | CACHE_VERSION unchanged 0x4A000E |
| SMSG_AUTH_RESPONSE, SET_TIME_ZONE_INFORMATION, ACCOUNT_DATA_TIMES, HOTFIX_CONNECT | unchanged | field-by-field vs `Write()` | — |

Structure bug found: **SMSG_ACCOUNT_DATA_TIMES carries 20 slots** in 70032 (ctor `sub_1405BE7D0`), WPP 5.5.0 and TC
had 17. The packet now sends 20 (types 17–19 zero, TODO(verify) their meaning).

## Coverage (regenerated `Opcodes.h`)
| | names | solid (verified/high) | TODO(verify) | UNKNOWN_OPCODE |
|---|---|---|---|---|
| CMSG | 749 | 176 | 550 | 23 |
| SMSG | 1166 | 200 | 800 | 166 |

Low confidence comes from packets with no informative layout (empty, single-byte, raw payload parsed by an unresolved
handler) or no WPP parser. Treat every `TODO(verify)` value as unconfirmed: verify its ctor/handler (as in the table
above) before relying on it in a new phase. Groups 0x4E/0x54/0x55/0x58/0x5A/0x5E/0x60 were mapped by weak gain only. Groups whose ctors are inlined in the dispatcher
(0x4A, 0x4C, 0x4D) give no per-packet tokens; there the DP falls back to the smallest index shift (0x4A, 0x4D anchored).

## Re-baselining a new build
Re-run steps 1–5; re-locate the primitive addresses and the getter/thunk byte shapes if the compiler output changed; re-check
every anchor in `overrides/<build>.json` against its ctor/handler (anchors are evidence, not assumptions).

## Unverified SMSG guard (2026-10-12)
`src/server/game/Server/Protocol/OpcodesUnverified.h` is generated by `bun src/gen_unverified.ts <repo>` from the
`TODO(verify)` markers; `WorldSession::SendPacket` drops those SMSGs and logs `Prevented sending unverified opcode`.
A wrong mapping crashed the client twice at enter-world. Rerun the generator after every Opcodes.h change.
