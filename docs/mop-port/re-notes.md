# RE notes — 5.5.4.70032

Dump: `WowClassic_dump.exe` FileVersion 5.5.4.70032. Addresses are IDA EAs in the user's IDB (`D:\WoW\World of Warcraft\_classic_\WowClassic_dump.exe.i64`, image base `0x140000000`). Read-only analysis via idalib/IDA MCP.

## Opcode tables

> 2026-10-10: superseded as the source of `Opcodes.h` by the getter harvest + structural audit in
> `opcode-harvest.md`. Several "confirmed" values below were wrong (e.g. SOCIAL_CONTRACT 0x460320, NPC_INTERACTION 0x460315).

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

## Battle.net services

The method: search the dump for each service's `OriginalHash` as a little-endian uint32 (code immediates) and for the full service name strings.

- The client registers `bgs.protocol.authentication.v2.client.AuthenticationService`/`Listener`, `account.v2.client.AccountService` and `game_utilities.v2.client.GameUtilitiesService`. `connection.v1.ConnectionService` stays v1.
- cata_classic v1 hashes for Authentication `0x0DECFC01`, Account `0x62DA0891` and GameUtilities `0x3FC1274D` get **0 hits**. TC master's v2 hashes, Authentication `0xC02F8216` (9), Account `0x22DC2464` (20) and GameUtilities `0x5DBB51C2` (12), are present.
- **Port:** cherry-picked TC master `ad3f7233ac54` (protos) plus `presence_types` from `53068a94e8`, and the bnetserver/worldserver service subset of master `c8ec3740265a` ("Updated to 12.0.7"). Its `WorldSession::SendConnectToInstance` ConnectTo layout change was left out because it's a world packet and belongs to Phase 2.
- The realm-list JSON fields added by `c8ec3740265a` are all present as client strings: `cfgContentSetID`, `useBleepChance`, `realmPermissions`, `tokenLifespanNanoSecs`, `BleepProxy`, `title_id`.
- **Open:** the external challenge payload type `web_auth_url` isn't present as a plain string, so it's unverified statically and gets confirmed in the e2e login.

## Login packet layouts

The path is `HandleAuthSessionCallback` → `InitializeSession` → `HandleCharEnumOpcode`. Changes for 5.5.4.70032:

| Packet (TC class) | Change | Source |
|---|---|---|
| `SMSG_ENTER_ENCRYPTED_MODE` (`Auth::EnterEncryptedMode`) | `int32 RegionGroup` added before the signature | IDA `0x140616FF0` case `0x4D0004`, TC master |
| `SMSG_AUTH_RESPONSE` (`AuthWaitInfo`) | `AllowedFactionGroupForCharacterCreate` changed uint32 → uint8 | WPP V5_5 AuthenticationHandler.cs:181 |
| `SMSG_AVAILABLE_HOTFIXES` | each entry is now UniqueID then PushID (the shared `HotfixId` operator is unchanged) | WPP V5_5 HotfixHandler.cs:24 |
| `SMSG_UNDELETE_COOLDOWN_STATUS_RESPONSE` | now MaxCooldown, CurrentCooldown, then the bit | WPP V5_5 CharacterHandler.cs:672 |
| `SMSG_FEATURE_SYSTEM_STATUS_GLUE_SCREEN` | `BpayStoreEnabled` bit and `BpayStoreProductDeliveryDelay` removed; +3 bits after the RealmHiddenAlert length; +2 vector counts after GameRuleValues (entries `(u32,u32,u32)` and `(u32)`); +2 int32 after RemainingTimerunningSeasonSeconds; GameRule `Rule` sent as uint8; Europa config now has a second (expensive) throttle state | IDA `0x1405A8450`, TC master (throttle) |
| `SMSG_ENUM_CHARACTERS_RESULT` | the WarbandGroups order differs, but TC sends it empty (deferred to Phase 2) | WPP V5_5 |

These are unchanged: AuthSession, AuthResponse main body, ConnectToFailed, AccountDataTimes, SetTimeZoneInformation, HotfixRequest.

## Client launcher / server keys (5.5.4)

- **Launchers:** `ModernWoWTools/Launcher` 0.1.3 rejects Classic major 5. Its successor `Burralis/Game-Launcher` (MIT, cloned to `F:\WorkDir\burralis-launcher`) lists Classic up to 5.5.3, has no dev mode and no static seed, and patches by data patterns only.
- **Burralis patterns in 70032:** `Portal` and `Version2UrlNew` are found. `ConnectToModulus`, `CryptoRsaModulus` and `CryptoEdPublicKey` are **not** found, so the launcher aborts at the "ConnectTo RsaModulus" patch.
- **EnterEncryptedMode verification:** `sub_1413E1150` calls `sub_142EB1EC0(sig, ..., pubKey)`. `pubKey` is looked up by `int32` (the new `RegionGroup` field) in `NetClient::CertStore` (`sub_1413DC010`); entries are `{int id; 32-byte key; byte devFlag}`. A non-dev entry with a non-GM retail client raises "Using non-perf or non-GM retail client in dev region is not allowed".
- **CertStore source:** `WowAuthCrypto::Certificate` list loaded from a CASC file, FileDataID **7725530** (`sub_142EB2270`, "Failed to load server certificates TACT file").
- **Context and seed** for the signature are still plain: context `0x143042610`, seed `0x143042730`.
- **Open:** the certificate format and its signing root, whether it's plain in memory for a data patch, and how the ConnectTo RSA key is stored now.

### CertStore details (resolved)

- FileDataID 7725530 is a PEM bundle of 12 self-signed Ed25519 X.509 certs (`*.gameservers.worldofwarcraft.blizzard.com`). Extract it with `tools/mop-re/casc/casc_dump.cpp` into the gitignored `out/` (never commit it).
- Extended Key Usage OIDs (`sub_142EB0F30`): `serverAuth`; `1.3.6.1.4.1.27296.303.1.1.2` (sets both flags, dev flag = 1) or `…1.1.3` (dev flag 0, only on the `dev` cert); `…303.1.2.<N>` gives key id N.
- Key ids: 1 us, 2 kr, 3 eu, 4 tw, 5 cn, 6 events, 7 ptr, 8 beta, 9 dev, 10 qa, 11 bl, 12 qacn. No chain or signature check was seen in the store build (`sub_1413DC010`).
- The store is a lazy singleton at `NetClient+1864`, built on first world connect (`sub_1413DD200`).
- **Server:** `EnterEncryptedMode::RegionGroup = 1`. **Launcher:** the Burralis fork's `CertStoreInjector` finds the entry array by shape (`{int32 id; key[32]; u8 dev}`, ids 1..N at a 40-byte stride) and overwrites the keys with TC's public key `02596f0d…`.
- **Auth key capture:** `sub_142EB1AE0` (digest) receives the 16-byte build key as arg 6. On entry to `WowClassic.exe+0x2EB1AE0`, `[rsp+0x30]` points at it.
- **Debugger capture fails:** attaching a debugger (`tools/mop-re/authkey-capture`, hardware breakpoint) terminates the 5.5.4 client and `BlizzardError.exe` opens, so the client detects debuggers. We don't hide the debugger (that would bypass a client protection). Next: read-only `peek` of the provider body (`0x1401F0AB0`) after its first use, to see whether it stays decrypted in memory.
- **Key capture point confirmed:** `sub_1413E0C30` (AuthSession digest caller) calls the provider `qword_145E84368(&v41)` at `0x1413E0CAE`, which writes the 16-byte build key to stack local `v41`; then `sub_142EB1AE0(..., a6=&v41)` at `0x1413E0E12`. On entry to `sub_142EB1AE0` the key pointer is at `[rsp+0x30]`. The key is never cached in a global, so capture is live-only: execute-watch the digest entry, read `[rsp+0x30]`, deref 16 bytes. User-mode debugger attach is detected (client exits, BlizzardError); use CE kernelmode (DBK) watch instead.

## Phase 1 end-to-end (2026-10-09): client reaches the character screen

- **SMSG_AUTH_CHALLENGE opcode = `0x4D0000`** (was `0x4D0003`, which has no client handler). Client dispatch `sub_140616FF0` binds `0x4D0000` to the auth-session builder `sub_1413E0C30`; `0x4D0004` ENTER_ENCRYPTED_MODE and `0x4D0008` CONNECT_TO were already correct. Fixed in `overrides/70032.json` + regenerated Opcodes.
- **build_auth_key (70032) = `039BA4A764BD378F788461EF5A31E58C`.** Recovered with no debugger: the digest is `HMAC-SHA512(SHA512(KeyData[64] ∥ buildKey[16]), LocalChallenge ∥ ServerChallenge ∥ AuthCheckSeed)[0..24]`. Captured those inputs server-side (temporary log in `HandleAuthSession`), dumped the client's thread stacks read-only (`tools/mop-re/authkey-capture` stacks mode), and scanned for the 16-byte window reproducing the digest. Repeatable per build. CMSG_AUTH_SESSION opcode `0x450001` confirmed.
- **SMSG_SOCIAL_CONTRACT_REQUEST_RESPONSE (`0x46032B`) is a wrong low-confidence opcode:** the 5.5.4 client mis-dispatches the 1-byte reply as a packed-GUID packet and crashes (ERROR #132 in `sub_142EA01E0`). Not sent for now (`SocialHandler.cpp`); cosmetic. TODO(verify) the real opcode.
- **Open (non-blocking):** CertStore key-injection race (fresh client's first login bounces at ENTER_ENCRYPTED_MODE; retry wins); unmapped CMSGs seen `0x2D0036`, `0x4400F6`, `0x4400F5`, `0x44011A`, `0x44012E`, `0x44017F`, `0x4400CC`.

### SMSG_SOCIAL_CONTRACT_REQUEST_RESPONSE opcode harvest (2026-10-09, partial)

- WPP (cited) values: 5.5.0 `0x3C031B`, 5.5.1 `0x3A031E`, 5.5.2 `0x3A031F`, 5.5.3 `0x3A0320`.
- Group shifted `0x3A → 0x46` in 5.5.4 (verified: known-good 70032 SMSG match WPP 5.5.3 index with group 0x46 — AUTH_RESPONSE 0x3A0001→0x460001, ENUM 0x3A0018→0x460018). Several mid/high indices drift +0xB (UNDELETE 0x3A026F→0x46027A, ACCOUNT_DATA_TIMES 0x3A01AE→0x4601B9, SERVER_TIME 0x3A01B8→0x4601C3), all confirmed working.
- Our match guessed `0x46032B` (0x320+0xB) but it's WRONG — the 5.5.4 client crashes on it (packed-GUID over-read), so the drift near 0x320 is not +0xB. Real 70032 index unknown; needs the client's group-0x46 handler-table (not a literal switch, so not text-searchable) or a ymir sniff. Client anchors found: event `SOCIAL_CONTRACT_STATUS_UPDATE` fired by `sub_140766130`; request sender `sub_1413DF020` (send path 0x1413DECD0); Lua glue `C_SocialContractGlue` `sub_1408ED590`.
- Status: packet suppressed server-side (cosmetic), so this is non-blocking. Resume harvest in Phase 2 with a sniff or by reversing the group-0x46 dispatch/registration.

### RESOLVED (2026-10-09): social-contract opcode + an NPC_INTERACTION mis-map

Client confirms via per-packet opcode getters (`mov [rdx], <opcode>h`) cross-checked with WPP 5.5.3 indices (group shifted 0x3A→0x46, this index region is stable, no drift):
- **SMSG_SOCIAL_CONTRACT_REQUEST_RESPONSE = `0x460320`** (getter `sub_1405D4F50`; WPP 5.5.3 `0x3A0320`). Our old `0x46032B` was a different (GUID) packet → client crash. Re-enabled the server send; verified no crash, reaches character screen.
- **SMSG_NPC_INTERACTION_OPEN_RESULT = `0x460315`** (getter `sub_1405D45C0`; WPP 5.5.3 `0x3A0315`) — was mis-mapped to `0x460320`, fixed to clear the collision.
Method for future low-confidence SMSG in group 0x46: scope `search_text "<idx>"` to the getter block `0x1405D0000-0x1405E0000` (each class has a `mov [rdx], 46xxxxh` getter), map to WPP 5.5.3 names by index.

### Phase 1 review follow-ups (2026-10-09)
- Added `tools/mop-re/test/opcodes_unique.test.ts`: fails if two opcode names share a value (the 0x460320 collision class). `gen_opcodes.ts` already rejects dupes at generation; this guards the committed header against hand-edits.
- `EnumUtils<Powers>::Count()` returns 29 while FromIndex/ToIndex span 31 — pre-existing TC pattern (Count == MAX_POWERS-1), not a regression; confirmed nothing sizes an array by it. Deferred.

## Phase 2a (2026-10-09): character create/delete opcode harvest

Harvested from the client dump (IDA db 23ceab28, imagebase 0x140000000) by reading each packet class's getter + (de)serializer. All four repo values were already correct; the SMSG pair is now client-verified (TODO markers dropped).

- **SMSG_CREATE_CHAR = `0x4601AF`.** Getter `sub_1405BDE00`; ctor `sub_1405BDE10` reads `{uint32 Code @+32, ObjectGuid Guid @+40}` (code via `sub_142E4CB60` = 4-byte read; GUID via `sub_142E9E600`). Matches `{Code, Guid}`. (The index-stable candidates are other packets: `0x4601A4` reads one string, `0x4601A5` reads `{Guid,u32}`.)
- **SMSG_DELETE_CHAR = `0x4601B0`.** Getter `sub_1405BDE90`; ctor `sub_1405BDEA0` reads `{uint32 Code @+32}` only, no GUID. Matches `{Code}`.
- Both drifted **+0xB** from WPP 5.5.3 (`0x3A01A4`/`0x3A01A5`), bracketed by verified anchors ACCOUNT_DATA_TIMES (`0x3A01AE→0x4601B9`) and SERVER_TIME_OFFSET (`0x3A01B8→0x4601C3`). Game-time moved to `0x4601BA`/`0x4601BB`, so `0x4601AF`/`0x4601B0` are create/delete, not game-time.
- **CMSG_CREATE_CHARACTER = `0x440070`.** Getter `sub_140591860`; header writer `sub_140591820` emits `0x440070`; body writer `sub_14066AD50` serializes name-length bits, 4 flag bits, race/class/sex bytes, customizations count, season id, name string, optional TemplateSet, then N×`{u32 optionId, u32 choiceId}`.
- **CMSG_CHAR_DELETE = `0x4400CD`.** Getter `sub_140596C30`; body writer `sub_140586660` writes one GUID (`sub_142E9E630`). CMSG neighborhood drifted **+1** (WPP CHAR_DELETE `0xCC→0xCD`).
- **`0x4400CC` resolved: = CMSG_SERVER_TIME_OFFSET_REQUEST** (empty body `sub_1401EF480`; WPP SERVER_TIME_OFFSET_REQUEST `0xCB→0xCC`, +1). This is the no-arg packet the client sends at the char screen — not char-delete; already mapped correctly in the repo.
- **Task 2/4 carry-forward:** client reads the SMSG create/delete `Code` as **uint32** (`sub_142E4CB60`, 4-byte). Repo `CreateChar`/`DeleteChar::Write` emit `uint8 Code` — widen in Phase 2a Task 2/4.
- **Tooling note (deferred):** `src/match.ts` assumes a single monotone index offset per group, but 5.5.4 drift is piecewise non-monotone, so hand-verified high-index opcodes (SOCIAL_CONTRACT, NPC_INTERACTION, now CREATE/DELETE) can't be fed into `names` without collapsing the group alignment. They're kept as top-level provenance keys (ignored by the matcher) and carried directly in the committed `Opcodes.h`. A non-collapsing override overlay in `match.ts` would restore a clean `match.ts`+`gen_opcodes` reproduction.

## Phase 2a (2026-10-09): SMSG_ENUM_CHARACTERS_RESULT per-character record

Diffed the repo's `EnumCharactersResult` writers against WPP V5_5_0_61735 `HandleEnumCharactersResult` / `ReadBasicCharacterListEntry` / `ReadCharacterRestrictionAndMailData` (the record Phase 1's empty-list test never exercised). Fixes applied to `CharacterPackets.cpp`:

- Per-character record (`CharacterInfoBasic`):
  - `ListPosition` widened uint8 -> **uint16**.
  - Inserted **Flags4 (uint32)** between Flags3 and the CantLoginReason byte (`unkWod61x`).
  - Inserted **Unused1110_1 (uint32)** after OverrideSelectScreenFileDataID, before the customizations array.
  - Added **two unused bits** after the FirstLogin bit (Unused1110_2/3) in the trailing bit block.
- `CharacterRestrictionAndMailData`: inserted the **EraChoiceState (2 bits)** between BoostInProgress and RpeResetAvailable.
- Top-level `EnumCharactersResult::Write`: moved the **WarbandGroups loop last** (after RaceUnlockData); WPP V5_5_0 orders it after RegionwideCharacters/RaceUnlock. Harmless while empty (Phase 1), wrong once populated.
- VisualItems (fixed array of 19), the VisualItemInfo field order, PersonalTabard (5x int32), and the create/delete read paths already matched WPP; unchanged.
- Verified by `tests/game/CharacterPackets.cpp` "Enum character record..." round-trip (RED on the uint8 ListPosition, GREEN after). Live-client render of a real character is the Task 5 e2e gate. 5.5.4-specific deltas vs WPP 5.5.3 to re-confirm there: none observed, but the record was not re-derived field-by-field from the 5.5.4 binary (WPP V5_5_0 is the cited layout authority per CLAUDE.md; check against the client at e2e).

## Phase 2a (2026-10-09): character delete path verified

- `CMSG_CHAR_DELETE` (`CharDelete::Read` = `>> Guid`) matches WPP V5_5_0 `HandleClientCharDelete` (one packed GUID) and the client sender `sub_140586660` (writes one GUID). No change.
- `SMSG_DELETE_CHAR` (`DeleteChar::Write`) result code is uint32 for 5.5.4 — fixed and unit-tested in Task 2 (shared finding with SMSG_CREATE_CHAR).
- `WorldSession::HandleCharDeleteOpcode` (`CharacterHandler.cpp:863`) already rejects a GUID the account does not own (`accountId != initAccountId` -> `OnPlayerFailedDelete`, return) and guards guild-leader / arena-captain / loaded-character cases. Upstream validation intact; the stack is not relaxed.

## Phase 2a live fixes (2026-10-12)

WPP V5_5_0_61735 layouts were wrong for 5.5.4 in each case below; all verified against the client reader.

- **SMSG_FEATURE_SYSTEM_STATUS_GLUE_SCREEN 0x460064** (reader `sub_1405A8450`, handler `sub_1417F3CF0`): after the 11-bit RealmHiddenAlert length come 6 bits; the 2nd lands at packet+365 = `byte_143D796BF`, returned by Lua `IsWowTokenLimitedModeEnabled()`, which disables the Create button. Writer: RealmlessCharSelect (TODO verify), WowTokenLimitedMode, 4 unknown bits. RealmHiddenAlert length is sent as size+1 (NUL always written).
- **SMSG_ENUM_CHARACTERS_RESULT 0x460018** (reader `sub_1405A2280`): 10 header bits; RaceUnlock = `u8 RaceID, u32 ClassUnlockCount, 5 bits (HasExpansion, HasAchievement, HasHeritageArmor, IsLocked, Unused)`, then per class `{u8, u32, 1 bit}`. Race list built in `sub_1417FC9D0` from `qword_145E84AB0`.
- **Per-character record** (reader `sub_1405A1160`): VisualItem (23 bytes) = `u32 ?, u32 ?, u8 Subclass, u8 InvType, u32 DisplayID, u32 DisplayEnchantID, u32 ?, u8 ?` — traced through the glue copy `sub_1418001F0` (packet +248 → display +1284, stride 28) into model setup `sub_141808950` (+1293 InvType, +1296 DisplayID → ItemDisplayInfo, +1300 enchant); the three `?` u32s are ItemID/Transmog/SecondaryIMA in unknown order; `u64` after LastPlayedTime. Restrictions (`sub_1405A16A0`): 4 bits, u32 Flags4, u32 senders, u32 types, **u32 (new)**, types, 6-bit lengths, strings.
- **ResponseCodes**: index into the client string table at `0x143209B70` (113 names). Inserted vs Cata: CHAR_CREATE_RACECLASS_ACHIEVEMENT 50, CHAR_DELETE_FAILED_NEIGHBORHOOD_OWNER 76, CHAR_DELETE_FAILED_HOUSE_OWNER 77. Sending the old 65 meant DELETE_IN_PROGRESS, so the client hung.
- Unhandled but harmless: `0x2D0036` (empty, from Lua `SetInCharacterSelect`), `0x4401AE`; `0x44012E` is mis-mapped as CMSG_BATTLENET_REQUEST (client sends an empty body, `sub_14059A860`).

## 5.5.4 packet layout fixes (2026-10-12)
Found by the IDA verifiers (`tools/mop-re/verify/AGENT.md`), each re-checked against the client reader/writer before
the change. Unnamed new fields are sent as zero/false and marked `TODO(verify)` in code.

| Packet | Client code | Change |
|---|---|---|
| SMSG_WORLD_SERVER_INFO | ctor 0x1405A4FB0 | DifficultyID u16; 4 packed GUIDs before the bits |
| SMSG_FEATURE_SYSTEM_STATUS | reader 0x1405A7960 | extra {u8,u32,u32} array count, 7 more u32, bit positions moved (Europa bit 6, SessionAlert bit 3 of byte 1, RaceClassExpansionLevels byte 5 bit 5), 10-bit string length, QuickJoin floats before its bit. Unmapped feature bits are sent false |
| CMSG_PLAYER_LOGIN | writer 0x14058E730 | trailing flag bit |
| CMSG/SMSG dungeon + raid difficulty | 0x140595890, 0x140598BB0, 0x1405B90F0, 0x1405C8550 | DifficultyID u16; raid: u32 Legacy (slot index, handler 0x141A98C30) first |
| SMSG_INSTANCE_INFO, RAID_INSTANCE_MESSAGE, calendar lockouts | 0x1405B1E00, 0x1405B8680/8780/8850 | DifficultyID u16; lockout added/removed: InstanceID last |
| SMSG_CONTACT_LIST, FRIEND_STATUS | 0x1405C66D0, 0x1405C68C0 | ClassID u8 |
| MovementInfo (all CMSG_MOVE_*, SMSG_MOVE_UPDATE*) | writer 0x14066D2D0 | f32 GravityModifier after MoveIndex; HasDriveStatus bit + {f32,f32,2 bits} (WPP V5_5_0 ReadMovementStats) |
| MovementForce | writer 0x14066ED90 | 3 more u32 after the first (WPP: DurationMs, EndTimestamp, Flags) |
| SMSG_CHAT | reader 0x140588730 | 3rd optional bit (trailing u32) |
| SMSG_QUEST_UPDATE_ADD_CREDIT(_SIMPLE), QUEST_UPDATE_COMPLETE | dispatcher cases 0x140640219/2FC/0CD | ObjectiveType u32; complete: one flag bit |
| SMSG_SPELL_HEAL_LOG / HEAL_ABSORB_LOG / MISS_LOG | 0x14064F3E9, 0x1406430C0, 0x140651196 | no supporters list; HasLogData bit; one bit after the entry count |
| CMSG_REQUEST_PARTY_MEMBER_STATS | writer 0x140593DB0 | counted GUID list (handler answers each) |
| SMSG_START_LOOT_ROLL | 0x1405AF960 | 3 x u32 ineligibility reasons |
| SMSG_DISPLAY_TOAST | 0x1405B0340 | one more bit after BonusRoll |
| Width-only (u8 -> u32) | per verifier evidence | ARENA_TEAM_EVENT, CHARACTER_RENAME_RESULT, CHAR_CUSTOMIZE_FAILURE, CHAR_FACTION_CHANGE_RESULT, PET_TAME_FAILURE, PET_NAME_INVALID, ITEM_PURCHASE_REFUND_RESULT, PVP_MATCH_COMPLETE, MAIL_QUERY_NEXT_TIME_RESULT (AltSenderType), CMSG_QUEST_PUSH_RESULT; PET_ACTION_FEEDBACK: u32 Response before SpellID |
| Misc | per verifier evidence | calendar invite Flags u16; SPELL_VISUAL_LOAD_SCREEN 12 bytes; SCENE_PLAYBACK_COMPLETE/CANCELED 2nd u32; GROUP_UNINVITE 1 byte |

Not yet fixed (second pass): ping packets, PLAYER_CHOICE_CLEAR, GUILD_KNOWN_RECIPES size, CMSG_SET_PET_SPECIALIZATION
(0x3E0015 is the player spec change), SMSG_ENABLE_BARBER_SHOP size, the full update-field layout for UPDATE_OBJECT.

## 5.5.4.70449 layout pass (2026-10-18)
Found by `tools/mop-re/pe/tc_layouts.py` (server tokens vs client tokens per opcode), each fix checked against the
70449 client reader/writer by the fixers (`tools/mop-re/verify/FIX.md`; per-packet evidence in
`tools/mop-re/out/70449/layouts/results/*.json`, gitignored).

| Packet / struct | Change | Client |
|---|---|---|
| FEATURE_SYSTEM_STATUS | one flag byte too many: 8 flag bytes, RaceClassExpansionLevels is bit 5 of the 5th | 0x1405A5F00 |
| SpellTargetData (CAST_SPELL, SPELL_START/GO...) | u32 Flags + 3 GUIDs first, then bits (new Unk38) | CMSG 0x1406561B0 |
| SpellCastRequest | u8 SendCastFlags after CastID, Misc3, optional Unk18; reagent quantity optional | CMSG 0x1406561B0 |
| SpellCastData / SpellHealPrediction | + CastFlagsEx2; heal prediction Type u32 | SPELL_START 0x14064DF09 |
| AuraDataInfo / AuraInfo | + DstLocation, CastUnit2, 2-bit Unk268; Slot u16 | AURA_UPDATE |
| ItemModList | count 7 bits (was 6) | 0x1406D2A20 / 0x140581AE0 |
| Action buttons | u64, type in bits 56-63 (Player/MiscHandler convert from Cata packing) | WPP V5_5_0 ActionBarHandler |
| UPDATE_TALENT_DATA | MoP group layout written directly (InspectResult keeps the shared serializer) | 0x1405A8940 |
| START_TIMER | TotalTime, Type, TimeLeft, optional PlayerGuid | 0x1405A3010 |
| CUF profiles | 2 more bool bits before PvP (written false) | 0x140586300 |
| Small | ACCOUNT_HEIRLOOM_UPDATE u8; ENABLE_BARBER_SHOP u32; RAID_INSTANCE_MESSAGE string; LEARNED_SPELLS +u32 +bit; PLAY_SPELL_VISUAL u8 reasons; SPELL_INTERRUPT_LOG bit; BARBER_SHOP_RESULT bit; ALTER_APPEARANCE u8 races; warband/regionwide enum blocks | per results |

Open: `UpdateTalentData::PrimarySpecialization` is not filled by Player (sent 0, Phase 4).

### Batches L3/L4 (2026-10-18)
| Packet / struct | Change |
|---|---|
| NEW_WORLD | raw payload (ctor 0x1405A1FC0 copies it whole); handler 0x1401FDF00 reads MapID +8, Pos +12, Reason +28, MovementOffset +32 |
| MonsterMove spline structs | Face u8 after Flags, face data before bits, TurnData optional, anim tier i32/u8/u32/u32, StopUseFaceDirection bit |
| MoveStateChange | 10th bit + optional DriveCapabilityRecID |
| Quest giver details / request items / offer reward | 4 quest-flag u32s; QUEST_PUSH_RESULT Result u32 |
| QUERY_QUEST_INFO_RESPONSE | FlagsEx3, one more u32 (position TODO(verify)), two int32 arrays, objective +2 u32 +1 bit |
| QUERY_CREATURE / GAME_OBJECT | creature 3 flag u32s, Type/Classification u8; GO stats +int32 |
| NAME_CACHE lookup | third optional block (GUID, 8-bit length, string) |
| TRANSFER_PENDING | optional TaxiPathID |
| PARTY_UPDATE / PARTY_MEMBER_FULL_STATE | LeaverInfo, ChallengeMode block, difficulty IDs u16, LFG Slot/MyFlags order; status u32, chromie block reshaped |
| Gossip (ClientGossipText) | 4th QuestFlags u32; OptionNPC i32, OptionCost u64 |
| INSPECT_RESULT | glyph + talent u16 arrays before PvP talents |
| Small | ADDON_MESSAGE_TARGETED 9/8-bit lengths; SET_PARTY_ASSIGNMENT u32; WHO FactionGroup u8; TRAINER_LIST type u8; PET_STABLE_RESULT u32; PVP_CREDIT u8 + bit; COLLECTION_ITEM_SET_FAVORITE u8; DISPLAY_PLAYER_CHOICE 7 flag bits, no MawPower block |
MovementInfo (both directions) was checked and matches.

### Batch L5 (2026-10-18)
GUILD_COMMAND_RESULT/GUILD_NEWS/QUERY_PETITION_RESPONSE/RATED_PVP_INFO u8 widths; LFG_JOIN_RESULT/LFG_UPDATE_STATUS u32;
SCENARIO_STATE DifficultyID u16; GUILD_PARTY_STATE bit after the ints; GUILD_ROSTER +u32 after RaceID;
CALENDAR_SEND_CALENDAR RaidResets array + lockout u32/u16/u32/u64; PVPMatchPlayerStatistics Faction int32 after Kills,
Race/Class u8; CMSGs: BATTLEMASTER_JOIN_ARENA leading GUID, OFFER_PETITION +u32, TURN_IN_PETITION 5 emblem u32,
CALENDAR_ADD_EVENT Flags u16, SUPPORT_TICKET_SUBMIT_COMPLAINT 10th presence bit + block. Retail-only Mythic+
DungeonScoreMapSummary diff left as is.

## Auth key capture, 5.5.4.70449 (2026-10-18)
- **build_auth_key (70449) = `9EE19873C7BB34B9AAF127991D5F5755`**, verified by recomputing the client's digest.
- Same no-debugger method as 70032: temporary `AUTHKEY_DEBUG` log on the failed digest in
  `WorldSocket::HandleAuthSession` (prints build, KeyData, Local, Server, Digest; never commit it), placeholder key row
  in the local DB, `authkey-capture stacks <dir>` while the user selects the realm, then
  `bun tools/mop-re/authkey-capture/keyscan.mjs <log> <dir>` (8-aligned, non-pointer windows, deduplicated; the hit
  was in the newest snapshot after 30k windows, so the key outlives the call on the stack).
- 70449 addresses: digest function RVA `0x2DF5690` (70032 `0x2EB1AE0`); NetClient singleton RVA `0x3CC6E88`
  (70032 `0x3D81E08`), CertStore field `+0x748` unchanged. The launcher (`burralis-launcher` `10af2c3`) now keeps a
  per-build singleton table.

## Pandaren faction choice (2026-10-18)
Opcodes and layouts proven from the 70032 client (verifier results `s02`, `s12`, `r01`; same values on 70449) and matching WPP `V5_5_0_61735`:

| Packet | Value | Layout | Client evidence |
|---|---|---|---|
| CMSG_NEUTRAL_PLAYER_SELECT_FACTION | 0x3E0085 | `u8 Faction` | builder 0x141EB3D30 = Lua `NeutralPlayerSelectFaction` |
| SMSG_SHOW_NEUTRAL_PLAYER_FACTION_SELECT_UI | 0x46007F | empty | handler 0x1418B2820 fires `SHOW_FACTION_SELECT_UI` |
| SMSG_NEUTRAL_PLAYER_FACTION_SELECT_RESULT | 0x460080 | `bit Success, u8 NewRaceID` | handler 0x1418B2850 sets the player faction byte, fires `NEUTRAL_FACTION_SELECT_RESULT` |

- Faction value: 1 = Alliance (race 25) is proven by the retail sniff m2 (client sends `01`, result `80 19`); 0 = Horde as SkyFire 5.4.8 does.
- TC master leaves the CMSG on `Handle_NULL`. Our handler (`WorldSession::HandleNeutralPlayerSelectFaction`) changes the race and faction, re-inits display, taxi nodes and default skills (adds Common or Orcish plus the faction Pandaren language from SkillRaceClassInfo), saves, and sends the result. After the result it casts 113244/113245 Faction Choice Trigger Spell, as retail does; the credit, exit movie and teleport follow from that spell (`phase3-4-plan.md` step 4 "Finale").
- Retail AUTH_RESPONSE (sniff `u2.pkt` #7, 70449) sends `ActiveExpansionLevel 4` and a 15-race class list identical to CharBaseInfo, with every expansion level 0; hence `Expansion = 4` in `worldserver.conf.dist`.
