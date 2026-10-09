# Phase 2a — Character Creation & Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player creates a Human Warrior in the 5.5.4.70032 client, sees it in the character list, and deletes it — verified against the live client.

**Architecture:** The create/delete/enum handlers and packets already exist from `cata_classic`. This plan verifies and fixes their 5.5.4 opcodes and byte layouts using the Phase 1 loop (WowPacketParser V5_5_0 + client-dump RE → fix `Read()`/`Write()` → rebuild → live-client test), then confirms the create-flow glue (name/customization validation, DB insert, result codes). No new subsystem, no DB schema change.

**Tech Stack:** C++20 (TrinityCore game lib), Catch2 tests, `tools/mop-re` (bun/TypeScript opcode+DB2 generators), Docker dev stack in `contrib/mop-dev`, Burralis launcher fork for the live client.

**Spec:** `docs/superpowers/specs/2026-10-09-phase2a-character-creation-design.md`

## Global Constraints
- Target build **5.5.4.70032** only. Never guess protocol constants — every opcode/offset/layout traces to the client dump or WowPacketParser V5_5_0_61735; mark anything unverified `// TODO(verify):` (CLAUDE.md).
- Keep diffs mergeable with upstream; MoP changes localized; don't refactor upstream code.
- Inline comments: 2 lines max (PostToolUse hook enforces; upstream comments included).
- Opcode value changes go through `tools/mop-re/overrides/70032.json` + regenerate via `tools/mop-re/src/gen_opcodes.ts`; never hand-edit `Opcodes.h` enum values (the generator owns `GetOpcodeArrayIndex`).
- Build/test through the Docker builder: `cd contrib/mop-dev && docker compose --profile build run --rm builder` (cmake + ctest). Tools tests: `cd tools/mop-re && bun test`.
- Canonical test characters: **Human Warrior** (Alliance) and **Orc Warrior** (Horde). Monk excluded (no create data until Phase 4).
- Rulings for 2a (from spec review): test both a Human Warrior and an Orc Warrior; **harvest every create/delete opcode from the client dump** (do not accept repo values on faith, even ones that look right); **do NOT relax validation** — enforce name-reservation, starter-edition, and realm character-cap exactly as upstream `cata_classic`. Unknown *non-opcode packet fields* with no client source may be read-and-ignored with `// TODO(verify)` (the only way to parse an unknown layout); validation logic is never relaxed.

## Review Focus
- Creating a character with an invalid/duplicate/reserved name → correct `CharacterCreateResult` code, no crash (Task 5 test).
- `SMSG_ENUM_CHARACTERS_RESULT` with ONE character whose customization array is non-empty — the layout the Phase 1 empty-list test never exercised (Task 3 test + live).
- Deleting a GUID not owned by the account / malformed → rejected, not processed (Task 4 test).
- A low-confidence result opcode (`SMSG_CREATE_CHAR`/`SMSG_DELETE_CHAR`) being wrong → client ignores/crashes on the result; caught by Task 1 verification + Task 2/4 live tests.
- Client sends a create/delete-adjacent CMSG we don't handle (e.g. the `0x4400CC` seen at the char screen) → logged as unhandled, session stays up (Task 5 live check).

---

## Task 1: Verify and fix the create/delete-path opcodes

**Files:**
- Modify: `tools/mop-re/overrides/70032.json`, `tools/mop-re/out/70032/match.json`
- Regenerate: `src/server/game/Server/Protocol/Opcodes.h`, `src/server/game/Server/Protocol/Opcodes.cpp`
- Test: `tests/game/Opcodes.cpp`

**Interfaces:**
- Consumes: Phase 1 opcode generator (`gen_opcodes.ts 70032 ../..`), the group-0x46 getter method (per-packet `mov [rdx], 46xxxxh` functions in `0x1405D0000-0x1405E0000`), `tools/mop-re/test/opcodes_unique.test.ts`.
- Produces: verified values for `CMSG_CREATE_CHARACTER`, `CMSG_CHAR_DELETE`, `SMSG_CREATE_CHAR`, `SMSG_DELETE_CHAR`.

- [ ] **Step 1: Record current values and WPP 5.5.3 references.** In `tools/mop-re/refs/wpp/.../V5_5_3_64802/Opcodes.cs` find the 4 opcodes; note WPP values. Current repo values: `CMSG_CREATE_CHARACTER=0x440070`, `CMSG_CHAR_DELETE=0x4400CD`, `SMSG_CREATE_CHAR=0x4601AF` (low-conf), `SMSG_DELETE_CHAR=0x4601B0` (low-conf).

- [ ] **Step 2: Verify the two SMSG result opcodes against the client.** Open the IDA session (`idb_open` the `.i64`, `prefer_gui`), scope `search_text "<idx>"` to `0x1405D0000-0x1405E0000` for the getter `mov [rdx], 46xxxxh`, map to WPP 5.5.3 names by index (group `0x3A`→`0x46`, confirm the neighbourhood like Phase 1 did for social-contract). Record the real `SMSG_CREATE_CHAR`/`SMSG_DELETE_CHAR` values + EAs in `docs/mop-port/re-notes.md`.

- [ ] **Step 3: Harvest the two CMSG opcodes from the client too** (no shortcuts). Do NOT accept the repo `CMSG_CREATE_CHARACTER=0x440070` / `CMSG_CHAR_DELETE=0x4400CD` on faith. Confirm each against the client — the CMSG send sites / the client's `mov [rdx], 44xxxxh` getter functions — cross-checked with WPP 5.5.3. Note: at the Phase 1 char screen the client sent an unmapped `0x4400CC`; determine what it is and whether `CMSG_CHAR_DELETE` is actually `0x4400CC` vs `0x4400CD`. Record EAs in `re-notes.md`.

- [ ] **Step 4: Apply via the generator.** Set the corrected values in `overrides/70032.json` and `out/70032/match.json` (`confidence: "client"`), resolve any collision the way Phase 1 did (move the mis-mapped neighbour to its real value), then `cd tools/mop-re && bun src/gen_opcodes.ts 70032 ../..`.

- [ ] **Step 5: Write/extend the opcode test.**
```cpp
// in tests/game/Opcodes.cpp, "Login path opcodes..." case or a new "Character create/delete opcodes" case
REQUIRE(CMSG_CREATE_CHARACTER == <verified>);
REQUIRE(CMSG_CHAR_DELETE == <verified>);
REQUIRE(SMSG_CREATE_CHAR == <verified>);
REQUIRE(SMSG_DELETE_CHAR == <verified>);
for (OpcodeServer op : { SMSG_CREATE_CHAR, SMSG_DELETE_CHAR })
    REQUIRE(GetOpcodeArrayIndex(op) >= 0);
```

- [ ] **Step 6: Run tests.** `cd tools/mop-re && bun test` (expect the `opcodes_unique` guard green, no duplicate values), then the Docker builder ctest. Expected: all pass.

- [ ] **Step 7: Commit.**
```bash
git add tools/mop-re/overrides/70032.json src/server/game/Server/Protocol/Opcodes.* tests/game/Opcodes.cpp docs/mop-port/re-notes.md
git commit -m "MoP/Phase2a: Verify create/delete-path opcodes for 5.5.4"
```

---

## Task 2: CMSG_CREATE_CHARACTER layout + SMSG_CREATE_CHAR result

**Files:**
- Modify: `src/server/game/Server/Packets/CharacterPackets.cpp` (`CreateCharacter::Read`, `CreateChar::Write`), `CharacterPackets.h` if fields change
- Reference: `src/server/game/Handlers/CharacterHandler.cpp:549` (`HandleCharCreateOpcode`)
- Test: live client; optional round-trip in `tests/game/` if a decode helper exists

**Interfaces:**
- Consumes: verified opcodes from Task 1; WPP `CharacterHandler.cs` `[Parser(Opcode.CMSG_CREATE_CHARACTER)]` and `SMSG_CREATE_CHAR`.
- Produces: a `CreateCharacter::Read` that parses the 5.5.4 client's create packet, and a `CreateChar::Write` the client accepts.

- [ ] **Step 1: Diff `CreateCharacter::Read` against WPP 5.5.3.** Current reads: name bits(6), hasTemplateSet bit, IsTrialBoost bit, UseNPE bit, HardcoreSelfFound bit, Race(u8), Class(u8), Sex(u8), Customizations count(u32), TimerunningSeasonID, name string, optional TemplateSet(i32), customizations. Compare field order, bit widths, and any 5.5.4-added/removed field against WPP `HandleCharacterCreate` for V5_5. Record differences in `re-notes.md`.

- [ ] **Step 2: Confirm against the client where WPP is silent.** For any field WPP (which stops at 5.5.3) doesn't settle, decompile the 70032 `CMSG_CREATE_CHARACTER` reader (find via the handler/opcode) to confirm the 5.5.4 read order. Unknown trailing fields: read-and-ignore with `// TODO(verify): <meaning>`.

- [ ] **Step 3: Apply layout fixes** to `CreateCharacter::Read` (and `CreateChar::Write` — currently `uint8 Code; ObjectGuid Guid;` — verify order/size vs WPP `SMSG_CREATE_CHAR`). One packet at a time; add `// 5.5.x layout: WowPacketParser V5_5_0_61735 CharacterHandler.cs:<line>` on each changed block.

- [ ] **Step 4: Build.** `cd contrib/mop-dev && docker compose --profile build run --rm builder`. Expected: exit 0, ctest green.

- [ ] **Step 5: Live test (create).** Start servers + client (launcher), log in, create a **Human Warrior**. Expected: worldserver logs `CMSG_CREATE_CHARACTER` then a success `SMSG_CREATE_CHAR`; the client returns to the character screen without error. If the client rejects the result, re-check Task 1 `SMSG_CREATE_CHAR` opcode and Step 3 layout. Save the log snippet to `docs/mop-port/phase2a-e2e.md`.

- [ ] **Step 6: Commit.**
```bash
git add src/server/game/Server/Packets/CharacterPackets.* docs/mop-port
git commit -m "MoP/Phase2a: CMSG_CREATE_CHARACTER + SMSG_CREATE_CHAR layouts for 5.5.4"
```

---

## Task 3: SMSG_ENUM_CHARACTERS_RESULT per-character record

**Files:**
- Modify: `src/server/game/Server/Packets/CharacterPackets.cpp` (`EnumCharactersResult::Write` and the per-character `CharacterInfo`/record writer), `CharacterPackets.h`
- Reference: `src/server/game/Handlers/CharacterHandler.cpp:324` (`HandleCharEnum`)
- Test: live client (the created Human Warrior must appear); WPP `SMSG_ENUM_CHARACTERS_RESULT`

**Interfaces:**
- Consumes: the created character from Task 2; WPP `CharacterHandler.cs` enum-result parser for V5_5.
- Produces: a per-character record the 5.5.4 client renders (name, race/class/sex, level, zone/map, position, guild, flags, customizations, equipment display).

- [ ] **Step 1: Diff the per-character record** writer against WPP 5.5.3 `SMSG_ENUM_CHARACTERS_RESULT` field-by-field (this is the record the Phase 1 empty-list test never exercised). Note the Phase 1 finding that `WarbandGroups` ordering differs; confirm the character-record field order, the customizations array, and the equipment/display block. Record in `re-notes.md`.

- [ ] **Step 2: Confirm against the client** for 5.5.4-specific fields (decompile the enum-result reader at `SMSG_ENUM_CHARACTERS_RESULT`'s client handler). Unknown fields → write zero/empty with `// TODO(verify):`.

- [ ] **Step 3: Apply** record-layout fixes. Keep the empty-list behaviour working (Phase 1).

- [ ] **Step 4: Build.** Docker builder; ctest green.

- [ ] **Step 5: Live test (list).** With the Human Warrior created, trigger the character list (relog or realm reselect). Expected: the character appears with correct name/race/class/level and no client crash; worldserver sends `SMSG_ENUM_CHARACTERS_RESULT` with one record. Save the log snippet.

- [ ] **Step 6: Commit.**
```bash
git add src/server/game/Server/Packets/CharacterPackets.* docs/mop-port
git commit -m "MoP/Phase2a: SMSG_ENUM_CHARACTERS_RESULT per-character record for 5.5.4"
```

---

## Task 4: CMSG_CHAR_DELETE + SMSG_DELETE_CHAR

**Files:**
- Modify: `src/server/game/Server/Packets/CharacterPackets.cpp` (`CharDelete::Read`, `DeleteChar::Write`) if layout changes
- Reference: `src/server/game/Handlers/CharacterHandler.cpp:863` (`HandleCharDeleteOpcode`)
- Test: live client; ownership check in the handler

**Interfaces:**
- Consumes: verified delete opcodes from Task 1; the created character from Task 2.
- Produces: a working delete returning the correct `CharDeleteResult` the client accepts.

- [ ] **Step 1: Verify `CharDelete::Read`** (currently just `>> Guid`) and `DeleteChar::Write` (`uint8 Code`) against WPP 5.5.3 `CMSG_CHAR_DELETE`/`SMSG_DELETE_CHAR`. Confirm the GUID is the only field and the result is a single code byte for 5.5.4; adjust if not.

- [ ] **Step 2: Confirm the handler rejects a GUID the account doesn't own.** Read `HandleCharDeleteOpcode` (`CharacterHandler.cpp:863`); ensure it already validates account ownership before deleting (upstream does). If a test harness for the handler exists, add one; otherwise this is a live + code-read check.

- [ ] **Step 3: Apply** any layout fix.

- [ ] **Step 4: Build.** Docker builder; ctest green.

- [ ] **Step 5: Live test (delete).** Delete the Human Warrior. Expected: worldserver logs `CMSG_CHAR_DELETE` → success `SMSG_DELETE_CHAR`; the character disappears from the list; no crash. Save the log snippet.

- [ ] **Step 6: Commit.**
```bash
git add src/server/game/Server/Packets/CharacterPackets.* docs/mop-port
git commit -m "MoP/Phase2a: CMSG_CHAR_DELETE + SMSG_DELETE_CHAR for 5.5.4"
```

---

## Task 5: Create-flow glue, name validation, and full end-to-end

**Files:**
- Reference/modify: `src/server/game/Handlers/CharacterHandler.cpp` (`HandleCharCreateOpcode:549` — name validation, customization validation, result codes), `src/server/game/Conditions`/DB2 customization stores as needed
- Test: live client full loop; `docs/mop-port/phase2a-e2e.md`, `docs/mop-port/STATUS.md`

**Interfaces:**
- Consumes: Tasks 1-4 (opcodes + packet layouts working).
- Produces: a verified end-to-end create→list→delete for Human Warrior; documented remaining `TODO(verify)` fields.

- [ ] **Step 1: Confirm customization validation** accepts the client's Human Warrior customizations. Read how `HandleCharCreateOpcode` validates `Customizations` against the ChrCustomization DB2 stores (regenerated in Phase 1). If validation rejects valid client input (DB2 mismatch), record the failing choice ids and fix the DB2/validation; if a 5.5.4 customization field is unsourced, relax to accept per the spec ruling with `// TODO(verify)`.

- [ ] **Step 2: Confirm result codes and keep full validation.** Ensure `HandleCharCreateOpcode` sends `CHAR_CREATE_SUCCESS` on success and the correct error otherwise. **Do NOT relax validation** — name-reservation, starter-edition, and realm character-cap must run exactly as upstream `cata_classic`. If a check wrongly blocks a valid create (e.g. due to a 5.5.4 data gap), fix the data/config, do not disable the check. If a check needs reference DB data the dev stack lacks, seed it rather than bypassing the check, and note it in `re-notes.md`.

- [ ] **Step 2b: Name-validation test (Review Focus).** Add a Catch2 test for `ObjectMgr::CheckPlayerName` (or the name-validation entry point `HandleCharCreateOpcode` uses) asserting a too-short/invalid name returns a failure code and a valid name passes. Run it; expected pass.
```cpp
// tests/game/CharacterName.cpp (new)
REQUIRE(ObjectMgr::CheckPlayerName("A", DEFAULT_LOCALE, false) != CHAR_NAME_SUCCESS); // too short
REQUIRE(ObjectMgr::CheckPlayerName("Testwarrior", DEFAULT_LOCALE, false) == CHAR_NAME_SUCCESS);
```
(If the exact signature differs, match the one `HandleCharCreateOpcode` calls; the point is a failing name is rejected without a crash.)

- [ ] **Step 3: Full build + all tests.** `cd contrib/mop-dev && docker compose --profile build run --rm builder` (ctest), `cd tools/mop-re && bun test`, `bash contrib/check_codestyle.sh`. Expected: all green.

- [ ] **Step 4: Full live e2e — both races.** Human Warrior AND Orc Warrior, each: create → appears in list → delete → list empty, first attempt, no crash. The Orc run exercises a second race/faction's start data and customizations. Watch worldserver for any `No defined handler for opcode` on the create/delete path; map any blocker CMSG (e.g. confirm what `0x4400CC` is) or confirm it's non-fatal. Record both full sequences + any remaining unmapped CMSGs in `docs/mop-port/phase2a-e2e.md`.

- [ ] **Step 5: Update docs + commit.** Mark 2a done in `docs/mop-port/STATUS.md`; summarise findings in `re-notes.md`.
```bash
git add src tests docs
git commit -m "MoP/Phase2a: Character create/delete end-to-end (Human Warrior); docs"
```

---

## Notes for the executor
- Packet layouts are discovered by RE, not pre-written here — that's deliberate (CLAUDE.md forbids guessing constants). Each task's "diff against WPP / confirm against client" steps ARE the work; the code you write is whatever the client requires, with a `// 5.5.x layout:` citation.
- The live client needs the Burralis launcher (`F:/WorkDir/burralis-launcher/build/start-mop-dev.bat`) and the Docker stack up (`contrib/mop-dev`: `docker compose up -d db bnetserver worldserver`). First login patches the CertStore on the first attempt now (Phase 1 fix).
- The dev stack keeps a GM test account `test@test` / `test`.
