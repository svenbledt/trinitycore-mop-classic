# Phase 2a — Character Creation & Deletion (MoP Classic 5.5.4.70032)

**Status:** design / spec
**Depends on:** Phase 1 (merged) — client reaches the empty character screen.
**Part of:** Phase 2 (world connection). This is sub-project **2a**. Sub-project **2b** (enter-world + update fields) is separate and NOT covered here.

## Goal

A player can **create** a character in the MoP Classic 5.5.4 client, see it appear in the character list, and **delete** it — verified end-to-end against the live client. Canonical test character: **Human Warrior**.

## Scope

### Builds
- Correct 5.5.4 **opcodes** for the create/delete path: `CMSG_CREATE_CHARACTER`, `CMSG_CHAR_DELETE`, `SMSG_CREATE_CHAR`, `SMSG_DELETE_CHAR` (verify the existing values; fix via the Phase 1 method — client dispatch/getters + WPP 5.5.3 cross-check — if wrong).
- Correct 5.5.4 **packet layouts** for those packets: `CreateCharacter::Read`, `CharDelete::Read`, `CreateChar::Write`, `DeleteChar::Write` (bit widths, field order, flags such as `HardcoreSelfFound`/`UseNPE`, the `ChrCustomizationChoice` array).
- `SMSG_ENUM_CHARACTERS_RESULT` **per-character record** correctness — Phase 1 only validated it with zero characters; here it must render one real character (name, race/class/sex, level, position, items/display, customizations). This is the main new risk.
- **Create flow glue** as needed for 5.5.4: name validation, customization validation against the regenerated ChrCustomization DB2 stores, the DB insert, and the correct `CharacterCreateResult`/`CharDeleteResult` response codes.

### Does NOT build (explicitly)
- Entering the world, the enter-world handshake, or any update-field / player-object-update work — that is **2b**.
- Monk (no sourced create data yet; Phase 4). Any race/class lacking `player_classlevelstats` stays excluded as in Phase 1.
- Full customization coverage/validation for every race/class/appearance — only what Human Warrior creation needs plus not actively breaking others.
- Character customization *editing* (recustomize/barbershop), character boost, templates, trial/NPE flows, name-change/race-change.

## Decisions that are expensive to change later
- **No new DB schema.** Character creation uses the existing `characters` DB schema and `playercreateinfo`/`player_classlevelstats` (TDB). If a 5.5.4 field needs storing that the schema lacks, raise it before adding a column (migration over live data).
- **Opcode/packet values are data, not guesses.** Every changed opcode/offset traces to the client dump or WPP, marked `// TODO(verify)` otherwise (CLAUDE.md rule). The duplicate-opcode guard test from Phase 1 covers new opcode edits.
- **Enum record layout** is shared with 2b (the character list and the in-world object both read character fields); getting it right here avoids rework in 2b.

## Approach
Reuse the Phase 1 loop, per packet: confirm opcode + layout against WPP 5.5.3 and the 5.5.4 client dispatch/handlers in IDA → fix `Read()`/`Write()` → rebuild → create/delete Human Warrior with the live client via the launcher → read worldserver logs + the character list. Opcode fixes go through `tools/mop-re/overrides/70032.json` + regenerate.

## Testing
- Unit (Catch2 `tests/game/Opcodes.cpp`): assert the four create/delete opcodes' verified values; the duplicate-value guard already covers collisions.
- Unit where practical: packet Read/Write round-trips for the create/delete packets.
- End-to-end (manual, live client): create Human Warrior → appears in the list after relog/enum → delete it → list empty. Worldserver logs show `CMSG_CREATE_CHARACTER` → success result, `CMSG_CHAR_DELETE` → success.

## Open questions for review
1. Human Warrior as the canonical test character — confirmed. Any second race/class to validate (e.g. a Horde race) within 2a, or keep strictly one?
2. If the 5.5.4 `CMSG_CREATE_CHARACTER` layout adds fields we can't source from the client dump quickly, is it acceptable to read-and-ignore them with `// TODO(verify)` to unblock the flow?
3. Name-reservation / starter-edition / realm character-cap checks — enforce as upstream does, or relax on the dev stack for 2a?

## Review focus (inputs the tests above don't exercise)
- Creating a character whose name collides or is invalid (reserved, profanity, wrong length) → correct result code, no crash.
- `SMSG_ENUM_CHARACTERS_RESULT` with one character whose customization array is non-empty (the field the empty-list test never hit).
- Deleting a character that isn't the account's / a bad GUID → rejected, not processed.
