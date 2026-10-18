# Sniff layout check: TC port vs. retail 5.5.4.70449 sniffs

Date: 2026-10-18. Branch `mop/phase2b` (working tree as of this check). Report only; no source changes.

## Method

- Tool: `tools/mop-re/sniffcheck/` (new). `check.mjs` runs reader specs that transcribe TC's
  `Write()`/`Read()` field by field (ByteBuffer semantics: MSB-first bits, any byte read resets
  the bit position, packed GUID128 = lo mask, hi mask, non-zero bytes) against every instance
  of the opcode in the sniffs. A packet passes only if the spec consumes **exactly** all bytes.
  - `bun check.mjs <pkt...> [--only REGEX] [--show N]` summary per opcode
  - `bun check.mjs --trace <file>@<idx>` field-by-field decode of one packet
  - `--fixed` swaps in the corrected 5.5.4 layouts (`fixed` exports) for the mismatches below
- Spec files: `specs_movement.mjs`, `specs_spell.mjs`, `specs_spell2.mjs`, `specs_misc.mjs`,
  `specs_misc2.mjs`, `specs_spot*.mjs`.
- Data: 70449 sniffs `u2.pkt` (29.7k pkts) + `u3.pkt` (216k). The 70268 sniffs `s1..s11.pkt`
  were run as a second set; every verdict below holds on both sets (with `--fixed`, the whole
  suite passes 100% on both).
- Exact-consumption over thousands of varied-size instances is strong evidence for field order
  and widths, but not for field *meaning* or for equal-size swaps (e.g. two adjacent int32s).
  Where that matters it is called out.

## Summary

| Verdict | Count |
|---|---|
| Opcodes checked against 70449 sniffs | 244 |
| MISMATCH | 5 (4 byte-level: SETUP_CURRENCY, SPELL_NON_MELEE_DAMAGE_LOG, SPELL_ABSORB_LOG, CHAT_MESSAGE_WHISPER; 1 semantic: FEATURE_SYSTEM_STATUS_GLUE_SCREEN) |
| MATCH (exact consumption on every instance) | 239 — includes all 30 failing-in-WPP opcodes not listed above: TC's layout passes in full, so WPP 5.5.3 is simply outdated |
| UNCLEAR | none at opcode level; sub-branches never exercised by the sniffs are listed under "Untested branches" |
| NOT IMPLEMENTED in TC (STATUS_UNHANDLED, nothing to compare) | 11: SMSG_PARTY_MEMBER_PARTIAL_STATE, SMSG_FACTION_BONUS_INFO, SMSG_PET_BATTLE_ROUND_RESULT, SMSG_PET_BATTLE_FIRST_ROUND, SMSG_PET_BATTLE_REPLACEMENTS_MADE, SMSG_ADJUST_SPLINE_DURATION, SMSG_RESUME_CAST_BAR, SMSG_XP_GAIN_ABORTED, SMSG_ATTACK_SWING_LANDED_LOG, SMSG_UPDATE_ACCOUNT_DATA_COMPLETE (17 B), SMSG_MOTD (1 B) |

## Mismatches (ordered by impact on login / enter-world / movement)

### 1. SMSG_SETUP_CURRENCY — MISMATCH (sent at login)

TC: `MiscPackets.cpp:119` writes per record `int32 Type, int32 Quantity`, then 7 has-bits +
`WriteBits(Flags, 5)` (`:135`).

Correct 5.5.4 (same as WPP `V1_60_1_69876` / retail 11.2.5 layout):

```
uint32 Count
per record:
  int32  Type
  int32  Quantity
  uint8  Flags                 <- moved out of the bit stream, now a full byte
  bit    HasWeeklyQuantity
  bit    HasMaxWeeklyQuantity
  bit    HasTrackedQuantity
  bit    HasMaxQuantity
  bit    HasTotalEarned
  bit    HasNextRechargeTime
  bit    HasRechargeCycleStartTime   (7 bits, flush; no 5-bit Flags)
  [uint32 WeeklyQuantity] [uint32 MaxWeeklyQuantity] [uint32 TrackedQuantity]
  [int32 MaxQuantity] [int32 TotalEarned] [int64 NextRechargeTime] [int64 RechargeCycleStartTime]
```

Evidence: `u2.pkt@9819` (276 B, 26 records). Record 395 (Justice Points):
`8b010000 44b40500 04 00` = Type 395, Qty 373828, Flags 0x04, bits 0x00 (no payload).
Record 396: `8c010000 00000000 00 18 00d43000 00000000` = Flags 0, bits 0x18 → HasMaxQuantity +
HasTotalEarned → MaxQuantity 3200000, TotalEarned 0. Record 1901: `... 00 20 69b00500` → bits
0x20 = HasTrackedQuantity → 372841. TC layout: 1/16 ok (only the empty packet); fixed: 16/16.
With TC's layout the client misreads every record after the first non-empty one.

### 2. SMSG_SPELL_NON_MELEE_DAMAGE_LOG — MISMATCH (every spell hit)

TC `CombatLogPackets.cpp:39`: after ShieldBlock writes bits `Periodic, Flags:7, Debug, HasLog, HasContentTuning`.
9845/9845 instances leave 7 bytes (21 with ContentTuning).

Correct 5.5.4:

```
PackedGuid Me, PackedGuid CasterGUID, PackedGuid CastID
int32 SpellID, int32 SpellXSpellVisualID
int32 Damage, int32 OriginalDamage, int32 Overkill
uint8 SchoolMask
int32 Absorbed, int32 Resisted, int32 ShieldBlock
int32 Unk554          <- new, always 0 in sniffs   TODO(verify) name/position (see note)
int32 Flags           <- was 7 bits, now a full int32 (values 0x04,0x05,0x07,0x24,0x25,0x27)
bit Periodic, bit HasDebugInfo, bit HasLogData, bit HasContentTuning   (4 bits, flush)
[SpellCastLogData] [DebugInfo] [ContentTuningParams]
```

Evidence: `u2.pkt@2824` (75 B) tail after ShieldBlock: `00000000 25000000 00` → Unk554 0,
Flags 0x25, bits 0. Content-tuning case `u2.pkt@33337`: tail `00000000 04000000 10 1702 0000 a2190000 5a 14 78 04 00 70`
→ bit byte 0x10 = 4th bit = HasContentTuning, then 14-byte ContentTuningParams. Fixed: 9845/9845.
Note: this matches the 2.5.6 change in WPP (`HandleSpellNonMeleeDmgLog255`: Flags became int32, 4 bits),
except 5.5.4 has an extra int32 instead of ScriptVisualID after the visual. The new int32 is
always 0; slot 1 (Resisted) is also always 0 in these sniffs, so "Resisted, ShieldBlock, Unk554"
vs "Unk554, Resisted…": only ShieldBlock is pinned (non-zero only on physical spells, consistent with blocks). Confirm order in the client handler before naming.

### 3. SMSG_SPELL_ABSORB_LOG — MISMATCH

TC `CombatLogPackets.cpp:437` writes `uint32 Supporters.size()` + entries (`:446`) before the Crit bit.
5.5.4 has no supporter list (same as WPP 5.5.3 `HandleSpellAbsorbLog`):

```
PackedGuid Attacker, PackedGuid Victim, int32 AbsorbedSpellID, int32 AbsorbSpellID,
PackedGuid Caster, int32 Absorbed, int32 OriginalDamage, bit Crit, bit HasLogData, [SpellCastLogData]
```

Evidence `u3.pkt@27111` (50 B): after OriginalDamage at +45 (`7ea60100`) only one byte `00` remains
(bits). TC overruns on 246/246; fixed 246/246.

### 4. SMSG_FEATURE_SYSTEM_STATUS_GLUE_SCREEN — MISMATCH (semantic; char screen)

Byte layout is self-consistent (TC passes 46/46 when its zero-count vectors are modelled), but TC
puts the game rules into the wrong array. Retail (u2.pkt@9, 273 B) after the bit block:
counts at +83 = 2, +87 = 10, +91 = 1; after RealmHiddenAlert the arrays are:

```
A: count@+83  x { uint8, int32, int32 }   retail: (3,13,0) (2,5,0)      <- TC writes GameRuleValues here as {u8 Rule,i32,f32}
B: count@+87  x { int32 Rule, int32 Value, float ValueF }  retail: 10 rules (0x62,1) (0x5d,1) (0x6d,1) (0xad,1) ...  <- real GameRuleValuePair list
C: count@+91  x uint32                   retail: 1 entry
then DebugTimeEvents
```

The same two arrays appear in SMSG_FEATURE_SYSTEM_STATUS (count A at +57, GameRules at +61), where
TC already puts GameRules in B correctly. TC glue (`SystemPackets.cpp:240`, `:264`) sends
`GameRuleValues` in slot A with the rule truncated to uint8 and sends B/C as 0 — so the char-screen
client gets no game rules and a bogus A list. Fix: send GameRuleValues as B (int32 rule), A = 0.
Also: retail sends RealmHiddenAlert length 0 (no byte) when empty; TC's `len+1` + NUL is still
readable by a length-prefixed reader, so not a layout error.

### 5. CMSG_CHAT_MESSAGE_WHISPER — MISMATCH (client→server)

TC `ChatPackets.cpp:50` reads `targetLen = ReadBits(7)`. 5.5.4 sends 9 bits for the target length
(text length stays 11 bits; both lengths include the NUL).

Evidence `u3.pkt@55973` (32 B): `07000000 | 0fe06c97230698450 8 | 0300052b | 04 00 40 | "Shamisa\0" "asd\0"`.
Bits `00000100 0|0000000 0100|00000` → 9-bit target len 8, 11-bit text len 4. Only one instance
in the sniffs; "9 bits" vs "1 unknown bit + 8 bits" cannot be told apart from it. Fixed 1/1.

## Per-area results

Verdict MATCH = TC layout consumed every instance exactly (u2+u3, 70449). Counts are ok/total.

### Movement (MovementInfo-based and movement control) — MovementPackets.cpp:26/117, :615-1000

SMSG_MOVE_UPDATE 36436/36436 · SMSG_ON_MONSTER_MOVE 27455/27455 · CMSG_MOVE_SET_FACING_HEARTBEAT 2260/2260 · SMSG_FLIGHT_SPLINE_SYNC 1660/1660 · SMSG_MOVE_SPLINE_SET_RUN_SPEED 1001/1001 · SMSG_MOVE_SPLINE_SET_FLIGHT_SPEED 999/999 · SMSG_MOVE_SPLINE_SET_SWIM_SPEED 981/981 · SMSG_MOVE_SPLINE_SET_WALK_SPEED 981/981 · SMSG_MOVE_SPLINE_SET_RUN_BACK_SPEED 976/976 · CMSG_MOVE_HEARTBEAT 752/752 · CMSG_MOVE_SET_FACING 735/735 · CMSG_MOVE_STOP_STRAFE 643/643 · SMSG_MOVE_UPDATE_COLLISION_HEIGHT 494/494 · CMSG_MOVE_STOP 479/479 · CMSG_MOVE_SET_PITCH 446/446 · SMSG_MOVE_UPDATE_RUN_SPEED 414/414 · CMSG_MOVE_START_FORWARD 390/390 · CMSG_MOVE_START_STRAFE_RIGHT 320/320 · CMSG_MOVE_START_STRAFE_LEFT 320/320 · CMSG_MOVE_STOP_TURN 300/300 · SMSG_MOVE_SPLINE_UNROOT 286/286 · SMSG_MOVE_UPDATE_FLIGHT_SPEED 270/270 · SMSG_MOVE_SPLINE_ROOT 262/262 · CMSG_MOVE_FALL_LAND 213/213 · SMSG_MOVE_UPDATE_SWIM_SPEED 164/164 · CMSG_MOVE_START_TURN_LEFT 163/163 · SMSG_MOVE_UPDATE_RUN_BACK_SPEED 162/162 · CMSG_MOVE_START_TURN_RIGHT 159/159 · SMSG_MOVE_SET_COLLISION_HEIGHT 143/143 · CMSG_MOVE_SET_COLLISION_HEIGHT_ACK 143/143 · SMSG_THREAT_REMOVE 114/114 · CMSG_MOVE_JUMP 98/98 · CMSG_MOVE_START_BACKWARD 96/96 · SMSG_MOVE_SET_RUN_SPEED 88/88 · CMSG_MOVE_FORCE_RUN_SPEED_CHANGE_ACK 88/88 · CMSG_MOVE_STOP_ASCEND 66/66 · CMSG_MOVE_START_ASCEND 65/65 · SMSG_MOVE_SPLINE_ENABLE_GRAVITY 45/45 · SMSG_MOVE_UPDATE_TELEPORT 43/43 · SMSG_MOVE_SET_FLIGHT_SPEED 34/34 · CMSG_MOVE_FORCE_FLIGHT_SPEED_CHANGE_ACK 34/34 · CMSG_MOVE_SET_FLY 31/31 · CMSG_MOVE_SET_CAN_FLY_ACK 28/28 · CMSG_SET_ACTIVE_MOVER 26/26 · CMSG_MOVE_ENABLE_SWIM_TO_FLY_TRANS_ACK 24/24 · CMSG_MOVE_TIME_SKIPPED 22/22 · SMSG_MOVE_ROOT 22/22 · CMSG_MOVE_FORCE_ROOT_ACK 22/22 · SMSG_MOVE_UNROOT 20/20 · CMSG_MOVE_FORCE_UNROOT_ACK 20/20 · SMSG_MOVE_UPDATE_KNOCK_BACK 20/20 · CMSG_MOVE_SPLINE_DONE 19/19 · SMSG_MOVE_SET_CAN_FLY 16/16 · SMSG_MOVE_ENABLE_TRANSITION_BETWEEN_SWIM_AND_FLY 13/13 · SMSG_MOVE_UNSET_CAN_FLY 12/12 · SMSG_MOVE_SET_ACTIVE_MOVER 12/12 · CMSG_MOVE_INIT_ACTIVE_MOVER_COMPLETE 11/11 · SMSG_MOVE_DISABLE_TRANSITION_BETWEEN_SWIM_AND_FLY 11/11 · SMSG_MOVE_TELEPORT 11/11 · CMSG_MOVE_TELEPORT_ACK 11/11 · SMSG_MOVE_SET_RUN_BACK_SPEED 10/10 · SMSG_MOVE_SET_SWIM_SPEED 10/10 · CMSG_MOVE_FORCE_RUN_BACK_SPEED_CHANGE_ACK 10/10 · CMSG_MOVE_FORCE_SWIM_SPEED_CHANGE_ACK 10/10 · SMSG_LOOT_REMOVED 8/8 · CMSG_MOVE_WATER_WALK_ACK 7/7 · SMSG_NEW_WORLD 7/7 · CMSG_MOVE_INITIAL_OBJECT_UPDATE_COMPLETE_ACK 6/6 · SMSG_MOVE_DISABLE_GRAVITY 6/6 · CMSG_MOVE_GRAVITY_DISABLE_ACK 6/6 · SMSG_MOVE_ENABLE_GRAVITY 6/6 · CMSG_MOVE_GRAVITY_ENABLE_ACK 6/6 · CMSG_MOVE_KNOCK_BACK_ACK 6/6 · SMSG_MOVE_SET_WALK_SPEED 6/6 · CMSG_MOVE_FORCE_WALK_SPEED_CHANGE_ACK 6/6 · SMSG_MOVE_SET_LAND_WALK 4/4 · CMSG_MOVE_CHANGE_TRANSPORT 4/4 · SMSG_MOVE_SET_WATER_WALK 3/3 · CMSG_MOVE_START_DESCEND 3/3 · CMSG_MOVE_FALL_RESET 1/1 · SMSG_MOVE_SPLINE_DISABLE_GRAVITY 1/1 · SMSG_MOVE_UPDATE_WALK_SPEED 1/1

### Spells / combat log — SpellPackets.cpp, CombatLogPackets.cpp

SMSG_AURA_UPDATE 42094/42094 · SMSG_SPELL_GO 22434/22434 · SMSG_SPELL_START 10169/10169 · SMSG_ATTACKER_STATE_UPDATE 5211/5211 · SMSG_SPELL_HEAL_LOG 4470/4470 · SMSG_SPELL_PERIODIC_AURA_LOG 4129/4129 · SMSG_SPELL_CHANNEL_UPDATE 2011/2011 · SMSG_SPELL_ENERGIZE_LOG 1541/1541 · CMSG_CAST_SPELL 855/855 · SMSG_SPELL_PREPARE 678/678 · SMSG_CAST_FAILED 396/396 · SMSG_PLAY_SPELL_VISUAL_KIT 396/396 · SMSG_SPELL_EXECUTE_LOG 379/379 · SMSG_SET_FLAT_SPELL_MODIFIER 338/338 · SMSG_SPELL_FAILED_OTHER 325/325 · SMSG_SET_PCT_SPELL_MODIFIER 299/299 · SMSG_SPELL_CHANNEL_START 296/296 · SMSG_SPELL_FAILURE 185/185 · SMSG_PLAY_SPELL_VISUAL 127/127 · SMSG_SPELL_DISPELL_LOG 97/97 · SMSG_SPELL_DELAYED 71/71 · SMSG_SPELL_INSTAKILL_LOG 46/46 · SMSG_COOLDOWN_EVENT 34/34 · SMSG_SPELL_OR_DAMAGE_IMMUNE 34/34 · SMSG_CLEAR_COOLDOWN 27/27 · CMSG_CANCEL_CAST 25/25 · SMSG_SPELL_INTERRUPT_LOG 22/22 · SMSG_LEARNED_SPELLS 18/18 · SMSG_SEND_UNLEARN_SPELLS 12/12 · SMSG_SEND_KNOWN_SPELLS 11/11 · SMSG_SEND_SPELL_HISTORY 11/11 · SMSG_SEND_SPELL_CHARGES 11/11 · SMSG_UNDELETE_COOLDOWN_STATUS_RESPONSE 8/8 · SMSG_PET_SPELLS_MESSAGE 7/7 · SMSG_SPELL_COOLDOWN 4/4 · CMSG_USE_ITEM 3/3

### Login / char screen / enter world

SMSG_ACCOUNT_CRITERIA_UPDATE 2637/2637 · SMSG_DB_REPLY 1623/1623 · SMSG_TIME_SYNC_REQUEST 593/593 · CMSG_TIME_SYNC_RESPONSE 592/592 · SMSG_ITEM_ENCHANT_TIME_UPDATE 228/228 · CMSG_PING 213/213 · SMSG_PONG 213/213 · CMSG_DB_QUERY_BULK 69/69 · SMSG_INIT_WORLD_STATES 69/69 · SMSG_SERVER_TIME_OFFSET 38/38 · SMSG_UPDATE_WORLD_STATE 37/37 · SMSG_PHASE_SHIFT_CHANGE 26/26 · SMSG_ENTER_ENCRYPTED_MODE 19/19 · CMSG_UPDATE_ACCOUNT_DATA 19/19 · SMSG_CONNECT_TO 15/15 · CMSG_AUTH_CONTINUED_SESSION 15/15 · SMSG_ACCOUNT_DATA_TIMES 14/14 · SMSG_WEATHER 14/14 · SMSG_FEATURE_SYSTEM_STATUS_GLUE_SCREEN 13/13 · SMSG_UPDATE_TALENT_DATA 13/13 · SMSG_WORLD_SERVER_INFO 12/12 · CMSG_REQUEST_ACCOUNT_DATA 12/12 · SMSG_UPDATE_ACCOUNT_DATA 12/12 · SMSG_INSTANCE_INFO 12/12 · CMSG_REQUEST_PLAYED_TIME 11/11 · SMSG_PLAYED_TIME 11/11 · SMSG_QUERY_TIME_RESPONSE 11/11 · SMSG_CONTACT_LIST 10/10 · SMSG_SET_TIME_ZONE_INFORMATION 9/9 · CMSG_ENUM_CHARACTERS 9/9 · SMSG_TUTORIAL_FLAGS 9/9 · SMSG_ENUM_CHARACTERS_RESULT 9/9 · SMSG_SET_CURRENCY 6/6 · CMSG_PLAYER_LOGIN 5/5 · SMSG_BIND_POINT_UPDATE 5/5 · SMSG_CORPSE_RECLAIM_DELAY 5/5 · SMSG_INITIALIZE_FACTIONS 5/5 · SMSG_LOAD_EQUIPMENT_SET 5/5 · SMSG_FEATURE_SYSTEM_STATUS 5/5 · SMSG_ALL_ACHIEVEMENT_DATA 5/5 · SMSG_LOGIN_VERIFY_WORLD 5/5 · SMSG_LOGIN_SET_TIME_SPEED 5/5 · SMSG_ACCOUNT_MOUNT_UPDATE 5/5 · SMSG_ACCOUNT_TOY_UPDATE 5/5 · SMSG_ACCOUNT_HEIRLOOM_UPDATE 5/5 · SMSG_INITIAL_SETUP 5/5 · SMSG_LOAD_CUF_PROFILES 5/5 · SMSG_BATTLE_PET_JOURNAL 5/5 · CMSG_SEND_CONTACT_LIST 5/5 · CMSG_AUTH_SESSION 4/4 · SMSG_AUTH_RESPONSE 4/4 · SMSG_CACHE_VERSION 4/4 · SMSG_AVAILABLE_HOTFIXES 4/4 · CMSG_HOTFIX_REQUEST 4/4 · SMSG_HOTFIX_CONNECT 4/4 · CMSG_LOGOUT_REQUEST 4/4 · SMSG_LOGOUT_RESPONSE 4/4 · SMSG_LOGOUT_COMPLETE 3/3 · SMSG_RAID_DIFFICULTY_SET 3/3 · SMSG_UPDATE_ACTION_BUTTONS 2/2 · CMSG_CREATE_CHARACTER 1/1 · SMSG_CREATE_CHAR 1/1 · CMSG_CHAR_DELETE 1/1 · SMSG_DELETE_CHAR 1/1 · SMSG_SET_DUNGEON_DIFFICULTY 1/1

### Other (quests, party, LFG, queries, chat, threat, loot, ...)

SMSG_CRITERIA_UPDATE 7399/7399 · SMSG_EMOTE 3047/3047 · SMSG_THREAT_UPDATE 1924/1924 · SMSG_HIGHEST_THREAT_UPDATE 1163/1163 · CMSG_QUERY_CREATURE 1127/1127 · SMSG_QUERY_CREATURE_RESPONSE 1127/1127 · SMSG_ATTACK_STOP 1103/1103 · CMSG_QUERY_GAME_OBJECT 1086/1086 · SMSG_QUERY_GAME_OBJECT_RESPONSE 1086/1086 · SMSG_ATTACK_START 1034/1034 · SMSG_CANCEL_AUTO_REPEAT 519/519 · CMSG_QUEST_GIVER_STATUS_QUERY 471/471 · SMSG_QUEST_GIVER_STATUS 469/469 · SMSG_POWER_UPDATE 465/465 · SMSG_CHAT 462/462 · SMSG_AI_REACTION 320/320 · CMSG_SET_SELECTION 308/308 · SMSG_QUERY_QUEST_INFO_RESPONSE 245/245 · SMSG_BATTLEFIELD_STATUS_QUEUED 212/212 · SMSG_PARTY_KILL_LOG 192/192 · SMSG_THREAT_CLEAR 167/167 · SMSG_INVALIDATE_PLAYER 153/153 · CMSG_QUERY_GUILD_INFO 137/137 · SMSG_QUERY_GUILD_INFO_RESPONSE 137/137 · SMSG_LFG_QUEUE_STATUS 120/120 · CMSG_AREA_TRIGGER 116/116 · SMSG_PARTY_MEMBER_FULL_STATE 94/94 · CMSG_QUERY_PLAYER_NAMES 82/82 · SMSG_QUERY_PLAYER_NAMES_RESPONSE 82/82 · CMSG_SET_SHEATHED 82/82 · SMSG_LOOT_ROLL 80/80 · SMSG_SET_PROFICIENCY 77/77 · SMSG_QUERY_PET_NAME_RESPONSE 72/72 · CMSG_CHAT_ADDON_MESSAGE 70/70 · SMSG_QUEST_GIVER_STATUS_MULTIPLE 69/69 · CMSG_QUERY_PET_NAME 63/63 · SMSG_PLAY_OBJECT_SOUND 61/61 · SMSG_LFG_PLAYER_INFO 60/60 · SMSG_PARTY_UPDATE 58/58 · SMSG_GAME_OBJECT_DESPAWN 38/38 · CMSG_REQUEST_PARTY_MEMBER_STATS 31/31 · SMSG_QUEST_COMPLETION_NPC_RESPONSE 28/28 · SMSG_LFG_UPDATE_STATUS 28/28 · SMSG_REQUEST_CEMETERY_LIST_RESPONSE 23/23 · CMSG_QUEST_POI_QUERY 21/21 · SMSG_QUEST_POI_QUERY_RESPONSE 21/21 · SMSG_TEXT_EMOTE 18/18 · SMSG_QUEST_GIVER_QUEST_DETAILS 8/8 · SMSG_QUEST_UPDATE_ADD_CREDIT 7/7 · CMSG_CHAT_MESSAGE_CHANNEL 5/5 · SMSG_QUEST_GIVER_QUEST_COMPLETE 3/3 · CMSG_CHAT_MESSAGE_PARTY 3/3 · SMSG_TRAINER_LIST 2/2 · CMSG_SEND_TEXT_EMOTE 2/2 · CMSG_CHAT_MESSAGE_INSTANCE_CHAT 2/2 · CMSG_QUEST_PUSH_RESULT 1/1 · CMSG_CHAT_MESSAGE_SAY 1/1

### Notes on the opcodes that failed in WPP 5.5.3 but MATCH TC

- All MovementInfo users (CMSG_MOVE_*, ACKs, SMSG_MOVE_UPDATE*, MOVE_UPDATE_TELEPORT/KNOCK_BACK, SPLINE_DONE,
  collision-height ack): TC's MovementInfo (GravityModifier after MoveIndex, `MovementPackets.cpp:26/117`) is right.
  Example `CMSG_MOVE_JUMP` trace: MoveIndex 0 @53, GravityModifier 1.0 @57, 9 bits @61, fall block @63, 84/84 B.
- SMSG_SPELL_GO / SPELL_START / CMSG_CAST_SPELL / CMSG_USE_ITEM: TC's SpellTargetData (Unk28 GUID, Unk38 bit, Orientation/MapID
  bits, `SpellPackets.cpp:165/315`) is right; 5,715 GO/START instances carry Src/Dst locations and parse exactly
  **without** the u32 the KaputterKerl fork (aa35e2ddf) inserts between transport GUID and position — that fork change
  is a mis-guess; do not port it. Example `u2.pkt@14753`: Dst transport `0000` @114, X/Y/Z @116-127, Orientation @128, MapID 1 @132.
- SMSG_SPELL_FAILED_OTHER, PLAY_SPELL_VISUAL, SPELL_INTERRUPT_LOG, LEARNED_SPELLS, QUERY_QUEST_INFO_RESPONSE, QUEST_UPDATE_ADD_CREDIT,
  PARTY_MEMBER_FULL_STATE, PARTY_UPDATE (u16 difficulties, not WPP's u32), CMSG_REQUEST_PARTY_MEMBER_STATS, LFG_UPDATE_STATUS,
  CONNECT_TO, CMSG_AUTH_CONTINUED_SESSION, ACCOUNT_DATA_TIMES (20 timestamps), FEATURE_SYSTEM_STATUS, WORLD_SERVER_INFO (u16 + 4 GUIDs),
  ENUM_CHARACTERS_RESULT, CMSG_PLAYER_LOGIN (trailing bit), RAID_DIFFICULTY_SET, SET_DUNGEON_DIFFICULTY, CREATE_CHAR, DELETE_CHAR,
  TRAINER_LIST, CMSG_QUEST_PUSH_RESULT (u32 result), NEW_WORLD: TC layout matches; the client-derived layout passes already in the tree are confirmed.
- SMSG_FEATURE_SYSTEM_STATUS: TC sends the `{u8,i32,i32}` array count (+57) as 0; retail fills it with 2 entries (same data as the glue
  array A). Byte layout consistent; the 8 flag bytes' individual bits are not verifiable from sizes (TC sends most as 0).

## Untested branches (size-consistent, never exercised by the sniffs)

MovementForce (no force entries in any MOVE_UPDATE_TELEPORT; TC's 3 extra u32 vs. fork's GravityModifier float unproven),
SpellCastData runes/target points/ammo, QueryQuestInfo conditional texts, ItemInstance mod-count width (TC 7 bits, WPP 6; all 0),
SMSG_CHAT trailing optional u32, QUERY_PLAYER_NAMES Unused920/Unk554 blocks, INSTANCE_INFO lock entries, LOGOUT_COMPLETE SwitchGameMode,
LOAD_CUF_PROFILES bit meanings, glue/FSS vector order relative to DebugTimeEvents, NON_MELEE debug info.

## Reproduce

```
cd tools/mop-re/sniffcheck
bun check.mjs <S>/sniff70449/u2.pkt <S>/sniff70449/u3.pkt            # TC layouts: 4 non-MATCH lines
bun check.mjs <S>/sniff70449/u2.pkt <S>/sniff70449/u3.pkt <S>/sniff554/s*.pkt --fixed   # everything MATCH
bun check.mjs --trace <S>/sniff70449/u2.pkt@9819                       # field trace
```
