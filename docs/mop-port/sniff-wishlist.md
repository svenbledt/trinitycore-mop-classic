# Sniff wishlist (5.5.4.70449, updated 2026-10-18)

Opcodes the client binary cannot pin down statically (verifier verdict `ambiguous`: two or more
candidate values, handler global never written). A ymir sniff (`.pkt`) of a 70449 client doing the
listed action settles them. "Ours" = the value we use now (`TODO(verify)`).
Source: `tools/mop-re/out/70449/verify/results/{p00,q00,s22,s23}.json`.

Retail-only names (Azerite, adv. flying, essences, pings, emblems, cheats) are left out.

## Already received (2026-10-18)
11 ymir sniffs, builds 68077 and 70268 (login on the Wandering Isle, gossip, phasing, waypoints).
Our opcode values match them; the fork KaputterKerl/WowPacketParser `mop-70032-confirmed` (91 sniff-checked
opcodes) also agrees. Seen with our value, so taken as confirmed:
SMSG_MOVE_UPDATE 0x5E000E, SMSG_INVALIDATE_PLAYER 0x630007, CMSG_GET_ACCOUNT_CHARACTER_LIST 0x4400F0,
CMSG_LFG_LIST_GET_STATUS 0x440039, CMSG_DF_GET_JOIN_STATUS 0x440042, CMSG_BATTLE_PET_REQUEST_JOURNAL 0x44004E.
Own 70449 sniff (2026-10-18, 4 logins, 29750 packets) adds CMSG_MOVE_SET_VEHICLE_REC_ID_ACK 0x420032 and
CMSG_BATTLE_PET_REQUEST_JOURNAL_LOCK 0x44004D. SMSG_PLAY_TIME_WARNING (ours 0x4601AB) did not occur.
Friend 70449 sniff (216k packets) adds SMSG_MOVE_UPDATE_KNOCK_BACK 0x5E0010, SMSG_ON_CANCEL_EXPECTED_RIDE_VEHICLE_AURA 0x460194.
Duel/death sniffs (u4, u5): SMSG_CLEAR_RESURRECT 0x460013 seen; duel, corpse, reforge, transmog-outfit and role packets seen
with our values. No unnamed packet appears during the duels.
Battleground sniffs (u7, u8; 340k packets, 22k UPDATE_OBJECT): SMSG_GROUP_DESTROYED 0x460248 seen; all UPDATE_OBJECT parse,
all 212 packet types match TC. PvP spell modifiers and DR start still not seen.

## Next sniff: please
- **Build 5.5.4.70449** (current live), so nothing has to be mapped across builds.
- Start the capture **before logging in** and log in once (the login burst is the most valuable part).
- Main target is SMSG_UPDATE_OBJECT, so be near many object kinds: other players (a city), NPCs with
  vendors/flight masters, your own pet/minion, a vehicle or multi-seat mount, a bag swap and item equip,
  loot a corpse, a party member, an area-trigger spell (e.g. a ground AoE), a quest accept/complete.
- Then the rows below that are not crossed out.

## Unknown values the real server sends/receives (no name in our table)
| Value | Dir | Sizes seen |
|---|---|---|
| 0x46022E | S | 55-86 (frequent) |
| 0x4602E3 | S | 13, 109, 125, 1253 |
| 0x460059 | S | 22 |
| 0x460052 | S | 9 |
| 0x46036A | S | 0 |
| 0x3E017A | C | 9 |
| 0x440144 | C | 4 |
| 0x44013E | C | 1 |

## Enter-world / movement (most useful)
| Opcode | Ours | Trigger |
|---|---|---|
| ~~SMSG_MOVE_UPDATE~~ | 0x5E000E | seen in sniff |
| ~~SMSG_MOVE_UPDATE_KNOCK_BACK~~ | 0x5E0010 | seen in sniff |
| SMSG_MOVE_SET_CANNOT_SWIM | 0x5E0037 | rare; skip if not seen |
| ~~CMSG_MOVE_SET_VEHICLE_REC_ID_ACK~~ | 0x420032 | seen in sniff |
| CMSG_MOVE_DISMISS_VEHICLE | 0x420052 | dismiss a vehicle / multi-seat mount |
| ~~SMSG_ON_CANCEL_EXPECTED_RIDE_VEHICLE_AURA~~ | 0x460194 | seen in sniff |
| ~~SMSG_INVALIDATE_PLAYER~~ | 0x630007 (or 0x630008) | seen in sniff |
| SMSG_CHECK_CHARACTER_NAME_AVAILABILITY_RESULT | 0x46001B | character create, type a name |
| ~~CMSG_GET_ACCOUNT_CHARACTER_LIST~~ | 0x4400F0 | seen in sniff |

## Combat / spells
| Opcode | Ours | Trigger |
|---|---|---|
| SMSG_CHAIN_MISSILE_BOUNCE | 0x46006C | Chain Lightning / bouncing spell |
| SMSG_TOTEM_DURATION_CHANGED | 0x460177 | shaman totem extended |
| SMSG_RESTART_GLOBAL_COOLDOWN | 0x660052 | GCD reset effect |
| SMSG_UNIT_DIMINISHING_RETURN_START | 0x460374 | not sent in duels or a battleground (sniffed 2026-10-18); maybe arena only |
| SMSG_SET_FLAT_SPELL_PVP_MODIFIER | 0x660027 | enter BG/arena with PvP-modified spells |
| SMSG_SET_PCT_SPELL_PVP_MODIFIER | 0x660028 | same |
| SMSG_REMOVE_SPELL_FROM_ACTION_BAR | 0x660043 | unlearn/spec change removing a spell |
| SMSG_SPEC_INVOLUNTARILY_CHANGED | 0x4601C7 | spec reset by server |
| SMSG_FORCE_ANIM | 0x4601FE | scripted NPC/emote animation |
| ~~SMSG_CLEAR_RESURRECT~~ | 0x460013 | seen in sniff |
| SMSG_PLAYER_SKINNED | 0x63000F | get skinned (insignia) in a BG |

## Group / PvP / instances
| Opcode | Ours | Trigger |
|---|---|---|
| ~~SMSG_GROUP_DESTROYED~~ | 0x460248 | seen in sniff |
| SMSG_GROUP_AUTO_KICK | 0x460249 | vote-kick in LFG |
| SMSG_SET_INSTANCE_LEAVER | 0x46036C | leave an LFG dungeon early |
| SMSG_UNSET_INSTANCE_LEAVER | 0x46036D | deserter wears off |
| SMSG_MEETING_STONE_FAILED | 0x460330 | meeting stone error |
| ~~CMSG_LFG_LIST_GET_STATUS~~ | 0x440039 | seen in sniff |
| ~~CMSG_DF_GET_JOIN_STATUS~~ | 0x440042 | seen in sniff |
| SMSG_BONUS_ROLL_EMPTY | 0x4600EF | bonus roll (coin) with no loot |
| SMSG_SCENARIO_UI_UPDATE | 0x4602B4 | scenario progress |
| SMSG_ARENA_CLEAR_OPPONENTS | 0x4600F4 | arena start/end |
| SMSG_BATTLEFIELD_PORT_DENIED | 0x4C000B | BG invite while not allowed |
| SMSG_BATTLEFIELD_STATUS_GROUP_PROPOSAL_FAILED | 0x4C000E | group BG queue declined |
| SMSG_PVP_MATCH_SET_STATE | 0x4C0032 | BG/arena start |
| SMSG_STOP_TIMER | 0x46003F | BG/arena start countdown ends |

## Pet battles, social, misc
| Opcode | Ours | Trigger |
|---|---|---|
| SMSG_SCENE_OBJECT_PET_BATTLE_FIRST_ROUND | 0x460088 | start a wild pet battle |
| SMSG_SCENE_OBJECT_PET_BATTLE_ROUND_RESULT | 0x460089 | every pet battle round |
| SMSG_SCENE_OBJECT_PET_BATTLE_REPLACEMENTS_MADE | 0x46008A | swap pet after one dies |
| ~~CMSG_BATTLE_PET_REQUEST_JOURNAL~~ | 0x44004E | seen in sniff |
| ~~CMSG_BATTLE_PET_REQUEST_JOURNAL_LOCK~~ | 0x44004D | seen in sniff |
| CMSG_CHAT_CHANNEL_MODERATE | 0x2F0016 | /moderate in own channel |
| SMSG_CHAT_DOWN / SMSG_CHAT_IS_DOWN | 0x4B0014 / 0x4B0015 | rare; skip |
| SMSG_GUILD_NAME_CHANGED | 0x520023 | rare; skip |
| SMSG_GOSSIP_REFRESH_OPTIONS | 0x640027 | gossip menu that updates while open |
| SMSG_QUEST_NON_LOG_UPDATE_COMPLETE | 0x640008 | world quest / bonus objective |
| SMSG_PLAYER_TUTORIAL_HIGHLIGHT_SPELL / UNHIGHLIGHT | 0x630016 / 0x630015 | new character tutorial |
| SMSG_GAME_OBJECT_UI_LINK | 0x4601C9 | click a GO that opens a UI |
| SMSG_OPEN_CONTAINER | 0x670006 | open a lockbox/container item |
| SMSG_VOID_STORAGE_FAILED / SMSG_VOID_TRANSFER_RESULT | 0x670000 / 0x670003 | use void storage |
| SMSG_PLAY_TIME_WARNING | 0x4601AB | rare; skip |
| SMSG_AREA_TRIGGER_PLAY_SPELL_VISUAL | 0x470002 | area-trigger spells |

Easiest: the sniffer logs in, walks in a city with other players, joins a dungeon via LFG, does one
pet battle, opens void storage and a lockbox. That covers about two thirds of the list.
