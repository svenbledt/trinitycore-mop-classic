# RE notes — 5.5.4.70032

Dump: `WowClassic_dump.exe` FileVersion 5.5.4.70032. Addresses are IDA EAs in the user's IDB (`D:\WoW\World of Warcraft\_classic_\WowClassic_dump.exe.i64`, image base `0x140000000`). Read-only analysis via idalib/IDA MCP.

## Opcode tables

Opcode = `(group << 16) | index`, sent as a 32-bit value on the wire (as in TrinityCore's `IncomingPacketHeader::EncryptedOpcode`).

- **Receive path:** `NetClient` HandleData `0x1413DF250`.
  - Checks the `WORLD OF WARCRAFT CONNECTION - SERVER TO CLIENT - V2` handshake.
  - Before encryption it accepts only `0x460000` and the connection group `0x4D0000–0x4D000E` filtered by bitmask `byte_1430CC134 = 1F 2A` (indices 0–4, 9, 11, 13).
  - `0x4D000D` recursively splits length-prefixed sub-packets: **SMSG_MULTIPLE_PACKETS**. `0x4D000E` goes to `0x1413E1380`: COMPRESSED_PACKET (TODO(verify)).
  - Everything else goes to the registered dispatchers (runtime list `qword_1460A6430`; on the heap, not in the dump).
- **Connection group handler:** `0x140616FF0`, a switch over `0x4D0000..0x4D000C`.
- **Send path:** NetClient send `0x1413DECD0`. It routes CMSG groups to a connection with range checks that expose the exact group sizes: `0x3E`:519, `0x3F`:285, `0x41`:10, `0x42`:137, `0x34`:19, `0x37`:38, `0x3D`:19, `0x3C`:17, `0x35`/`0x3B`:8, `0x36`/`0x39`:9, `0x32`/`0x33`:2, `0x40`:1.
- **Per-group dispatch:** every group has switch code `reg = opcode - (group << 16); cmp reg, N-1; ja; jmp table`. SMSG jump tables are dense (every index has a deserializer case).
- **CMSG serializers:** one function per opcode. The first call is CDataStore put-uint32 `0x142E4D5B0(store, opcode)`. Other puts: `0x142E4D7B0` = uint64, `0x142E4D470` = uint8, `0x140583600` = bit flush, `0x142E4DC70` = raw bytes.
- **Exporter:** `tools/mop-re/ida/export_opcodes.py`, which finds the switches and serializers above.
  - 70032 result: 860 CMSG values (serializers found; empty or inlined senders are missed) and 1456 SMSG values.
  - 41 groups. CMSG `0x2D–0x45`, SMSG `0x46–0x60`.
  - SMSG group sizes: `0x46`:896, `0x4A`:21, `0x4B`:36, `0x4C`:53, `0x4D`:13 (15 accepted in HandleData), `0x4E`:12, `0x50`:82, `0x52`:72, `0x55`:12, `0x56`–`0x57`:8, `0x58`:36, `0x59`:8, `0x5A`:34, `0x5E`:130, `0x5F`:6, `0x60`:20.
  - Range-check-only groups: `0x47`, `0x54`, `0x5C` (TODO(verify)).

### Relation to WowPacketParser 5.5.3.64802

- Group renumbering is not uniform, and 70032 has new groups. CMSG group mapping from index-set overlap: `0x2F→0x2F` (40/40), `0x31→0x31`, `0x34→0x3F`, `0x36→0x42`, `0x38→0x44`, `0x33→0x3E`, `0x39→0x45`. Probable SMSG mapping from sizes: `0x3A→0x46`, `0x3F→0x4B`, `0x40→0x4C`, `0x41→0x4D`, `0x51→0x50`.
- **Indices shift inside groups.** For example the connection group has +3 at the start (`AUTH_CHALLENGE` index 0 → 3) and +4 later (`MULTIPLE_PACKETS` 9 → 13). In CMSG `0x45`, `AUTH_SESSION` keeps index 1 but the continued-session layout moves from 2 to 3. Names therefore need per-opcode evidence. Index alignment is only a hint.

## Login-path opcodes (hand-verified)

| Name | 70032 value | Evidence |
|---|---|---|
| SMSG_AUTH_FAILED (probable) | 0x460000 | Only non-connection opcode accepted before auth in HandleData `0x1413DF250`; first index of the big SMSG group. TODO(verify) |
| SMSG_AUTH_CHALLENGE | 0x4D0003 | Connection group +3 shift; allowed pre-encryption (bitmask bit 3). Deserializer case in `0x140616FF0`. TODO(verify) field layout |
| SMSG_ENTER_ENCRYPTED_MODE | 0x4D0004 | Case in `0x140616FF0` reads uint32 + 64 bytes + bit = TC `EnterEncryptedMode` (RegionGroup, Signature[64], Enabled) |
| SMSG_CONNECT_TO | 0x4D0008 | Case in `0x140616FF0` reads address list into `JamClientConnectPayload` |
| SMSG_MULTIPLE_PACKETS | 0x4D000D | HandleData splits length-prefixed sub-packets |
| CMSG_AUTH_SESSION | 0x450001 | Serializer `0x14059E170`: u64, u32×3, 32 bytes, 24 bytes, bit, u32 len + bytes = TC `AuthSession::Read` |
| CMSG_AUTH_CONTINUED_SESSION (probable) | 0x450003 | Serializer `0x14059E320`: u64, 32 bytes, 24 bytes, u64, u32, u32. Layout differs from TC 4.4.2. TODO(verify) |
| CMSG_SUSPEND_COMMS_ACK | 0x450000 | Serializer: u32, u32 |
| CMSG_ENTER_ENCRYPTED_MODE_ACK | 0x450005 | Empty body. Group `0x45` = WPP `0x39` with +2 from WPP index 3 (PING, LOG_DISCONNECT … QUERY_PLAYER_NAMES line up by layout) |
| CMSG_PING | 0x450006 | Serializer: u32 serial, u32 latency |
| CMSG_LOG_DISCONNECT | 0x450007 | Serializer: u32 |
| CMSG_CONNECT_TO_FAILED | 0x440000 | Serializer `0x14058DA80`: u8, u32 (order differs from TC 4.4.2's Serial, Con) |
| CMSG_HOTFIX_REQUEST, CMSG_ENUM_CHARACTERS, CMSG_PLAYER_LOGIN | 0x440011, 0x440014, 0x440016 | Group `0x44` index set identical to WPP `0x38` up to `0xBF`. ENUM_CHARACTERS serializer `0x14058E590` has an empty body |
| SMSG_AUTH_RESPONSE | 0x460001 | Deserializer `0x14059F250`: u32 Result, bits HasSuccessInfo/HasWaitInfo |
| SMSG_WAIT_QUEUE_UPDATE | 0x460002 | u32, u32, bits = TC AuthWaitInfo |
| SMSG_ENUM_CHARACTERS_RESULT | 0x460018 | `0x1405A2280` references JamClientRegionwideCharacterListEntry / JamRaceLimitDisableInfo |
| SMSG_FEATURE_SYSTEM_STATUS(_GLUE_SCREEN) | 0x460063 / 0x460064 | WPP `0x59`–`0x5F` sequence found at `0x63`–`0x69` (+10) by layout (season info u32×7+bit, GO anim kit guid+u32+bit, GO despawn guid) |
| SMSG_SET_TIME_ZONE_INFORMATION | 0x460124 | Three 7-bit length bytes (+10 from WPP `0x11A`) |
| SMSG_ACCOUNT_DATA_TIMES | 0x4601B9 | guid, u64, u64 loop (+11 from WPP `0x1AE`) |
| SMSG_GET_ACCOUNT_CHARACTER_LIST_RESULT | 0x460213 | u32 token, u32 count, bit, entries (guid, guid, u32, u8×4, u64…); `0x460214` = LIVE_REGION variant |
| SMSG_AVAILABLE_HOTFIXES | 0x4A0001 | u32 VirtualRealmAddress, u32 count, (u32, u32) loop. Group `0x4A` = WPP `0x3E` at the same index |

## Auth seed key

- **Seeds:** `AuthCheckSeed`, `SessionKeySeed`, `ContinuedSessionSeed` and `EncryptionKeySeed` are unchanged from TrinityCore. They're at `0x1430426B0`, `0x1430426F0`, `0x1430426D0` and `0x143042710`.
- **Digest:** `sub_142EB1AE0` computes `HMAC-SHA512(SHA512(sessionKey[64] || buildKey[16]), LocalChallenge || ServerChallenge || AuthCheckSeed)`, the same as `WorldSocket::HandleAuthSessionCallback`. It's called from the auth-challenge handler `sub_1413E0C30`.
- **Provider:** `buildKey` comes from the function pointer `qword_145E84368`, registered in `sub_1401F0050` (`0x1401F0990`) as `sub_1401F1530`, next to the type fourCC `'WoW'` (`dword_145E84358`). The provider's body (`0x1401F0AB0`) is encrypted at rest (mostly `0xCC`) and decrypted only at runtime, so the genuine per-build key can't be recovered statically.
- **Server key:** the server uses the Arctium launcher's static seed `179D3DC3235629D07113A9B3867F97A7` (source: ModernWoWTools/Launcher `src/Launcher.cs`, "Resulting static auth seed is: …"; the HermesProxy default is the same). The client must be started through Arctium with `--staticseed`.

Matching tool: `tools/mop-re/src/match.ts` with `overrides/70032.json` (group map plus the anchors above). It aligns each mapped group with monotone offsets; anchors are hard constraints. SMSG groups are dense, so non-anchored SMSG names are low confidence (TODO(verify)). Open: SMSG_PONG is `0x4D0009` or `0x4D000A`.

## Client enum extensions found by loading 5.5.4.70032 data

- **Powers** (source: client `PowerType.db2`, `PowerTypeEnum` + `NameGlobalStringTag`): `28 = SHADOW_ORBS` (ChrClassesXPowerTypes ID 63, Priest), `29 = COMBAT_TEXT_RUNE_DEATH`. `MAX_POWERS` goes from 28 to 30, and `UnitMods` gets two power slots.
- **SpellEffect.db2 maxima:** `Effect` 347 (TC knew 330), `EffectAura` 642 (TC knew 624), `ImplicitTarget` 149, `EffectIndex` 31. New ids are numbered placeholders with no-op handlers, `TODO(verify)`.
- **SpellScaling.txt** has 16 data columns (11 classes + 6 `Unknown`). TC keeps Item/Consumable positionally; the 4 extra columns are unnamed `TODO(verify)`.
