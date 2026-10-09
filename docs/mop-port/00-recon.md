# Phase 0 — Reconnaissance

Date: 2026-10-08. No code changes were made in this phase.

## 1. Baseline and target

| | Value | Source |
|---|---|---|
| Base | TrinityCore `cata_classic` @ `0614c9fd941` (2026-10-03) | `git log` |
| Base client build | 4.4.2.60895 (newest row in `build_info`) | `sql/base/auth_database.sql` |
| Target client build | **5.5.4.70032** | `WowClassic.exe` FileVersion, `.build.info`, and the dump at `d:\WoW\World of Warcraft\_classic_\WowClassic_dump.exe` all agree |
| Product / CASC code | `wow_classic` (same as Cata Classic) | `.build.info`, `src/tools/map_extractor/System.cpp:115` |

## 2. Upstream state

- `cata_classic` is active: 1296 commits since 2026-07-01, the latest on 2026-10-03.
- Branches on TrinityCore/TrinityCore: `3.3.5`, `cata_classic`, `master`, `wotlk_classic`. **There is no MoP Classic branch.**
- No community 5.5.x server core was found. The existing MoP cores target 5.0.5 (JadeCore/MoP-Dev forks) or 5.4.8 (SkyFire, NuskyCore) and use a different protocol generation.
- TrinityCore does have MoP Classic **tooling**:
  - `TrinityCore/WowPacketParser` has a module, `WowPacketParserModule.V5_5_0_61735`, with opcode tables for 5.5.0, 5.5.1, 5.5.2 and 5.5.3, plus update fields and parsers. Builds are listed up to 5.5.3.67509; 5.5.4 is not there yet. Snapshot: WPP `9c0e672`, 2026-10-05.
  - `TrinityCore/ymir` is a sniffer that supports MoP Classic 5.5.x, and it has an open issue against 5.5.4.70032.
- **Recommendation:** base on `cata_classic` as planned, since there is no better base to adopt. Use WowPacketParser as the main cited reference and the 70032 dump as ground truth.

## 3. Protocol diff

### 3.1 Auth / login (bnetserver)
- The product is still `wow_classic`, and the strings `wow_classic`, `5.5.4`, `70032` and `WoWC` are present in the 70032 dump. The Battle.net flow is therefore expected to be structurally unchanged: REST login, protobuf `AuthenticationService` and `GameUtilitiesService` realm list/join.
  - TODO(verify): check against a real login. The protobuf service hashes and method sets in `src/server/proto` have not been diffed against 70032 yet.
- **Required for 70032:** a `build_info` row (5,5,4,70032) and `build_auth_key` rows (16-byte key per platform/arch/type). That key enters the HMAC-SHA512 digest in `WorldSocket::HandleAuthSessionCallback` (`WorldSocket.cpp:726-749`). **The key for 70032 is unknown.** It has to be recovered from the client binary, and no public source for 5.5.x keys was found.
- A client-side connection launcher is needed to point the client at a custom portal. This is out of scope for server code. The user has their own launcher tooling, and nothing here should ship anything that bypasses client protections.

### 3.2 Opcodes
Opcode counts and value matches:

| Comparison | Same value | Changed | Only in first | Only in second |
|---|---|---|---|---|
| This tree vs WPP 4.4.2 | **1673** | 0 | 0 | 19 |
| WPP 4.4.2 vs 5.5.0 | 0 | 1687 | 5 | 283 |
| WPP 5.5.0 vs 5.5.3 | 0 | 1812 | 158 | 1 |
| This tree vs WPP 5.5.3 | 227 | 1433 | 13 | 153 |

- The tree matches WPP 4.4.2 exactly, so WPP tables are a reliable reference for this codebase.
- **Every minor patch renumbers essentially all opcodes.** Values are `(group << 16) | index`; the groups shift (for example `CMSG_AUTH_SESSION` is 0x3A0001 in 4.4.2, 0x3B0001 in 5.5.0 and 0x390001 in 5.5.3), and indices shift where opcodes are inserted. **5.5.4.70032 values must come from the dump.** The 5.5.3 table gives names and order, not values.
- New in 5.5.x (153 names): pet battles (`PET_BATTLE_*`, `JOIN_PET_BATTLE_QUEUE`, `CAGE_BATTLE_PET`), `LEARN_TALENTS` (tier talents), pet specialization, loot specialization, challenge mode / mythic+ leaders, `NEUTRAL_PLAYER_SELECT_FACTION` (Pandaren), item upgrade, black market, `UPDATE_CLASSIC_TALENT_DATA`, scenario POI, and more.
- Removed in 5.5.x (13): void storage opcodes, `STABLE_PET`, `REPORT_*`, `VAS_*`, `FORCE_OBJECT_RELINK`, `PVP_SEASON`, `ARENA_PREP_OPPONENT_SPECIALIZATIONS`.
- Opcode values for the first milestone's flow (TODO(verify): 70032 values come from the dump):

| Opcode | 4.4.2 (this tree) | 5.5.3 (WPP) |
|---|---|---|
| CMSG_AUTH_SESSION | 0x3A0001 | 0x390001 |
| SMSG_AUTH_CHALLENGE | 0x420000 | 0x410000 |
| SMSG_AUTH_RESPONSE | 0x3B0001 | 0x3A0001 |
| CMSG_ENUM_CHARACTERS | 0x390014 | 0x380014 |
| SMSG_ENUM_CHARACTERS_RESULT | 0x3B0018 | 0x3A0018 |
| CMSG_CREATE_CHARACTER | 0x39006E | 0x380070 |
| CMSG_CHAR_DELETE | 0x3900CA | 0x3800CC |
| CMSG_PLAYER_LOGIN | 0x390016 | 0x380016 |
| SMSG_LOGIN_VERIFY_WORLD | 0x3B0030 | 0x3A0030 |
| SMSG_UPDATE_OBJECT | 0x4B0000 | 0x4A0000 |

### 3.3 Packet structures
- WPP 5.5 adds parser files over 4.4: `ArenaHandler`, `ArtifactHandler`, `AuthenticationHandler`, `CalendarHandler`, `ChallengeModeHandler`, `IslandHandler`, `MythicPlusHandler`, `VoiceChatHandler`, plus 1.15.8-shared `MovementHandler1158`, `SpellHandler1158` and `UpdateHandler1158`. **Movement, spell and update-object packets follow the newer Classic-family layout**, shared with Classic Era 1.15.8.
- A field-level diff of the char enum, create and enter-world packets is the first task of Phase 2. It isn't done yet.

### 3.4 Update fields
WPP 4.4.2.59185 compared with 5.5.3.64802:
- **11 new structures:** `AreaTriggerBox`, `AreaTriggerCylinder`, `AreaTriggerOrbit`, `AreaTriggerPolygon`, `AreaTriggerSphere`, `AreaTriggerSplineCalculator`, `ForceSetAreaTriggerPositionAndRotation`, `GameObjectAssistActionData`, `LeaverInfo`, `PetCreatureName`, `UnitAssistActionData`.
- Field changes:
  - `UnitData` +6: DriveCapabilityID, AssistActionData, and four still-unnamed `Unk553_*` fields.
  - `PlayerData` +4: CurrentCombatTraitConfigSubTreeID, LeaverInfo, HasLevelLink, PetNames.
  - `ActivePlayerData` +3/−1: +ToyFlags, +WarbandScenes, +Field_17B8, −QuestCompleted.
  - `AreaTriggerData` grows from 19 to 40 fields (shape and movement now live in update fields).
  - `GameObjectData` +AssistActionData; `QuestLog` +ObjectiveFlags; `VisibleItem` +2; `TraitEntry` +BonusRanks; `StablePetInfo` +Specialization; `UnitChannel` +StartTimeMs/Duration.
- Several of the new structures (AreaTrigger shapes, AssistActionData, LeaverInfo) already exist in TrinityCore `master` (retail), so their implementations can be ported from there. That lowers the risk.
- Differences between 5.5.3 and 5.5.4.70032 haven't been checked yet (TODO(verify)). Method: compare WPP against the descriptor tables in the dump.

## 4. Client data

### 4.1 DB2
Layout hashes per table come from WoWDBDefs (`wowdev/WoWDBDefs` @ `e3df370`, 2026-10-07), which covers both 4.4.2.60895 and 5.5.4.70032.
- **Sanity check:** all 815 layout hashes in `DB2Metadata.h` match WoWDBDefs for 60895.
- **Dump check:** 14 of 15 sampled 70032 layout hashes appear in the dump. Map's was not found; TODO(verify).

| | Count |
|---|---|
| DB2 metas in this tree | 815 |
| Unchanged layout in 70032 | 527 |
| Changed layout | 273 |
| Absent in 70032 | 15 (mostly Garrison mission tables, plus `PVPItem`, `LFGDungeonExpansion`) |
| **Loaded by the server (`DB2Stores.cpp`)** | 265 |
| **Loaded and changed** | **111** |
| Tables in 70032 that don't exist in 60895 | 144 |

- The loaded tables that changed include the core ones: `ChrClasses`, `ChrRaces`, `ChrRaceXChrModel`, `ChrCustomizationOption`/`Req`, `CharacterLoadout`, `Talent`, every major `Spell*` table, `Item`/`ItemSparse`/`ItemEffect`, `AreaTable`, `MapDifficulty`, `Difficulty`, `CreatureDisplayInfo*`, `QuestV2`, `PlayerCondition`, `Achievement`, `Criteria`, `CurrencyTypes`, `Faction*`, `UiMap` and `BattlePetAbility`. The full list is reproducible with the script described in section 7.
- Many of the 144 new tables are retail-only (Housing/Decor, Neighborhood, Crafting orders) and present in the client but unused by MoP gameplay. The ones that matter for MoP are `ChallengeModeReward`, `MythicPlusSeason*`, `SpellEmpower`, `CooldownSet*` and `WarbandScene*`.
- Each changed loaded table touches `DB2Structure.h`, `DB2LoadInfo.h`, `DB2Metadata.h`, the hotfix DB schema (`sql/base`, hotfixes) and the hotfix prepared statements.
- **Recommendation:** generate the DB2 structs and metadata from WoWDBDefs for 70032 rather than editing them by hand, and check the layout hashes against the dump.

### 4.2 CASC and extractors
- The CASC product is still `wow_classic`, so CascLib opening should work unchanged (TODO(verify) on a real run).
- `map_extractor` reads `Map.db2` and `LiquidMaterial.db2` through extractor LoadInfo. `Map`'s layout hash is unchanged between 60895 and 70032 according to WoWDBDefs; `LiquidMaterial`'s changed. ADT/WMO/M2 format changes between 4.4 and 5.5 are unknown; test by running the extractors in Phase 3.

## 5. MoP systems missing from cata_classic

| System | State in this tree | Size of gap |
|---|---|---|
| Monk class | `CLASS_MONK = 10` exists (shared enum); no `spell_monk.cpp`, no class data or AI | Large (Phase 4) |
| Pandaren race (24/25/26) | Commented out in `RaceMask.h`; no neutral-faction selection (`NEUTRAL_PLAYER_SELECT_FACTION` is missing) | Medium |
| Talents / specializations | Cata point-based trees (`LearnTalent(id, rank)`, `SetPrimaryTalentTree`) | **Large rework**: MoP tier talents (`LEARN_TALENTS`), spec choice, loot spec, pet specs |
| Glyphs | Cata prime/major/minor model | Medium (MoP major/minor, different slots) |
| Pet battles | `BattlePetMgr` journal only; no battle engine; no `PET_BATTLE_*` opcodes | Large (Phase 6) |
| Scenarios | `Scenario`, `InstanceScenario`, `ScenarioMgr` exist | Medium: content and MoP scenario steps |
| Challenge modes | Almost none (5 files mention it) | Large (Phase 6) |
| Black market, item upgrade, transmog | Partial (packets exist for some) | Medium |
| Void storage | Present in Cata, removed in 5.5 client opcodes | Remove or disable |
| Archaeology | Present (Cata) | Carry over |

SkyFire 5.4.8 is the reference for the game logic of these systems. Its protocol is not usable.

## 6. Open questions

1. **Multi-build support.** Do we keep Cata Classic 4.4.2 clients working, or switch the tree to MoP only?
   - TrinityCore selects builds per row at runtime only for auth (`build_info`). Opcodes, update fields and DB2 structs are compile-time and single-version, so supporting both clients would mean keeping two protocol sets.
   - **Recommendation: MoP only.** Keep upstream mergeability by changing protocol files in place, the way TrinityCore itself moves between Classic builds.
   - This is an expensive decision: it sets the schema and hotfix DB shape. **Needs your call.**
2. **`build_auth_key` for 70032.** How do we obtain it? Proposal: recover it from the dump in Phase 1 via static analysis. Interop only; it's required for any custom server.
3. **World DB.** cata_classic's TDB targets 4.4.2 content. Do we start from TDB `cata_classic` and add MoP content later via conversion scripts (Phase 4)? SkyFire's world DB license and provenance must be checked before any import.
4. **Build environment.** Do MySQL 8, OpenSSL 3, Boost ≥ 1.84 and VS 2022 already exist on this machine? Not checked yet.
5. **Where does the private repo live** (GitHub private, self-hosted, …)? It's needed before Phase 5's sync tooling can push branches.

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Blizzard ships 5.5.x builds often, and **every build renumbers opcodes**, and often update fields and DB2 layouts too | Every client patch breaks the server | Re-dump per build (the user already does this). Build tooling that regenerates opcode, UF and DB2 tables from the dump, WPP and WoWDBDefs so a re-baseline is mechanical. Pin one target build at a time. |
| No public 5.5.4 references yet (WPP stops at 5.5.3.67509) | Slower verification | The dump is ground truth. Contribute back to WPP/ymir if useful. |
| Protocol files are hot spots for upstream merges (`Opcodes.*`, `UpdateFields.*`, `DB2*`) | Conflicts on every sync | Treat these files as "ours" in sync tooling and regenerate them after a merge instead of resolving conflicts by hand. |
| 111 changed DB2 layouts plus hotfix schema changes | Large diff, risk of silent misreads | Generate from WoWDBDefs and validate layout hashes against the dump at load time (the loader already checks them). |
| Talent/spec rework touches Player, Spell and DB layers broadly | Merge conflicts, regressions | Isolate behind new files where possible. Schedule it after the first milestone. |
| `build_auth_key` cannot be recovered | Client can't authenticate | Investigate early in Phase 1, before other Phase 1 work. |
| Licensing of SkyFire or world DB content | Can't import it | Check licenses before Phase 4. Import via reproducible scripts only. |

## 8. Sources and reproduction

- TrinityCore `cata_classic` @ `0614c9fd941`.
- WowPacketParser @ `9c0e672`: `WowPacketParser/Enums/Version/V4_4_2_59185/Opcodes.cs`, `.../V5_5_0_61735/Opcodes.cs`, `.../V5_5_3_64802/Opcodes.cs`, and `WowPacketParserModule.V5_5_0_61735/UpdateFields/V5_5_3_64802/*`.
- WoWDBDefs @ `e3df370`: `definitions/*.dbd`.
- Client: `WowClassic.exe` and the dump, both 5.5.4.70032. The dump was used read-only, for byte searches of layout hashes and strings.
- Method: the comparisons were ad-hoc Node scripts. They parse the TC `Opcodes.h` enum, the WPP `Opcodes.cs` dictionaries, the WPP UF class fields, and the `DB2Metadata.h` layout hashes checked against `.dbd` `LAYOUT`/`BUILD` blocks. **Phase 5 tooling should make these permanent bun scripts.**
