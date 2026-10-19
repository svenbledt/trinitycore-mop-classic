# MoP Classic port — status

Last updated: 2026-10-18

| | |
|---|---|
| Base | TrinityCore `cata_classic` @ `0614c9fd941` (4.4.2.60895) |
| Target | MoP Classic **5.5.4.70449** (dump `d:\WoW\World of Warcraft\_classic_\WowClassic_orion.exe`; 70032 dump kept as `WowClassic_dump.exe`) |
| Current phase | **2b done: a character enters the world on 5.5.4.70449 (2026-10-18)** |
| Next | Phase 3/4: DB2 layout hashes, gameplay baseline; keep checking new sniffs with `tools/mop-re/sniffcheck` |


## Backlog (noted, not started)
- Guild / guild bank / bank tabs / calendar / community finder: retail sniff `g1` (2026-10-18, 20.7k packets). Opcodes all at our values;
  only QUERY_GUILD_INFO is in sniffcheck so far. Unhandled in TC: CMSG_GUILD_QUERY_RECIPES and the CLUB_FINDER_* requests/responses;
  communities go through bnet ClubService (84 CMSG_BATTLENET_REQUEST). User: "just note it, not do anything for now".
- Guild finder (2026-10-19): FEATURE_SYSTEM_STATUS flag bytes now copy retail, ClubFinderEnabled = field +131 (C_ClubFinder.IsEnabled).
  Untested in the client. Next: answer CMSG_CLUB_FINDER_REQUEST_PENDING_CLUBS_LIST / _CLUBS_DATA / _SUBSCRIBED_CLUB_POSTING_IDS
  (0x440157-59) with the empty SMSG_CLUB_FINDER_* responses seen in the g1 sniff (dump_..._2026-10-18_21-47-16.pkt).

## Pandaria world import (2026-10-19, not committed)
Map 870 populated from SkyFire 5.4.8 + TC master: 30,272 creature / 8,340 GO spawns, 3,756 creature / 1,980 GO templates, 1,594 quests,
vendors, loot, SmartAI, gossip, `.tele` targets; plus item-side loot and battle pet breeds. Files `2026_10_19_20..26_world.sql`,
applied without SQL errors. Rules, GUID ranges and gaps (creature/node loot missing in both sources): `pandaria-import.md`.

## Specializations (2026-10-19, not committed)
- Spec selection works server-side (built, 51/51 tests, worldserver restarted): 0x3E0015 renamed CMSG_SET_SPECIALIZATION (u32 ChrSpecialization ID, sniff m2 #45272); reply = one LEARNED_SPELLS with SpecializationID, UPDATE_TALENT_DATA, passive auras, CurrentSpecID UF. SpecializationSpells.db2 store added; chosen spec persists per group in `character_talent_group.talentTabId`. Not client-tested yet.
- Second step (built, 51/51, restarted): MoP talents via CMSG_LEARN_TALENTS (one per tier, MaxTalentTiers from NumTalentsAtLevel), RemoveTalent spell effect, dual-spec switch swaps spec spells, spec reset at the trainer, glyph slots in retail order + CMSG_REMOVE_GLYPH, CMSG_SET_LOOT_SPECIALIZATION + lootSpecId load. Evidence and open items: `re-notes.md` "Specializations, talents, glyphs".

## Transmog outfits + collection burst (2026-10-18)
- Outfit UF, 6 TransmogOutfit/Situation DB2 stores + GlobalCurve, CMSG_TRANSMOG_OUTFIT_NEW/UPDATE_INFO/UPDATE_SITUATIONS/UPDATE_SLOTS with replies, persistence in `character_transmog_outfit*`, VisibleItems from the viewed outfit, SMSG_DISMOUNT, ACCOUNT_TRANSMOG_SET_FAVORITES_UPDATE, ACCOUNT_ITEM_COLLECTION_DATA. Not client-tested yet. Evidence and open items: `re-notes.md` "Transmog outfits and collection burst".

## Edit Mode layout save fix (2026-10-18)
- ChrSpecialization.db2 store ported from TC master (layout DAB4CA4B, 48 rows). SMSG_UPDATE_TALENT_DATA and PlayerData::CurrentSpecID now carry the class's initial spec (OrderIndex 4, e.g. Hunter 1448); without a ChrSpecialization ID, C_EditMode.SetActiveLayout (0x141C43830) refuses to save. Chosen specs come with the MoP talent rework.

## Monk basics (2026-10-18)
- Phase 3/4 step 3 code and data done (not committed, not yet client-tested): Chi/Energy are DB2-driven already; Jab/Roll/Provoke scripts, stance at first login. See `phase3-4-plan.md` "Step 3 status".

## Wandering Isle (2026-10-18)
- Phase 3/4 step 4 code and data done (not committed, not yet client-tested): see `phase3-4-plan.md` "Step 4 status".
- 2026-10-19 sniff audit (loot, conditions, patrols, speeds, spawn state, AT greetings): `wandering-isle-sniff-diff.md` "Audit".
- Mount creature templates for 117 SPELL_AURA_MOUNTED entries world lacked (`gen_mount_creatures.ts`, `2026_10_19_11_world.sql`).

## Pandaren + Monk character create (2026-10-18)
- Phase 3/4 step 2 code and data done (not committed, not yet client-tested): see `phase3-4-plan.md` "Step 2 status".

## Enter world reached (2026-10-18)
- Client 70449 logs in, enters Northshire, moves, teleports; all 302 UPDATE_OBJECTs of the session parse with the WPP 554 reader, every other packet type matches `sniffcheck`.
- Sources: 16 real 5.5.4 sniffs (ymir; 68077, 70268, 70449), list in `sniff-wishlist.md`. Update fields: `uf554-deltas.md`. Packet layouts: `tools/mop-re/sniffcheck` (244 opcodes, 239 matched, 5 fixed).
- Last fixes found from our own packet log: create-block `ThisIsYou` bit position (5.5.1+), `HasDriveStatus` bit, 64-bit action buttons in player create data, PerksVendorItem 5.5 layout, empty anim state 1858 (was Cata 1798 → client crash in AnimationData lookup), SETUP_CURRENCY Flags byte; plus NON_MELEE_DAMAGE_LOG, ABSORB_LOG, glue game rules, whisper target length.
- Unknown server opcodes 0x46022E/0x460059/0x460052: client handler slot never set, so the client ignores them (no need to send).

## Update fields 5.5.4 (2026-10-18)
- UPDATE_OBJECT update fields ported to the sniff-derived 5.5.4 layout (uf_check: 0 diffs vs WPP 554 v4); see `update-fields-plan.md` "5.5.4 deltas ported".

## Opcode round 4 + layout pass (2026-10-18)
- REA now runs **attached** to the user's IDA GUI database (no re-analysis); see `tools/mop-re/verify/AGENT.rea.md`.
- Opcodes: only names MoP uses are verified; retail-only families (garrison, housing, delves...) stay `TODO(verify)` behind the send guard. Round 4: p00 (26 server-used names) and q00 (41 MoP-era names) → +9 anchors, nothing moved; the rest are order-only (handler globals never written).
- Layouts: `tools/mop-re/pe/tc_layouts.py` compares every server Write()/Read() with the client; fixers L1-L4 fixed ~45 packets/structs from client code (`re-notes.md` "5.5.4.70449 layout pass"). L5 (auction, guild, PvP, LFG, calendar, tickets) in progress.

## Re-baseline to 5.5.4.70449 (2026-10-18)
- Opcodes: every name keeps its 70032 value, proven by a build-to-build diff of all 2482 packets (`opcode-harvest.md` "70032 → 70449"). `Opcodes.h` banner only.
- **Still open for 70449:** `build_info`/`build_auth_key`/`realmlist.gamebuild` rows (auth key must be captured again), update-field layout and DB2 layout hashes not re-checked yet.
- Round 3 finished on 70449 with REA (`verify/AGENT.rea.md`, chunks re-addressed by `pe/rebase_chunks.py`): s22 31 proven / 9 ambiguous, s23 36 / 1. +67 anchors, no value moved (leave-one-out 2705 reproduced, 0 contradicted). Three quest proofs that lacked handler evidence were checked by hand (game errors, Lua `QUEST_ACCEPT_CONFIRM`).
- **Server layout diffs found (not fixed yet):** AURA_POINTS_DEPLETED slot u16, QUEST_PUSH_RESULT result u32, QUEST_GIVER_REQUEST_ITEMS +2 u32, GOSSIP_QUEST_UPDATE +1 u32, LEARNED_SPELLS +1 u32, PET_SPELLS_MESSAGE / SPELL_NON_MELEE_DAMAGE_LOG +2 u32, SPELL_INTERRUPT_LOG trailing bit, SPELL_GO tail order. Table: `tools/mop-re/out/70449/verify/layout-diffs.md` (gitignored; copied into `re-notes.md` when fixed).
- Remaining ambiguous: 4 MOVE_SET_ADV_FLYING_* slots (handler global never written, client ignores them), INVALIDATE_PLAYER (0x630007 vs 0x630008), PLAYER_SKINNED, PLAYER_IS_ADVENTURE_MAP_POI_VALID, 2 PLAYER_AZERITE_*, OPEN_CONTAINER. 300 SMSGs still `TODO(verify)` and blocked by the send guard.
- REA's IDA provider cannot attach to the existing `.i64` files: `open_binary` on the exe starts a fresh full auto-analysis in `%TEMP%` (stopped). A fresh REA analysis of 70449 now exists (temp DB, ~25 min to build); its session degraded to `unreadable_output` after two parallel verifiers, and `read_bytes`/`search_bytes` are unsupported with the IDA provider, so byte/string lookups go through the static `pe/` scripts.

## Phase 2b opcode verification — PAUSED (2026-10-12)
Every packet name is being proven from client code in IDA (method: `opcode-harvest.md`, steps 1–7; verifier brief `tools/mop-re/verify/AGENT.md`).
- Done: round 1 (`chunks/` c00–c11; the u00–u04 names were folded into round 2), round 2 (`chunks2/` r00–r22), round 3 rechecks s00–s21 (`chunks3/`). ~1200 values proven (anchors with evidence in `overrides/70032.json`), 300 SMSGs still unverified.
- **Resume:** run verifiers for `chunks3/s22.json` and `s23.json`; then `pe/apply_verified.py`, regenerate (pipeline in `opcode-harvest.md`), build, commit. Downgrade "proven" results that rest only on order/layout/Cata enums before applying. Max 6 verifiers at once.
- Server layout fixes from the verifiers: DONE 2026-10-12 (commit 1fb50d674c, table in `re-notes.md` "5.5.4 packet layout fixes"). Still open: second pass on `ambiguous`/`unknown`, FEATURE_SYSTEM_STATUS bit names, and the update-field layout for UPDATE_OBJECT (largest remaining Enter World risk).
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
