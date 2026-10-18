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

## Unit::Update (spell event order)

`src/server/game/Entities/Unit/Unit.cpp` (was line 435):

```cpp
    // WARNING! Order of execution here is important, do not change.
    // Spells must be processed with event system BEFORE they go to _UpdateSpells.
    // Or else we may have some SPELL_STATE_FINISHED spells stalled in pointers, that is bad.
```

## Unit::RollMeleeOutcomeAgainst (outcome priority)

`src/server/game/Entities/Unit/Unit.cpp` (was line 2362):

```cpp
    // melee attack table implementation
    // outcome priority:
    //   1. >    2. >    3. >       4. >    5. >   6. >       7. >  8.
    // MISS > DODGE > PARRY > GLANCING > BLOCK > CRIT > CRUSHING > HIT
```

## Unit::_TryStackingOrRefreshingExistingAura (effect mask mismatch)

`src/server/game/Entities/Unit/Unit.cpp` (was line 3390):

```cpp
            // effect masks do not match
            // extremely rare case
            // let's just recreate aura
```

## Unit::RemoveAura (re-entrant removal)

`src/server/game/Entities/Unit/Unit.cpp` (was line 3846):

```cpp
    // we've special situation here, RemoveAura called while during aura removal
    // this kind of call is needed only when aura effect removal handler
    // or event triggered by it expects to remove
    // not yet removed effects of an aura
```

## Unit::RemoveNotOwnSingleTargetAuras (m_ownedAuras)

`src/server/game/Entities/Unit/Unit.cpp` (was line 4147):

```cpp
    // single target auras from other casters
    // Iterate m_ownedAuras - aura is marked as single target in Unit::AddAura (and pushed to m_ownedAuras).
    // m_appliedAuras will NOT contain the aura before first Unit::Update after adding it to m_ownedAuras.
    // Quickly removing such an aura will lead to it not being unregistered from caster's single cast auras container
    // leading to assertion failures if the aura was cast on a player that can
    // (and is changing map at the point where this function is called).
    // Such situation occurs when player is logging in inside an instance and fails the entry check for any reason.
    // The aura that was loaded from db (indirectly, via linked casts) gets removed before it has a chance
    // to register in m_appliedAuras
```

## Unit::GetDispellableAuraList (friendly/hostile)

`src/server/game/Entities/Unit/Unit.cpp` (was line 4738):

```cpp
            // do not remove positive auras if friendly target
            //               negative auras if non-friendly
            // unless we're reflecting (dispeller eliminates one of it's benefitial buffs)
```

## Unit::GetDispellableAuraList (charges)

`src/server/game/Entities/Unit/Unit.cpp` (was line 4749):

```cpp
            // The charges / stack amounts don't count towards the total number of auras that can be dispelled.
            // Ie: A dispel on a target with 5 stacks of Winters Chill and a Polymorph has 1 / (1 + 1) -> 50% chance to dispell
            // Polymorph instead of 1 / (5 + 1) -> 16%.
```

## Unit::Attack (combat start position)

`src/server/game/Entities/Unit/Unit.cpp` (was line 5924):

```cpp
    // set position before any AI calls/assistance
    //if (GetTypeId() == TYPEID_UNIT)
    //    ToCreature()->SetCombatStartPosition(GetPositionX(), GetPositionY(), GetPositionZ());
```

## Unit::Dismount (pet resummon)

`src/server/game/Entities/Unit/Unit.cpp` (was line 8374):

```cpp
    // only resummon old pet if the player is already added to a map
    // this prevents adding a pet to a not created map which would otherwise cause a crash
    // (it could probably happen when logging in after a previous crash)
```

## Unit::Kill (pet notification)

`src/server/game/Entities/Unit/Unit.cpp` (was line 11287):

```cpp
    // Inform pets (if any) when player kills target)
    // MUST come after victim->setDeathState(JUST_DIED); or pet next target
    // selection will get stuck on same target and break pet react state
```

## Unit::Kill (outdoor PvP)

`src/server/game/Entities/Unit/Unit.cpp` (was line 11386):

```cpp
    //if (victim->GetTypeId() == TYPEID_PLAYER)
    //    if (OutdoorPvP* pvp = victim->ToPlayer()->GetOutdoorPvP())
    //        pvp->HandlePlayerActivityChangedpVictim->ToPlayer();
```

## Unit::SetRooted (movement flags)

`src/server/game/Entities/Unit/Unit.cpp` (was line 11571):

```cpp
        // MOVEMENTFLAG_ROOT cannot be used in conjunction with MOVEMENTFLAG_MASK_MOVING (tested 3.3.5a)
        // this will freeze clients. That's why we remove MOVEMENTFLAG_MASK_MOVING before
        // setting MOVEMENTFLAG_ROOT
```

## Unit::SetFeatherFall (disabled check)

`src/server/game/Entities/Unit/Unit.cpp` (was line 13647):

```cpp
    // Temporarily disabled for short lived auras that unapply before client had time to ACK applying
    //if (enable == HasUnitMovementFlag(MOVEMENTFLAG_FALLING_SLOW))
    //    return false;
```

## Unit::SetCanTurnWhileFalling (disabled check)

`src/server/game/Entities/Unit/Unit.cpp` (was line 13828):

```cpp
    // Temporarily disabled for short lived auras that unapply before client had time to ACK applying
    //if (enable == HasExtraUnitMovementFlag(MOVEMENTFLAG2_CAN_TURN_WHILE_FALLING))
    //    return false;
```

## SpellAuraEffects.cpp effect handler notes

`src/server/game/Spells/Auras/SpellAuraEffects.cpp` (was line 57):

```cpp
//
// EFFECT HANDLER NOTES
//
// in aura handler there should be check for modes:
// AURA_EFFECT_HANDLE_REAL set
// AURA_EFFECT_HANDLE_SEND_FOR_CLIENT_MASK set
// AURA_EFFECT_HANDLE_CHANGE_AMOUNT_MASK set - aura is recalculated or is just applied/removed - need to redo all things related to m_amount
// AURA_EFFECT_HANDLE_CHANGE_AMOUNT_SEND_FOR_CLIENT_MASK - logical or of above conditions
// AURA_EFFECT_HANDLE_STAT - set when stats are reapplied
// such checks will speedup trinity change amount/send for client operations
// because for change amount operation packets will not be send
// aura effect handlers shouldn't contain any AuraEffect or Aura object modifications
```

## AuraEffect::HandleAuraModShapeshift (disarm)

`src/server/game/Spells/Auras/SpellAuraEffects.cpp` (was line 2045):

```cpp
        // Disarm handling
        // If druid shifts while being disarmed we need to deal with that since forms aren't affected by disarm
        // and also HandleAuraModDisarm is not triggered
```

## AuraEffect::HandleAuraMounted (mount_vehicle TODO)

`src/server/game/Spells/Auras/SpellAuraEffects.cpp` (was line 2766):

```cpp
                // TODO: CREATE TABLE mount_vehicle (mountId, vehicleCreatureId) for future mounts that are vehicles (new mounts no longer have proper data in MiscValue)
                //if (MountVehicle const* mountVehicle = sObjectMgr->GetMountVehicle(mountEntry->Id))
                //    creatureEntry = mountVehicle->VehicleCreatureId;
```

## AuraEffect::HandleAuraMounted (skill based mounts)

`src/server/game/Spells/Auras/SpellAuraEffects.cpp` (was line 2801):

```cpp
        //some mounts like Headless Horseman's Mount or broom stick are skill based spell
        // need to remove ALL arura related to mounts, this will stop client crash with broom stick
        // and never endless flying after using Headless Horseman's Mount
```

## AuraEffect::HandleModPossessPet (owner check)

`src/server/game/Spells/Auras/SpellAuraEffects.cpp` (was line 3219):

```cpp
    // seems it may happen that when removing it is no longer owner's pet
    //if (caster->ToPlayer()->GetPet() != target)
    //    return;
```

## AuraEffect::HandleAuraControlVehicle (0/0 seat amount)

`src/server/game/Spells/Auras/SpellAuraEffects.cpp` (was line 3302):

```cpp
        // Currently spells that have base points  0 and DieSides 0 = "0/0" exception are pushed to -1,
        // however the idea of 0/0 is to ingore flag VEHICLE_SEAT_FLAG_CAN_ENTER_OR_EXIT and -1 checks for it,
        // so this break such spells or most of them.
        // Current formula about m_amount: effect base points + dieside - 1
        // TO DO: Reasearch more about 0/0 and fix it.
```

## AuraEffect::HandleModSpellDamagePercentFromStat

`src/server/game/Spells/Auras/SpellAuraEffects.cpp` (was line 3767):

```cpp
    // Magic damage modifiers implemented in Unit::SpellDamageBonus
    // This information for client side use only
    // Recalculate bonus
```

## AuraEffect::HandleTriggerSpellOnExpire (MiscValue)

`src/server/game/Spells/Auras/SpellAuraEffects.cpp` (was line 5350):

```cpp
    // MiscValue (Caster):
    // 0 - Aura target
    // 1 - Aura caster
    // 2 - ? Aura target is always TARGET_UNIT_CASTER so we consider the same behavior as MiscValue 1
```
