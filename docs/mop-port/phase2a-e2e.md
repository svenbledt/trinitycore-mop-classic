# Phase 2a — live end-to-end (character create/delete)

Target: MoP Classic 5.5.4.70032. Branch `mop/phase2a`. Verifies create→list→delete for
**Human Warrior** (Alliance) and **Orc Warrior** (Horde), each first-attempt, no crash.

## Setup
1. Build/install current branch: `cd contrib/mop-dev && docker compose --profile build run --rm builder`.
2. Start the stack: `docker compose up -d db bnetserver worldserver` (MySQL 8.4 + servers on 1119/8081/8085/8086).
3. Launch the client via the Burralis launcher: `F:/WorkDir/burralis-launcher/build/start-mop-dev.bat`
   (first login patches the CertStore before realm connect — Phase 1 fix).
4. Test account: `test@test` / `test` (GM).

## Expected per run
- Create: worldserver logs `CMSG_CREATE_CHARACTER` → `Create Character: <name> <guid>` → `SMSG_CREATE_CHAR` (CHAR_CREATE_SUCCESS); client returns to the character screen with the new character shown.
- List: the character renders with correct name/race/class/level (relog or realm reselect triggers `SMSG_ENUM_CHARACTERS_RESULT` with one record).
- Delete: `CMSG_CHAR_DELETE` → `deleted character: <name>` → `SMSG_DELETE_CHAR` (CHAR_DELETE_SUCCESS); character disappears; no crash.
- Watch for `No defined handler for opcode` on the create/delete path (should be none; `0x4400CC` = SERVER_TIME_OFFSET_REQUEST is expected and benign).

## Results

### Human Warrior (Alliance)
_(pending — paste worldserver log snippet: CMSG_CREATE_CHARACTER → SMSG_CREATE_CHAR, enum render, CMSG_CHAR_DELETE → SMSG_DELETE_CHAR)_

### Orc Warrior (Horde)
_(pending — same sequence; exercises a second race/faction's start data and customizations)_

### Remaining unmapped CMSGs observed
_(pending — list any `No defined handler` opcodes and whether fatal)_
