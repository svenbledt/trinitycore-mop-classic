# Upstream comments moved out of the source

The comment budget (CLAUDE.md, `tools/comment_budget.mjs`) caps `//` runs at 2 lines, upstream code included.
These upstream TrinityCore `cata_classic` comment blocks were replaced by a one-line pointer; the original text is kept here verbatim.

## ObjectMgr::GetClosestGraveyard

`src/server/game/Globals/ObjectMgr.cpp` (was line 6626):

```cpp
    // Simulate std. algorithm:
    //   found some graveyard associated to (ghost_zone, ghost_map)
    //
    //   if mapId == graveyard.mapId (ghost in plain zone or city or battleground) and search graveyard at same map
    //     then check faction
    //   if mapId != graveyard.mapId (ghost in instance) and search any graveyard associated
    //     then check faction
```

## ObjectMgr::LoadQuests (previous quest multimap)

`src/server/game/Globals/ObjectMgr.cpp` (was line 4362):

```cpp
    // create multimap previous quest for each existed quest
    // some quests can have many previous maps set by NextQuestId in previous quest
    // for example set of race quests can lead to single not race specific quest
```

## ObjectMgr::LoadPlayerInfo (spell race/class mask check)

`src/server/game/Globals/ObjectMgr.cpp` (was line 3866):

```cpp
                                // We need something better here, the check is not accounting for spells used by multiple races/classes but not all of them.
                                // Either split the masks per class, or per race, which kind of kills the point yet.
                                // else if (raceMask != 0 && classMask != 0)
                                //     TC_LOG_ERROR("sql.sql", "Racemask/classmask ({}/{}) combination was found containing an invalid race/class combination ({}/{}) in `{}` (Spell {}), ignoring.", raceMask, classMask, raceIndex, classIndex, tableName, spellId);
```

## ObjectMgr::LoadCreatureTemplates

`src/server/game/Globals/ObjectMgr.cpp` (was line 347):

```cpp
    //                                               0      1            2            3     4           5
    //                                       "SELECT entry, KillCredit1, KillCredit2, name, femaleName, subname, "
    //                                        6         7         8                  9
    //                                       "TitleAlt, IconName, RequiredExpansion, VignetteID, "
    //                                        10       11       12          13         14      15     16         17              18               19            20
    //                                       "faction, npcflag, speed_walk, speed_run, scale, `rank`, dmgschool, BaseAttackTime, RangeAttackTime, BaseVariance, RangeVariance, "
    //                                        21          22          23           24
    //                                       "unit_class, unit_flags, unit_flags2, unit_flags3, "
    //                                        25      26             27    28              29         30      31
    //                                       "family, trainer_class, type, PetSpellDataId, VehicleId, AIName, MovementType, "
    //                                        32                         33         34          35                         36
    //                                       "ctm.HoverInitiallyEnabled, ctm.Chase, ctm.Random, ctm.InteractionPauseTimer, ExperienceModifier, "
    //                                        37        38            39          40           41                        42
    //                                       "Civilian, RacialLeader, movementId, WidgetSetID, WidgetSetUnitConditionID, RegenHealth, "
    //                                        43                    44
    //                                       "CreatureImmunitiesId, flags_extra, "
    //                                        45          46
    //                                       "ScriptName, StringId FROM creature_template WHERE entry = ? OR 1 = ?");
```

## WorldSession::HandleAlterAppearance (result codes)

`src/server/game/Handlers/CharacterHandler.cpp` (was line 1645):

```cpp
    // 0 - ok
    // 1, 3 - not enough money
    // 2 - you have to sit on barber chair
```

## WorldSession::SendFeatureSystemStatus (CommunitiesEnabled)

`src/server/game/Handlers/CharacterHandler.cpp` (was line 1346):

```cpp
    // Enable guilds only.
    // This is required to restore old guild channel behavior for GMs.
    // The new club streams do not support sending messages through the guild channel when you are not in a guild.
```

## WorldSession::HandleCharCreateOpcode (allied race achievement)

`src/server/game/Handlers/CharacterHandler.cpp` (was line 611):

```cpp
    //if (raceExpansionRequirement->AchievementId && !)
    //{
    //    TC_LOG_ERROR("entities.player.cheat", "Expansion {} account:[{}] tried to Create character without achievement {} race ({})",
    //        GetAccountExpansion(), GetAccountId(), raceExpansionRequirement->AchievementId, charCreate.CreateInfo->Race);
    //    SendCharCreate(CHAR_CREATE_ALLIED_RACE_ACHIEVEMENT);
    //    return;
    //}
```

## Races enum (27+)

`src/server/game/Miscellaneous/RaceMask.h` (was line 54):

```cpp
    //RACE_NIGHTBORNE                 = 27, // TITLE Nightborne
    //RACE_HIGHMOUNTAIN_TAUREN        = 28, // TITLE Highmountain Tauren
    //RACE_VOID_ELF                   = 29, // TITLE Void Elf
    //RACE_LIGHTFORGED_DRAENEI        = 30, // TITLE Lightforged Draenei
    //RACE_ZANDALARI_TROLL            = 31, // TITLE Zandalari Troll
    //RACE_KUL_TIRAN                  = 32, // TITLE Kul Tiran
    //RACE_THIN_HUMAN                 = 33,
    //RACE_DARK_IRON_DWARF            = 34, // TITLE Dark Iron Dwarf DESCRIPTION Dark Iron Dwarf (RaceMask bit 11)
    //RACE_VULPERA                    = 35, // TITLE Vulpera DESCRIPTION Vulpera (RaceMask bit 12)
    //RACE_MAGHAR_ORC                 = 36, // TITLE Mag'har Orc DESCRIPTION Mag'har Orc (RaceMask bit 13)
    //RACE_MECHAGNOME                 = 37, // TITLE Mechagnome DESCRIPTION Mechagnome (RaceMask bit 14)
    //RACE_DRACTHYR_ALLIANCE          = 52, // TITLE Dracthyr DESCRIPTION Dracthyr (Alliance) (RaceMask bit 16)
    //RACE_DRACTHYR_HORDE             = 70, // TITLE Dracthyr DESCRIPTION Dracthyr (Horde) (RaceMask bit 15)
    //RACE_COMPANION_DRAKE            = 71,
    //RACE_COMPANION_PROTO_DRAGON     = 72,
    //RACE_COMPANION_SERPENT          = 73,
    //RACE_COMPANION_WYVERN           = 74,
    //RACE_DRACTHYR_VISAGE_ALLIANCE   = 75,
    //RACE_DRACTHYR_VISAGE_HORDE      = 76,
    //RACE_COMPANION_PTERRODAX        = 77,
    //RACE_COMPANION_NETHERWING_DRAKE = 80,
    //RACE_ROSTRUM_STORM_GRYPHON      = 82,
    //RACE_ROSTRUM_FAERIE_DRAGON      = 83,
    //RACE_EARTHEN_DWARF_HORDE        = 84, // TITLE Earthen DESCRIPTION Earthen (Horde) (RaceMask bit 17)
    //RACE_EARTHEN_DWARF_ALLIANCE     = 85, // TITLE Earthen DESCRIPTION Earthen (Alliance) (RaceMask bit 18)
    //RACE_HARRONIR                   = 86,
    //RACE_ROSTRUM_AIRSHIP            = 87,
```

## Races enum (12-21)

`src/server/game/Miscellaneous/RaceMask.h` (was line 39):

```cpp
    //RACE_FEL_ORC                  = 12,
    //RACE_NAGA                     = 13,
    //RACE_BROKEN                   = 14,
    //RACE_SKELETON                 = 15,
    //RACE_VRYKUL                   = 16,
    //RACE_TUSKARR                  = 17,
    //RACE_FOREST_TROLL             = 18,
    //RACE_TAUNKA                   = 19,
    //RACE_NORTHREND_SKELETON       = 20,
    //RACE_ICE_TROLL                = 21,
```
