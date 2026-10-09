# MoP Classic port — status

Last updated: 2026-10-09

| | |
|---|---|
| Base | TrinityCore `cata_classic` @ `0614c9fd941` (4.4.2.60895) |
| Target | MoP Classic 5.5.4.70032 (dump at `d:\WoW\World of Warcraft\_classic_\WowClassic_dump.exe`) |
| Current phase | **2a — code-complete on `mop/phase2a`, pending live e2e** (char create/delete) |
| Next | Live e2e (Human + Orc Warrior) → final review → merge; then Phase 2b (enter-world + update fields) |

## Phase 2a (2026-10-09) — character creation & deletion
Branch `mop/phase2a`. Code + unit tests done (43/43 ctest, bun, codestyle green); the live-client create→list→delete loop is the remaining gate (`docs/mop-port/phase2a-e2e.md`).
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
