# MoP Classic port — status

Last updated: 2026-10-12

| | |
|---|---|
| Base | TrinityCore `cata_classic` @ `0614c9fd941` (4.4.2.60895) |
| Target | MoP Classic 5.5.4.70032 (dump at `d:\WoW\World of Warcraft\_classic_\WowClassic_dump.exe`) |
| Current phase | **2b — enter world; full opcode verification PAUSED (2026-10-12, to save session usage)** |
| Next | Resume opcode verification (s22, s23), then fix server packet layouts, then Enter World test (branch `mop/phase2b`) |

## Phase 2b opcode verification — PAUSED (2026-10-12)
Every packet name is being proven from client code in IDA (method: `opcode-harvest.md`, steps 1–7; verifier brief `tools/mop-re/verify/AGENT.md`).
- Done: round 1 (`chunks/` c00–c11; the u00–u04 names were folded into round 2), round 2 (`chunks2/` r00–r22), round 3 rechecks s00–s21 (`chunks3/`). ~1200 values proven (anchors with evidence in `overrides/70032.json`), 300 SMSGs still unverified.
- **Resume:** run verifiers for `chunks3/s22.json` and `s23.json`; then `pe/apply_verified.py`, regenerate (pipeline in `opcode-harvest.md`), build, commit. Downgrade "proven" results that rest only on order/layout/Cata enums before applying. Max 6 verifiers at once.
- Afterwards: second pass on `ambiguous`/`unknown` results; then fix the server writers/readers listed in `tools/mop-re/out/70032/verify/layout-diffs.md` (e.g. MovementInfo extra f32 + bit, WORLD_SERVER_INFO, FEATURE_SYSTEM_STATUS, spell logs, quest credit width) before the next Enter World test.
- D: (Phison NVMe with dump + IDB) dropped off the bus once at 15:07; scans after restart found no errors.

## Phase 2a live e2e (2026-10-12)
Verified in the 5.5.4 client: races selectable, create, list (correct name/race/sex) and delete all work. Fixes, each checked against the client reader (details in `re-notes.md` "Phase 2a live fixes"):
- Create button: the real gate was **WowTokenLimitedMode** (glue status bit 43), not game time; we were writing BNSend bits there.
- Races locked: RaceUnlock entry is `u8 RaceID, u32 ClassUnlockCount, 5 bits`; header has 10 bits.
- Char list garbled: VisualItem is 23 bytes, extra u64 after LastPlayedTime, restrictions block has 4 bits + extra u32.
- Delete hung: `ResponseCodes` renumbered from the client's string table (3 codes inserted since Cata; DELETE_SUCCESS 65→66).
- Starting gear now shows in the list (VisualItem order fixed 2026-10-12, Phase 2b branch). Open: `0x44012E` mis-mapped as CMSG_BATTLENET_REQUEST; Pandaren lack `race_unlock_requirement` rows.

## Opcode audit + game-time state (2026-10-10)
- Root cause of "active game time required": the client's game-time state (`NetClient+0x7F4`, read by IsTrialAccount/IsVeteranTrialAccount/GetBillingPlan) is set only by **SMSG_UPDATE_GAME_TIME_STATE 0x4602DB**, which we had at the wrong value and never sent. Now sent after AUTH_RESPONSE with BillingPlan 1 (`game-time-state.md`). Pending live confirmation.
- Full opcode harvest from the dump (2295 packets) + structural audit against WPP replaced the constant-offset matcher; `Opcodes.h` regenerated (`opcode-harvest.md`). Login-flow SMSGs fixed: TUTORIAL_FLAGS, BATTLE_NET_CONNECTION_STATUS, UNDELETE_COOLDOWN_STATUS_RESPONSE, SOCIAL_CONTRACT_REQUEST_RESPONSE, PONG, connection group; ACCOUNT_DATA_TIMES now 20 slots.
- 380 opcodes solid, ~1200 still `TODO(verify)`: verify each before relying on it in later phases.

## Phase 2a (2026-10-09) — character creation & deletion
Branch `mop/phase2a`. Code + unit tests done (43/43 ctest, bun, codestyle green). Live e2e is **blocked by a client-side "active game time required" subscription gate** — the create button is disabled before `CMSG_CREATE_CHARACTER` is ever sent, so it is not a packet bug. Full investigation + recommended next steps in `docs/mop-port/phase2a-subscription-gate.md`.
- Opcodes harvested/verified: CMSG_CREATE_CHARACTER 0x440070, CMSG_CHAR_DELETE 0x4400CD, SMSG_CREATE_CHAR 0x4601AF, SMSG_DELETE_CHAR 0x4601B0; 0x4400CC = CMSG_SERVER_TIME_OFFSET_REQUEST (not delete).
- Packet layouts: create/delete read paths already matched WPP V5_5_0; SMSG create/delete result code widened uint8→uint32; enum per-character record fixed (ListPosition u16, +Flags4, +Unused1110_1, +2 bits, +EraChoiceState, WarbandGroups loop last).
- Handlers (`HandleCharCreateOpcode`/`HandleCharDeleteOpcode`) are unmodified upstream: full validation + account-ownership checks intact.
- Details in `re-notes.md` (Phase 2a sections).

## Done
- Imported upstream `cata_classic` with full history as local `main`. The `upstream` remote has push disabled; there's no `origin` yet, and the repo will be private.
- Phase 0 recon: `docs/mop-port/00-recon.md`.

## Decisions (2026-10-08)
1. **MoP-only.** Cata Classic client support is dropped. Protocol files are changed in place.
2. **Client RE:** recover whatever the server needs (including `build_auth_key`) from the 70032 dump, using IDA Pro via MCP, Ghidra, or anything that fits.
3. **Hosting:** a private repo on the user's GitHub, later moving to an org. Ask before creating it or pushing.

## Phase 1 (2026-10-08)
- Docker dev stack (`contrib/mop-dev`): build plus 38/38 ctest, extractor, vmaps; bnetserver and worldserver both start ("World initialized").
- Generated opcode table and DB2 layouts for 70032 (`tools/mop-re`).
- Auth: build_info, build_auth_key (Arctium static seed) and realmlist; Battle.net v2 services ported from TC master.
- Login and glue packets updated (see `re-notes.md` "Login packet layouts").
- Content gaps: Monk create info removed until Phase 4; new spell effects and auras are placeholders.
- **Pending:** the end-to-end client login (needs Arctium); the unknown-build rejection check; SMSG_PONG ambiguity.

## Not started
