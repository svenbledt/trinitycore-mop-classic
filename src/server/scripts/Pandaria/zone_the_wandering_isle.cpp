/*
 * This file is part of the TrinityCore Project. See AUTHORS file for Copyright information
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

#include "AreaTrigger.h"
#include "AreaTriggerDataStore.h"
#include "CellImpl.h"
#include "CharacterPackets.h"
#include "Containers.h"
#include "CreatureAI.h"
#include "CreatureAIImpl.h" // for RAND()
#include "GameObject.h"
#include "GameObjectAI.h"
#include "GridNotifiersImpl.h"
#include "MotionMaster.h"
#include "ObjectAccessor.h"
#include "PhasingHandler.h"
#include "Player.h"
#include "ScriptMgr.h"
#include "ScriptedCreature.h"
#include "ScriptedGossip.h"
#include "SpellAuraEffects.h"
#include "SpellScript.h"
#include "TaskScheduler.h"
#include "TemporarySummon.h"
#include "Vehicle.h"
#include "WaypointDefines.h"

namespace Scripts::Pandaria::TheWanderingIsle
{
namespace Spells
{
    // Generic Vehicle Spells
    static constexpr uint32 ForceVehicleRide = 46598;
    static constexpr uint32 EjectPassengers = 50630;
    static constexpr uint32 OxCartRopeLeft = 108627; // Cart on Yak

    // Singing Pools
    static constexpr uint32 CurseOfTheFrog = 102938;
    static constexpr uint32 CurseOfTheSkunk = 102939;
    static constexpr uint32 CurseOfTheTurtle = 102940;
    static constexpr uint32 CurseOfTheCrane = 102941;
    static constexpr uint32 CurseOfTheCrocodile = 102942;
    static constexpr uint32 RideVehiclePole = 102717;
    static constexpr uint32 TrainingBellPoleExitExclusion = 133381;

    // Only the Worthy Shall Pass
    static constexpr uint32 FireCrashCover = 108149;
    static constexpr uint32 FireCrashInvis = 108150;
    static constexpr uint32 FireCrashPhaseShift = 102515;
    static constexpr uint32 FlyingShadowKick = 108936;
    static constexpr uint32 FlyingShadowKickJump = 108943;
    static constexpr uint32 FeetOfFury = 108958;
    static constexpr uint32 FeetOfFuryDamage = 108957;
}

namespace Quests
{
    static constexpr uint32 OnlyTheWorthyShallPass = 29421;
    static constexpr uint32 TheSourceOfLivelihood = 29680;
    static constexpr uint32 TheSpiritAndBodyOfShenzinsu = 29775;
    static constexpr uint32 NewAllies = 29800;
}

namespace Menus
{
    static constexpr uint32 LiFeiBraziers = 13050;
}

namespace Creatures
{
    static constexpr uint32 MasterLiFei = 54135;
    static constexpr uint32 MasterLiFeiCombat = 54734;

    // Yak and Cart
    static constexpr uint32 CartSingingPools = 57710;
    static constexpr uint32 CartFarmstead = 59497;
    static constexpr uint32 CartForest = 57741;

    static constexpr uint32 CartVehicleSingingPools = 57208;
    static constexpr uint32 CartVehicleFarmstead = 59496;
    static constexpr uint32 CartVehicleForest = 57740;
}

namespace Talks
{
    static constexpr uint32 LiFeiDefeat = 0;
}

namespace Paths
{
    // Yak and Cart
    static constexpr uint32 CartSingingPools = 5720800;
    static constexpr uint32 CartFarmstead = 5949600;
    static constexpr uint32 CartForest = 5774000;

    static constexpr int8 NodeCartRemovePassenger = 28;
    static constexpr int8 NodeForestCartRemovePassenger = 34;
}

namespace Events
{
    // Yak and Cart
    static constexpr int8 YakCartPathStart = 1;
    static constexpr int8 YakCartRopes = 2;
}

enum TraineeMisc
{
    SAY_FINISH_FIGHT                    = 0,

    SPELL_BLACKOUT_KICK                 = 109080,

    QUEST_29524_KILLCREDIT              = 54586,

    POINT_DESPAWN                       = 0,

    NPC_HUOJIN_TRAINEE_MALE             = 54586,
    NPC_HUOJIN_TRAINEE_FEMALE           = 65470,
    NPC_TUSHUI_TRAINEE_MALE             = 54587,
    NPC_TUSHUI_TRAINEE_FEMALE           = 65471,
};

Position const TraineeEndpoints[] = {
    { 1465.3872f, 3283.8604f, 137.69096f },
    { 1431.401f, 3264.001f, 136.02579f },
    { 1397.2067f, 3276.5618f, 133.84508f },
    { 1441.566f, 3232.8013f, 135.01802f },
    { 1403.632f, 3229.1094f, 132.14877f },
    { 1347.1927f, 3286.5842f, 131.94803f },
    { 1365.1865f, 3338.9502f, 128.57233f },
    { 1349.6024f, 3315.0574f, 130.97443f },
    { 1335.4618f, 3344.019f, 130.42047f },
    { 1360.1198f, 3378.02f, 127.34183f },
    { 1435.8524f, 3355.6423f, 173.77744f },
    { 1432.7031f, 3385.1572f, 184.4187f },
    { 1452.6094f, 3373.3315f, 187.0402f },
    { 1426.7778f, 3364.7517f, 184.39569f },
    { 1450.3646f, 3361.264f, 184.42484f },
};

Emote constexpr TraineeEmotes[5] =
{
    EMOTE_ONESHOT_MONKOFFENSE_ATTACKUNARMED,
    EMOTE_ONESHOT_MONKOFFENSE_SPECIALUNARMED,
    EMOTE_ONESHOT_MONKOFFENSE_PARRYUNARMED,
    EMOTE_ONESHOT_PALMSTRIKE,
    EMOTE_ONESHOT_MONKOFFENSE_ATTACKUNARMEDOFF,
};

// 54586, 65470 - Huojin Trainee
// 54587, 65471 - Tushui Trainee
struct npc_tushui_huojin_trainee : public ScriptedAI
{
    npc_tushui_huojin_trainee(Creature* creature) : ScriptedAI(creature), _defeated(false) { }

    Emote PlayRandomEmote() const
    {
        Emote emote = Trinity::Containers::SelectRandomContainerElement(TraineeEmotes);
        me->HandleEmoteCommand(emote);
        return emote;
    }

    void DamageTaken(Unit* attacker, uint32& damage, DamageEffectType /*damageType*/, SpellInfo const* /*spellInfo = nullptr*/) override
    {
        if (me->HealthBelowPctDamaged(20, damage))
        {
            damage = 0;
            if (_defeated)
                return;

            _defeated = true;
            if (attacker)
            {
                if (Player* player = attacker->ToPlayer())
                    player->KilledMonsterCredit(QUEST_29524_KILLCREDIT);
            }

            me->SetEmoteState(EMOTE_ONESHOT_NONE);
            me->SetImmuneToPC(true);
            me->CombatStop();

            _scheduler.Schedule(1s, [this](TaskContext const& /*task*/)
            {
                Talk(SAY_FINISH_FIGHT);
            });

            _scheduler.Schedule(3s, [this](TaskContext const& /*task*/)
            {
                Position currentPosition;
                float currentDist = 1000.0f;
                for (Position const& pos : TraineeEndpoints)
                {
                    float dist = pos.GetExactDist(me);
                    if (dist >= currentDist)
                        continue;

                    currentPosition = pos;
                    currentDist = dist;
                }
                me->GetMotionMaster()->MovePoint(POINT_DESPAWN, currentPosition);
            });
        }
    }

    void MovementInform(uint32 type, uint32 id) override
    {
        if (type != POINT_MOTION_TYPE)
            return;

        if (id != POINT_DESPAWN)
            return;

        me->DespawnOrUnsummon();
    }

    void JustEngagedWith(Unit* /*attacker*/) override
    {
        _scheduler.Schedule(4s, [this](TaskContext& task)
        {
            if (me->GetVictim())
                DoCastVictim(SPELL_BLACKOUT_KICK);

            task.Repeat(8s);
        });
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);

        if (!UpdateVictim())
            return;
    }

    void EnterEvadeMode(EvadeReason why) override
    {
        if (!_defeated)
            ScriptedAI::EnterEvadeMode(why);
    }

protected:
    TaskScheduler _scheduler;
    bool _defeated;
};

enum HuojinTraineeMisc
{
    ACTION_PARTNER_ENTERED_COMBAT = 1,
};

class HuojinTraineePartnerSearch
{
public:
    HuojinTraineePartnerSearch(Creature* partner) : _partner(partner), _minDist(10.0f) { }

    bool operator()(Creature const* target)
    {
        if (target->GetEntry() != NPC_HUOJIN_TRAINEE_MALE && target->GetEntry() != NPC_HUOJIN_TRAINEE_FEMALE)
            return false;
        if (target == _partner)
            return false;
        if (target->IsInCombat())
            return false;
        if (target->IsInEvadeMode())
            return false;
        if (target->isDead())
            return false;

        float dist = target->GetDistance(_partner);
        if (dist >= _minDist)
            return false;

        _minDist = dist;
        return true;
    }

private:
    Unit* _partner;
    float _minDist;
};

// 54586 - Huojin Trainee
// 65470 - Huojin Trainee
struct npc_huojin_trainee : public npc_tushui_huojin_trainee
{
    npc_huojin_trainee(Creature* creature) : npc_tushui_huojin_trainee(creature) { }

    void JustEngagedWith(Unit* attacker) override
    {
        _scheduler.CancelAll();
        npc_tushui_huojin_trainee::JustEngagedWith(attacker);

        Creature* partner = ObjectAccessor::GetCreature(*me, _partnerGuid);
        if (!partner)
            return;

        if (partner->AI())
            partner->AI()->DoAction(ACTION_PARTNER_ENTERED_COMBAT);
    }

    void DoAction(int32 action) override
    {
        if (action == ACTION_PARTNER_ENTERED_COMBAT)
        {
            _scheduler.CancelAll();

            me->SetEmoteState(EMOTE_ONESHOT_NONE);
            _scheduler.Schedule(1s, [this](TaskContext const& /*task*/ )
            {
                me->HandleEmoteCommand(EMOTE_ONESHOT_BOW);
            });
        }
    }

    void BeginSparring(ObjectGuid guid)
    {
        _partnerGuid = guid;
        me->SetEmoteState(EMOTE_ONESHOT_NONE);
        me->HandleEmoteCommand(EMOTE_ONESHOT_BOW);

        _scheduler.Schedule(1s, [this](TaskContext const& /*task*/)
        {
            me->SetEmoteState(EMOTE_STATE_MONKOFFENSE_READYUNARMED);
        });

        _scheduler.Schedule(4s, [this](TaskContext& task)
        {
            PlayRandomEmote();
            task.Repeat(4s);
        });
    }

    Creature* GetNewPartner() const
    {
        Creature* partner = nullptr;
        HuojinTraineePartnerSearch check(me);
        Trinity::CreatureLastSearcher<HuojinTraineePartnerSearch> searcher(me, partner, check);
        Cell::VisitGridObjects(me, searcher, 10.0f);
        return partner;
    }

    void BeginSparringDelayed(ObjectGuid partnerGuid)
    {
        _partnerGuid = partnerGuid;
        _scheduler.Schedule(1s, [this, partnerGuid](TaskContext const& /*task*/)
        {
            BeginSparring(partnerGuid);
        });
    }

    void InitiateSparring()
    {
        Creature* partner = GetNewPartner();

        if (!partner)
            return;

        BeginSparring(partner->GetGUID());
        if (Creature* partner = ObjectAccessor::GetCreature(*me, _partnerGuid))
        {
            if (npc_huojin_trainee* ai = CAST_AI(npc_huojin_trainee, partner->GetAI()))
                ai->BeginSparringDelayed(me->GetGUID());
        }
    }

    void JustReachedHome() override
    {
        InitiateSparring();
    }

    void JustAppeared() override
    {
        // partner is already assigned, sparring start is delayed
        if (!ObjectAccessor::GetCreature(*me, _partnerGuid))
            InitiateSparring();
    }
private:
    ObjectGuid _partnerGuid;
};

class TushuiTraineeSearch
{
public:
    TushuiTraineeSearch(Creature* leader, float maxDist) : _leader(leader), _maxDist(maxDist) { }

    bool operator()(Creature const* target) const
    {
        if (target->GetEntry() != NPC_TUSHUI_TRAINEE_MALE && target->GetEntry() != NPC_TUSHUI_TRAINEE_FEMALE)
            return false;
        if (target->IsInCombat())
            return false;
        if (target->IsInEvadeMode())
            return false;
        if (target->GetDistance(_leader) >= _maxDist)
            return false;
        if (target->isDead())
            return false;

        return true;
    }

private:
    Creature* _leader;
    float _maxDist;
};

void HandleEmoteNearbyTushuiTrainees(Creature* leader, Emote emote)
{
    std::list<Creature*> traineeList;
    TushuiTraineeSearch check(leader, 10.0f);
    Trinity::CreatureListSearcher<TushuiTraineeSearch> searcher(leader, traineeList, check);
    Cell::VisitGridObjects(leader, searcher, 10.0f);

    for (Creature* trainee : traineeList)
        trainee->HandleEmoteCommand(emote);
}

// 54587 - Tushui Trainee
// 65471 - Tushui Trainee
struct npc_tushui_leading_trainee : public npc_tushui_huojin_trainee
{
    npc_tushui_leading_trainee(Creature* creature) : npc_tushui_huojin_trainee(creature) { }

    void ScheduleEmoteExecution()
    {
        _scheduler.Schedule(1s, [this](TaskContext& task)
        {
            Emote emote = PlayRandomEmote();
            HandleEmoteNearbyTushuiTrainees(me, emote);
            task.Repeat(6s);
        });
    }

    void JustReachedHome() override
    {
        ScheduleEmoteExecution();
    }

    void JustAppeared() override
    {
        ScheduleEmoteExecution();
    }

    void JustEngagedWith(Unit* attacker) override
    {
        _scheduler.CancelAll();
        npc_tushui_huojin_trainee::JustEngagedWith(attacker);
    }
};

// 61411 - Instructor Zhi
struct npc_instructor_zhi : public ScriptedAI
{
    npc_instructor_zhi(Creature* creature) : ScriptedAI(creature) { }

    void JustAppeared() override
    {
        _scheduler.Schedule(6s, [this](TaskContext& task)
        {
            Emote emote = Trinity::Containers::SelectRandomContainerElement(TraineeEmotes);
            me->HandleEmoteCommand(emote);

            task.Schedule(1s, [this, emote](TaskContext const& /*task*/)
            {
                HandleEmoteNearbyTushuiTrainees(me, emote);
            });
            task.Repeat(6s);
        });
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
};

// 210986 - Edict of Temperance
struct go_edict_of_temperance : public GameObjectAI
{
    using GameObjectAI::GameObjectAI;

    bool OnGossipHello(Player* /*player*/) override
    {
        me->DespawnOrUnsummon(1ms);
        return false;
    }
};

enum JaominRoMisc
{
    // Spells
    SPELL_CSA_AREATRIGGER_DUMMY      = 88811,
    SPELL_HAWK_DIVING_TO_EARTH       = 108955,
    SPELL_HAWK_DIVING_TO_EARTH_DMG   = 108935,
    SPELL_BABY_ELEPHANT_TAKES_A_BATH = 108938,
    SPELL_FORCE_SUMMONER_TO_RIDE     = 108583,
    SPELL_EJECT_ALL_PASSENGERS       = 50630,
    SPELL_DIZZY                      = 108959,
    SPELL_RIDE_DRAKE                 = 108582,
    SPELL_SERVERSIDE_KILL_CREDIT     = 109837,
    SPELL_FULL_HEALTH                = 17683,

    // Texts
    SAY_INTRO                        = 0,
    SAY_DEFEATED                     = 1,

    // Movement
    POINT_RANDOM_DEST                = 0,

    // Events
    EVENT_RANDOM_SPELL               = 1,
    EVENT_MOVE,
    EVENT_HEAL,
    EVENT_MOVE_HOME
};

// 54611 - Jaomin Ro
struct npc_jaomin_ro : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    void JustEngagedWith(Unit* /*who*/) override
    {
        _events.ScheduleEvent(EVENT_RANDOM_SPELL, 4s, 6s);
    }

    void JustReachedHome() override
    {
        me->RemoveUnitFlag(UNIT_FLAG_NON_ATTACKABLE_2);
        me->InitializeReactState();
    }

    void SpellHitTarget(WorldObject* target, SpellInfo const* spellInfo) override
    {
        if (spellInfo->Id == SPELL_CSA_AREATRIGGER_DUMMY && target->GetTypeId() == TYPEID_PLAYER && !me->IsInCombat())
        {
            Talk(SAY_INTRO, target);
            me->SetOrientation(1.67690026f);
            me->SetStandState(UNIT_STAND_STATE_STAND);
            me->SetEmoteState(EMOTE_STATE_READY_UNARMED);
        }
    }

    void UpdateAI(uint32 diff) override
    {
        if (!UpdateVictim())
            return;

        _events.Update(diff);

        if (me->HasUnitState(UNIT_STATE_CASTING) || me->HasUnitState(UNIT_STATE_STUNNED) || me->HasAura(SPELL_RIDE_DRAKE))
            return;

        switch (_events.ExecuteEvent())
        {
            case EVENT_RANDOM_SPELL:
            {
                uint32 spellId = RAND(SPELL_BABY_ELEPHANT_TAKES_A_BATH, SPELL_HAWK_DIVING_TO_EARTH);
                DoCast(spellId);
                _events.ScheduleEvent(EVENT_RANDOM_SPELL, 4s, 6s);
                break;
            }
            case EVENT_HEAL:
            {
                DoCastSelf(SPELL_FULL_HEALTH);
                me->SetUninteractible(false);
                break;
            }
            case EVENT_MOVE_HOME:
            {
                EnterEvadeMode();
                break;
            }
            default:
                break;
        }
    }

    void OnHealthDepleted(Unit* attacker, bool /*isKill*/) override
    {
        me->SetReactState(REACT_PASSIVE);
        me->AttackStop();
        me->RemoveAllAuras();
        me->InterruptNonMeleeSpells(true);
        _events.Reset();
        me->SetUninteractible(true);
        me->SetUnitFlag(UNIT_FLAG_NON_ATTACKABLE_2);
        me->SetEmoteState(EMOTE_ONESHOT_NONE);
        DoCast(SPELL_SERVERSIDE_KILL_CREDIT);
        Talk(SAY_DEFEATED, attacker);

        _events.ScheduleEvent(EVENT_HEAL, 5s);
        _events.ScheduleEvent(EVENT_MOVE_HOME, 6s);
    }

private:
    EventMap _events;
};

// 57750 - Jaomin Ro (Hawk)
struct npc_jaomin_ro_hawk : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    void JustAppeared() override
    {
        me->SetReactState(REACT_PASSIVE);
        me->SetSpeedRate(MOVE_RUN, 2.5f);
    }

    void IsSummonedBy(WorldObject* summonerWO) override
    {
        Unit* summoner = summonerWO->ToUnit();
        if (!summoner)
            return;
        Unit* victim = summoner->GetVictim();
        if (!victim)
            return;

        DoCast(SPELL_FORCE_SUMMONER_TO_RIDE);
        _scheduler.Schedule(1s, [this, orientation = me->GetAbsoluteAngle(victim) - me->GetOrientation()](TaskContext const& /*context*/)
        {
            me->GetMotionMaster()->MovePoint(POINT_RANDOM_DEST, me->GetFirstCollisionPosition(40.0f, orientation));
        });
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

    void SpellHitTarget(WorldObject* target, SpellInfo const* spellInfo) override
    {
        if (spellInfo->Id == SPELL_HAWK_DIVING_TO_EARTH_DMG && target->GetTypeId() == TYPEID_PLAYER)
        {
            DoCast(SPELL_EJECT_ALL_PASSENGERS);
            me->DespawnOrUnsummon();
        }
    }

    void MovementInform(uint32 type, uint32 pointId) override
    {
        if (type != POINT_MOTION_TYPE)
            return;

        switch (pointId)
        {
            case POINT_RANDOM_DEST:
            {
                DoCast(SPELL_EJECT_ALL_PASSENGERS);
                me->DespawnOrUnsummon();
                break;
            }
            default:
                break;
        }
    }

private:
    TaskScheduler _scheduler;
};

// 108583 - Force Summoner to Ride Vehicle
class spell_force_summoner_to_ride_vehicle : public SpellScript
{
    void HandleScript(SpellEffIndex /*effIndex*/) const
    {
        GetHitUnit()->CastSpell(GetCaster(), GetEffectValueAsInt(), TRIGGERED_FULL_MASK);
    }

    void Register() override
    {
        OnEffectHitTarget += SpellEffectFn(spell_force_summoner_to_ride_vehicle::HandleScript, EFFECT_0, SPELL_EFFECT_SCRIPT_EFFECT);
    }
};

// 108582 - Ride Drake
class spell_ride_drake : public AuraScript
{
    void OnRemoveVehicle(AuraEffect const* /*aurEff*/, AuraEffectHandleModes /*mode*/) const
    {
        if (Unit* caster = GetCaster())
            caster->CastSpell(caster, SPELL_DIZZY, TRIGGERED_FULL_MASK);
    }

    void Register() override
    {
        OnEffectRemove += AuraEffectRemoveFn(spell_ride_drake::OnRemoveVehicle, EFFECT_0, SPELL_AURA_CONTROL_VEHICLE, AURA_EFFECT_HANDLE_REAL);
    }
};

// Quest 29419 - The Missing Driver
enum TheMissingDriverMisc
{
    // Spells
    SPELL_SERVERSIDE_DRIVER_CREDIT  = 106231,
    SPELL_FORCE_SUMMON_CART_DRIVER  = 106206,
    SPELL_SUMMON_CART_DRIVER        = 106205,

    // Texts
    SAY_MIN_DIMWIND_TEXT_0          = 0,
    SAY_MIN_DIMWIND_TEXT_1          = 1,
    SAY_MIN_DIMWIND_TEXT_2          = 2,
    SAY_MIN_DIMWIND_TEXT_3          = 3,

    SAY_AMBERLEAF_SCAMP_0           = 0,
    SAY_AMBERLEAF_SCAMP_1           = 1,

    // Waypoint
    PATH_MOVE_RUN                   = 5650300,
    PATH_MOVE_WALK                  = 5650301,

    WAYPOINT_TALK_0                 = 0,
    WAYPOINT_TALK_1                 = 3,
    WAYPOINT_MOVE_WALK              = 11,

    WAYPOINT_DESPAWN                = 3,

    POINT_MOVE_RANDOM               = 0,

    // Quests
    QUEST_THE_MISSING_DRIVER        = 29419
};

constexpr Position amberleafPos[5] =
{
    { 1410.2014f, 3598.6494f, 89.59319f },
    { 1456.201f,  3568.265f,  88.39075f },
    { 1383.158f,  3595.447f,  90.3155f  },
    { 1367.333f,  3594.927f,  88.89806f },
    { 1350.278f,  3588.938f,  89.17908f }
};

// 6958 - Areatrigger
class at_min_dimwind_captured : public AreaTriggerScript
{
    public:
        at_min_dimwind_captured() : AreaTriggerScript("at_min_dimwind_captured") { }

        bool OnTrigger(Player* player, AreaTriggerEntry const* /*areaTrigger*/) override
        {
            if (!player->isDead() && player->GetQuestStatus(QUEST_THE_MISSING_DRIVER) == QUEST_STATUS_INCOMPLETE)
            {
                Creature* minDimwind = player->FindNearestCreatureWithOptions(20.0f, { .StringId = "npc_min_dimwind" });

                if (!minDimwind)
                    return false;

                minDimwind->CastSpell(player, SPELL_FORCE_SUMMON_CART_DRIVER, TRIGGERED_FULL_MASK);
                player->CastSpell(player, SPELL_SERVERSIDE_DRIVER_CREDIT, TRIGGERED_FULL_MASK);
                PhasingHandler::OnConditionChange(player); // phase 630 is added when kill credit but immediately is removed to be added again when Min Dimwind reaches final waypoint
            }

            return false;
        }
};

// 56503 - Min Dimwind (Summon)
struct npc_min_dimwind_summon : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    void IsSummonedBy(WorldObject* summoner) override
    {
        if (!summoner->IsPlayer())
            return;

        Creature* amberleafScamp1 = me->FindNearestCreatureWithOptions(20.0f, { .StringId = "npc_amberleaf_scamp_1" });
        Creature* amberleafScamp2 = me->FindNearestCreatureWithOptions(20.0f, { .StringId = "npc_amberleaf_scamp_2" });
        Creature* amberleafScamp3 = me->FindNearestCreatureWithOptions(20.0f, { .StringId = "npc_amberleaf_scamp_3" });
        Creature* amberleafScamp5 = me->FindNearestCreatureWithOptions(20.0f, { .StringId = "npc_amberleaf_scamp_5" });

        if (!amberleafScamp1 || !amberleafScamp2 || !amberleafScamp3 || !amberleafScamp5)
            return;

        amberleafScamp1->AI()->Talk(SAY_AMBERLEAF_SCAMP_0);
        amberleafScamp1->GetMotionMaster()->MovePoint(0, amberleafPos[0]);

        amberleafScamp2->GetMotionMaster()->MovePoint(0, amberleafPos[1]);

        amberleafScamp3->GetMotionMaster()->MovePoint(0, amberleafPos[2]);

        amberleafScamp5->GetMotionMaster()->MovePoint(0, amberleafPos[4]);

        _scheduler.Schedule(2s, [this](TaskContext const& /*task*/)
        {
            Creature* amberleafScamp4 = me->FindNearestCreatureWithOptions(20.0f, { .StringId = "npc_amberleaf_scamp_4" });

            if (!amberleafScamp4)
                return;

            amberleafScamp4->AI()->Talk(SAY_AMBERLEAF_SCAMP_1);
            amberleafScamp4->GetMotionMaster()->MovePoint(0, amberleafPos[3]);
        });

        _scheduler.Schedule(5s, [this](TaskContext& task)
        {
            Unit* summoner = me->ToTempSummon()->GetSummonerUnit();

            if (!summoner)
                return;

            me->SetFacingToObject(summoner);
            Talk(SAY_MIN_DIMWIND_TEXT_0, summoner);

            task.Schedule(4s, [this](TaskContext& task)
            {
                Talk(SAY_MIN_DIMWIND_TEXT_1);

                task.Schedule(4s, [this](TaskContext const& /*task*/)
                {
                    me->GetMotionMaster()->MovePath(PATH_MOVE_RUN, false);
                });
            });
        });
    }

    void WaypointReached(uint32 waypointId, uint32 pathId) override
    {
        if (pathId == PATH_MOVE_RUN)
        {
            switch (waypointId)
            {
                case WAYPOINT_TALK_0:
                case WAYPOINT_TALK_1:
                {
                    Talk(SAY_MIN_DIMWIND_TEXT_2);
                    break;
                }
                case WAYPOINT_MOVE_WALK:
                {
                    Talk(SAY_MIN_DIMWIND_TEXT_3);
                    me->GetMotionMaster()->MovePath(PATH_MOVE_WALK, false);
                    break;
                }
            }
        }
        else if (pathId == PATH_MOVE_WALK)
        {
            if (waypointId == WAYPOINT_DESPAWN)
            {
                me->SetFacingTo(0.575958f);
                me->DespawnOrUnsummon(2s);

                _scheduler.Schedule(1s, [this](TaskContext const& /*task*/)
                {
                    if (me->IsSummon())
                    {
                        Unit* summoner = me->ToTempSummon()->GetSummonerUnit();

                        if (!summoner)
                            return;

                        summoner->RemoveAurasDueToSpell(SPELL_SUMMON_CART_DRIVER);
                        PhasingHandler::OnConditionChange(summoner);
                    }
                });
            }
        }
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
};

// 54130 - Amberleaf Scamp
struct npc_amberleaf_scamp : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    void MovementInform(uint32 type, uint32 id) override
    {
        if (type == POINT_MOTION_TYPE && id == POINT_MOVE_RANDOM && !me->IsInCombat())
        {
            me->GetMotionMaster()->MoveRandom(10.0f);

            _scheduler.Schedule(10s, [this](TaskContext const& /*task*/)
            {
                if (!me->IsInCombat())
                    me->GetMotionMaster()->MoveTargetedHome();
            });
        }
    }

    void JustReachedHome() override
    {
        me->GetMotionMaster()->InitializeDefault();
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
};

// Quest 29414 - The Way of the Tushui
enum AysaCloudsingerMisc
{
    // Texts
    SAY_GO_CAVE              = 0,

    // Waypoints
    POINT_JUMP               = 1,
    PATH_CAVE_OF_MEDITATION  = 5965200
};

constexpr Position aysaJumpPos[3] =
{
    { 1196.72f,   3492.85f,   90.9836f  },
    { 1192.29f,   3478.69f,   108.788f  },
    { 1197.99f,   3460.63f,   103.04f   }
};

// 59652 - Aysa Cloudsinger (summon)
struct npc_aysa_cloudsinger_summon : public ScriptedAI
{
    npc_aysa_cloudsinger_summon(Creature* creature) : ScriptedAI(creature) { }

    void IsSummonedBy(WorldObject* summoner) override
    {
        if (!summoner->IsPlayer())
            return;

        Talk(SAY_GO_CAVE, summoner);

        _scheduler.Schedule(3s, [this](TaskContext& task)
        {
            me->GetMotionMaster()->MoveJump(EVENT_JUMP, aysaJumpPos[0], 12.0f, {}, 5.0f);

            task.Schedule(1700ms, [this](TaskContext& task)
            {
                me->GetMotionMaster()->MoveJump(EVENT_JUMP, aysaJumpPos[1], 12.0f, {}, 5.0f);

                task.Schedule(2s, [this](TaskContext const& /*task*/)
                {
                    me->GetMotionMaster()->MoveJump(POINT_JUMP, aysaJumpPos[2], 12.0f, {}, 5.0f);
                });
            });
        });
    }

    void MovementInform(uint32 type, uint32 pointId) override
    {
        if (type != EFFECT_MOTION_TYPE)
            return;

        if (pointId == POINT_JUMP)
            me->GetMotionMaster()->MovePath(PATH_CAVE_OF_MEDITATION, false);
    }

    void WaypointPathEnded(uint32 /*nodeId*/, uint32 pathId) override
    {
        if (pathId == PATH_CAVE_OF_MEDITATION)
            me->DespawnOrUnsummon();
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
};

enum CaveOfMeditationMisc
{
    // Quest
    QUEST_THE_WAY_OF_THE_TUSHUI     = 29414,

    // Spells
    SPELL_MEDITATION_TIMER_BAR      = 116421,
    SPELL_CAVE_OF_SCROLLS_CREDIT    = 102447,
    SPELL_AYSA_CAVE_OF_SCROLLS_COMP = 128598,
    SPELL_SUMMON_MASTER_LI_FEI      = 102445,
    SPELL_SUMMON_AMBERLEAF_TROUBLEMAKER = 114710,

    // Actions
    ACTION_START_MEDITATION  = 1,
    ACTION_FINISH_MEDITATION = 2,
    ACTION_FINISH_EVENT      = 3,

    // Events
    EVENT_SUMMON_AMBERLEAF = 1,

    // Texts
    SAY_AYSA_HELP                   = 0,
    SAY_AYSA_FINISH_MEDITATION      = 1
};

// 59642 - Aysa Cloudsinger (Cave of Meditation)
struct npc_aysa_cloudsinger_cave_of_meditation : public ScriptedAI
{
    npc_aysa_cloudsinger_cave_of_meditation(Creature* creature) : ScriptedAI(creature), _finishEvent(false) { }

    void DoAction(int32 action) override
    {
        switch (action)
        {
            case ACTION_START_MEDITATION:
            {
                _finishEvent = false;
                events.ScheduleEvent(EVENT_SUMMON_AMBERLEAF, 1s);
                break;
            }
            case ACTION_FINISH_MEDITATION:
            {
                events.CancelEvent(EVENT_SUMMON_AMBERLEAF);
                break;
            }
            case ACTION_FINISH_EVENT:
            {
                if (_finishEvent)
                    return;

                Creature* aysa = me->FindNearestCreatureWithOptions(40.0f, { .StringId = "npc_aysa_after_quest_29414", .IgnorePhases = true });

                if (!aysa)
                    return;

                aysa->AI()->Talk(SAY_AYSA_FINISH_MEDITATION);
                _finishEvent = true;
                break;
            }
            default:
                break;
        }
    }

    void UpdateAI(uint32 diff) override
    {
        events.Update(diff);

        while (uint32 eventId = events.ExecuteEvent())
        {
            switch (eventId)
            {
                case EVENT_SUMMON_AMBERLEAF:
                {
                    DoCastSelf(SPELL_SUMMON_AMBERLEAF_TROUBLEMAKER);
                    events.Repeat(11s);
                    break;
                }
                default:
                    break;
            }
        }
    }

private:
    EventMap events;
    bool _finishEvent;
};

enum MasterLiFeiMisc
{
    // Waypoint
    PATH_MASTER_LI = 5485600,

    // Texts
    SAY_TEXT_0 = 0,
    SAY_TEXT_1 = 1,
    SAY_TEXT_2 = 2,
    SAY_TEXT_3 = 3,
    SAY_TEXT_4 = 4,
    SAY_TEXT_5 = 5,
    SAY_TEXT_6 = 6,
    SAY_TEXT_7 = 7,

    // Spells
    SPELL_UPDATE_PHASE_SHIFT_DEMON_CREATOR = 84034
};

// 54856 - Master Li Fei (Summon)
struct npc_master_li_fei_summon : public ScriptedAI
{
    npc_master_li_fei_summon(Creature* creature) : ScriptedAI(creature) { }

    void FaceToPlayer()
    {
        if (me->IsSummon())
        {
            Unit* summoner = me->ToTempSummon()->GetSummonerUnit();

            if (!summoner)
                return;

            me->SetFacingToObject(summoner);
        }
    }

    void IsSummonedBy(WorldObject* summoner) override
    {
        if (!summoner->IsPlayer())
            return;

        me->GetMotionMaster()->MovePath(PATH_MASTER_LI, false);

        Seconds delay = 23s;

        _scheduler.Schedule(delay, [this](TaskContext const&)
        {
            FaceToPlayer();
        });

        delay += 2s;

        _scheduler.Schedule(delay, [this](TaskContext const&)
        {
            Talk(SAY_TEXT_0);
        });

        delay += 10s;

        _scheduler.Schedule(delay, [this](TaskContext const&)
        {
            Talk(SAY_TEXT_1);
        });

        delay += 12s;

        _scheduler.Schedule(delay, [this](TaskContext const&)
        {
            Talk(SAY_TEXT_2);
        });

        delay += 11s;

        _scheduler.Schedule(delay, [this](TaskContext const&)
        {
            FaceToPlayer();
            Talk(SAY_TEXT_3);
        });

        delay += 11s;

        _scheduler.Schedule(delay, [this](TaskContext const&)
        {
            Talk(SAY_TEXT_4);
        });

        delay += 9s;

        _scheduler.Schedule(delay, [this](TaskContext const&)
        {
            FaceToPlayer();
        });

        delay += 2s;

        _scheduler.Schedule(delay, [this](TaskContext const&)
        {
            Talk(SAY_TEXT_5);
        });

        delay += 6s;

        _scheduler.Schedule(delay, [this](TaskContext const&)
        {
            Creature* aysa = me->FindNearestCreatureWithOptions(40.0f, { .StringId = "npc_aysa_quest_29414" });

            if (!aysa)
                return;

            aysa->AI()->DoAction(ACTION_FINISH_MEDITATION);
            DoCastSelf(SPELL_UPDATE_PHASE_SHIFT_DEMON_CREATOR);
            Talk(SAY_TEXT_6);
            me->DespawnOrUnsummon(200ms);
        });
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
};

// 7756 - Areatrigger
class at_cave_of_meditation : public AreaTriggerScript
{
public:
    at_cave_of_meditation() : AreaTriggerScript("at_cave_of_meditation") { }

    bool OnTrigger(Player* player, AreaTriggerEntry const* /*areaTrigger*/) override
    {
        if (player->IsAlive() && player->GetQuestStatus(QUEST_THE_WAY_OF_THE_TUSHUI) == QUEST_STATUS_INCOMPLETE)
        {
            if (!player->HasAura(SPELL_MEDITATION_TIMER_BAR))
                player->CastSpell(player, SPELL_MEDITATION_TIMER_BAR, TRIGGERED_FULL_MASK);

            return true;
        }
        return false;
    }

    bool OnExit(Player* player, AreaTriggerEntry const* /*trigger*/) override
    {
        player->RemoveAura(SPELL_MEDITATION_TIMER_BAR);
        return true;
    }
};

// 7645 - Areatrigger
class at_inside_of_cave_of_meditation : public AreaTriggerScript
{
public:
    at_inside_of_cave_of_meditation() : AreaTriggerScript("at_inside_of_cave_of_meditation") { }

    bool OnTrigger(Player* player, AreaTriggerEntry const* /*areaTrigger*/) override
    {
        if (player->IsAlive() && player->GetQuestStatus(QUEST_THE_WAY_OF_THE_TUSHUI) == QUEST_STATUS_INCOMPLETE)
        {
            if (!player->HasAura(SPELL_SUMMON_MASTER_LI_FEI))
            {
                Creature* aysa = player->FindNearestCreatureWithOptions(40.0f, { .StringId = "npc_aysa_quest_29414" });

                if (!aysa)
                    return false;

                aysa->AI()->Talk(SAY_AYSA_HELP, player);
                aysa->AI()->DoAction(ACTION_START_MEDITATION);
                player->CastSpell(player, SPELL_SUMMON_MASTER_LI_FEI, TRIGGERED_FULL_MASK);
            }

            return true;
        }
        return false;
    }

    bool OnExit(Player* player, AreaTriggerEntry const* /*trigger*/) override
    {
        if (player->IsAlive() && player->GetQuestStatus(QUEST_THE_WAY_OF_THE_TUSHUI) == QUEST_STATUS_COMPLETE)
        {
            if (Creature* aysa = player->FindNearestCreatureWithOptions(40.0f, { .StringId = "npc_aysa_quest_29414", .IgnorePhases = true }))
                aysa->AI()->DoAction(ACTION_FINISH_EVENT);
        }

        return true;
    }
};

// 116421 - Meditation Timer Bar
class spell_meditation_timer_bar : public AuraScript
{
    void HandleEffectPeriodic(AuraEffect const* /*aurEff*/)
    {
        if (Unit* target = GetTarget())
        {
            target->ModifyPower(POWER_ALTERNATE_POWER, 1);

            if (target->GetPowerPct(POWER_ALTERNATE_POWER) == 100)
            {
                target->CastSpell(GetTarget(), SPELL_CAVE_OF_SCROLLS_CREDIT, TRIGGERED_FULL_MASK);
                target->CastSpell(GetTarget(), SPELL_AYSA_CAVE_OF_SCROLLS_COMP, TRIGGERED_FULL_MASK);
                Remove();
            }
        }
    }

    void Register() override
    {
        OnEffectPeriodic += AuraEffectPeriodicFn(spell_meditation_timer_bar::HandleEffectPeriodic, EFFECT_1, SPELL_AURA_PERIODIC_DUMMY);
    }
};

enum FlameSpoutSpell
{
    SPELL_FLAME_SPOUT_VISUAL = 114686
};

// 114684 - Flame Spout
class spell_flame_spout : public AuraScript
{
    bool Validate(SpellInfo const* /*spellInfo*/) override
    {
        return ValidateSpellInfo({ SPELL_FLAME_SPOUT_VISUAL });
    }

    void OnRemove(AuraEffect const* /*aurEff*/, AuraEffectHandleModes /*mode*/)
    {
        GetTarget()->RemoveAurasDueToSpell(SPELL_FLAME_SPOUT_VISUAL);
    }

    void Register() override
    {
        AfterEffectRemove += AuraEffectRemoveFn(spell_flame_spout::OnRemove, EFFECT_0, SPELL_AURA_PERIODIC_TRIGGER_SPELL, AURA_EFFECT_HANDLE_REAL);
    }
};

template<uint32 CurseSpellID>
class at_singing_pools_transform_base : public AreaTriggerScript
{
public:
    at_singing_pools_transform_base(char const* scriptName) : AreaTriggerScript(scriptName) {}

    bool OnTrigger(Player* player, AreaTriggerEntry const* /*areaTrigger*/) override
    {
        if (!player->IsAlive() || player->HasAura(Spells::RideVehiclePole))
            return true;

        if (!player->HasAura(CurseSpellID))
            player->CastSpell(player, CurseSpellID);

        return true;
    }

    bool OnExit(Player* player, AreaTriggerEntry const* /*areaTrigger*/) override
    {
        player->RemoveAurasDueToSpell(CurseSpellID);
        return true;
    }
};

// 6986
// 6987
class at_singing_pools_transform_frog : public AreaTriggerScript
{
public:
    at_singing_pools_transform_frog() : AreaTriggerScript("at_singing_pools_transform_frog") {}

    bool OnTrigger(Player* player, AreaTriggerEntry const* /*areaTrigger*/) override
    {
        if (!player->IsAlive() || player->HasAura(Spells::RideVehiclePole))
            return true;

        if (!player->HasAura(Spells::CurseOfTheFrog))
            player->CastSpell(player, Spells::CurseOfTheFrog);

        if (player->HasAura(Spells::TrainingBellPoleExitExclusion))
            player->RemoveAura(Spells::TrainingBellPoleExitExclusion);

        return true;
    }

    bool OnExit(Player* player, AreaTriggerEntry const* /*areaTrigger*/) override
    {
        player->RemoveAurasDueToSpell(Spells::CurseOfTheFrog);
        return true;
    }
};

// 54135 - Master Li Fei
struct npc_li_fei : public ScriptedAI
{
    npc_li_fei(Creature* creature) : ScriptedAI(creature) {}

    // Retail casts Fire Crash Cover right after accepting 29421 (sniff 2026-10-18 18-43-54 #4211)
    void OnQuestAccept(Player* player, Quest const* quest) override
    {
        if (quest->GetQuestId() == Quests::OnlyTheWorthyShallPass)
            player->CastSpell(player, Spells::FireCrashCover, true);
    }

    // Gossip option 0 of menu 13050 ("I am ready to face you") casts it again to retry the duel
    bool OnGossipSelect(Player* player, uint32 menuId, uint32 gossipListId) override
    {
        if (menuId != Menus::LiFeiBraziers || gossipListId != 0)
            return false;

        CloseGossipMenuFor(player);
        player->CastSpell(player, Spells::FireCrashCover, true);
        return true;
    }
};

// 102499 - Fire Crash
class spell_fire_crash : public SpellScript
{
    static constexpr Position PlayerJumpPos = { 1351.3334f, 3939.0347f, 109.32395f, 6.00115f };

    void SetDest(SpellDestination& dest) const
    {
        dest.Relocate(PlayerJumpPos);
    }

    void Register() override
    {
        // EFFECT_1 is the missile that applies the phase 504 aura 102515 on landing; it needs the same destination
        OnDestinationTargetSelect += SpellDestinationTargetSelectFn(spell_fire_crash::SetDest, EFFECT_ALL, TARGET_DEST_NEARBY_ENTRY);
    }
};

// 54734 - Master Li Fei (combat)
struct npc_li_fei_combat : public ScriptedAI
{
    npc_li_fei_combat(Creature* creature) : ScriptedAI(creature), _defeatTriggered(false) {}

    enum Events
    {
        EVENT_FEET_OF_FURY = 1,
        EVENT_SHADOW_KICK,
    };

    void Reset() override
    {
        _defeatTriggered = false;
    }

    void JustEngagedWith(Unit* /*attacker*/) override
    {
        _events.ScheduleEvent(EVENT_FEET_OF_FURY, 6s);
        _events.ScheduleEvent(EVENT_SHADOW_KICK, 10s);
    }

    void DamageTaken(Unit* attacker, uint32& damage, DamageEffectType /*damageType*/, SpellInfo const* /*spellInfo*/) override
    {
        if (!_defeatTriggered && me->HealthBelowPctDamaged(50, damage))
        {
            _defeatTriggered = true;
            me->HandleEmoteCommand(EMOTE_ONESHOT_SALUTE);

            // The shrine Li Fei stands 15.7 yd from this spawn; credit and phase removal must not depend on finding her
            for (ObjectGuid const& guid : me->GetTapList())
            {
                Player* player = ObjectAccessor::GetPlayer(*me, guid);
                if (!player)
                    continue;

                player->KilledMonsterCredit(Creatures::MasterLiFeiCombat, ObjectGuid::Empty);
                player->RemoveAurasDueToSpell(Spells::FireCrashCover);
                player->RemoveAurasDueToSpell(Spells::FireCrashInvis);
                player->RemoveAurasDueToSpell(Spells::FireCrashPhaseShift);
            }

            if (Creature* liFei = me->FindNearestCreatureWithOptions(30.0f, { .CreatureId = Creatures::MasterLiFei, .IgnorePhases = true }))
                liFei->AI()->Talk(Talks::LiFeiDefeat, attacker);

            EnterEvadeMode();
        }
    }

    void KilledUnit(Unit* victim) override
    {
        Player* player = victim->ToPlayer();
        if (!player)
            return;

        player->FailQuest(Quests::OnlyTheWorthyShallPass);
    }

    void UpdateAI(uint32 diff) override
    {
        if (!UpdateVictim())
            return;

        _events.Update(diff);

        if (me->HasUnitState(UNIT_STATE_CASTING))
            return;

        if (uint32 eventId = _events.ExecuteEvent())
        {
            switch (eventId)
            {
                case EVENT_FEET_OF_FURY:
                    DoCastVictim(Spells::FeetOfFury);

                    _events.ScheduleEvent(EVENT_FEET_OF_FURY, 12s);
                    break;
                case EVENT_SHADOW_KICK:
                    DoCastVictim(Spells::FlyingShadowKick);

                    _events.ScheduleEvent(EVENT_SHADOW_KICK, 15s);
                    break;
                default:
                    break;
            }
        }
    }

private:
    EventMap _events;
    bool _defeatTriggered;
};

// 108958 - Feet of Fury
class spell_feet_of_fury : public AuraScript
{
    bool Validate(SpellInfo const* /*spellInfo*/) override
    {
        return ValidateSpellInfo({ Spells::FeetOfFuryDamage });
    }

    void PeriodicTick(AuraEffect const* aurEff)
    {
        PreventDefaultAction();

        Unit* target = GetTarget();
        target->CastSpell(target->GetVictim(), Spells::FeetOfFuryDamage, CastSpellExtraArgsInit{
            .TriggerFlags = TRIGGERED_IGNORE_CAST_IN_PROGRESS | TRIGGERED_DONT_REPORT_CAST_ERROR,
            .TriggeringAura = aurEff
        });
    }

    void Register() override
    {
        OnEffectPeriodic += AuraEffectPeriodicFn(spell_feet_of_fury::PeriodicTick, EFFECT_0, SPELL_AURA_PERIODIC_TRIGGER_SPELL);
    }
};

// 108936 - Flying Shadow Kick
class spell_flying_shadow_kick : public SpellScript
{
    bool Validate(SpellInfo const* /*spellInfo*/) override
    {
        return ValidateSpellInfo({ Spells::FlyingShadowKickJump });
    }

    void HandleHitTarget(SpellEffIndex /*effIndex*/)
    {
        GetCaster()->CastSpell(GetHitUnit(), Spells::FlyingShadowKickJump, CastSpellExtraArgsInit{
            .TriggerFlags = TRIGGERED_IGNORE_CAST_IN_PROGRESS | TRIGGERED_DONT_REPORT_CAST_ERROR,
        });
    }

    void Register() override
    {
        OnEffectHitTarget += SpellEffectFn(spell_flying_shadow_kick::HandleHitTarget, EFFECT_1, SPELL_EFFECT_SCRIPT_EFFECT);
    }
};

struct CartData
{
    uint32 Entry = 0;
    uint32 PathId = 0;
    Optional<uint8> EjectNodeId;
    Optional<uint32> CreditNPC;
    Optional<uint32> QuestId;
    Optional<uint32> YakNPC;
};

static constexpr CartData CartDataTable[] =
{
    // Carts
    {
        .Entry = Creatures::CartVehicleSingingPools,
        .PathId = Paths::CartSingingPools,
        .EjectNodeId = Paths::NodeCartRemovePassenger,
        .CreditNPC = Creatures::CartSingingPools,
        .QuestId = Quests::TheSourceOfLivelihood,
    },
    {
        .Entry = Creatures::CartVehicleFarmstead,
        .PathId = Paths::CartFarmstead,
        .EjectNodeId = Paths::NodeCartRemovePassenger,
        .CreditNPC = Creatures::CartFarmstead,
        .QuestId = Quests::TheSpiritAndBodyOfShenzinsu,
    },
    {
        .Entry = Creatures::CartVehicleForest,
        .PathId = Paths::CartForest,
        .EjectNodeId = Paths::NodeForestCartRemovePassenger,
        .CreditNPC = Creatures::CartForest,
        .QuestId = Quests::NewAllies,
    }
};

static CartData GetCartData(uint32 entry)
{
    for (CartData const& data : CartDataTable)
        if (data.Entry == entry)
            return data;

    return {};
}

// 57208 - Delivery Cart (Singing Pools), 59496 - (Farmstead)
// 57740 - Delivery Cart (Forbidden Forest)
struct npc_delivery_cart : public ScriptedAI
{
    npc_delivery_cart(Creature* creature) : ScriptedAI(creature), _data(GetCartData(creature->GetEntry())) { }

    void Reset() override
    {
        _events.Reset();
    }

    void PassengerBoarded(Unit* passenger, int8 /*seat*/, bool apply) override
    {
        if (!apply)
            return;

        Player* player = passenger->ToPlayer();
        if (!player)
            return;

        me->CastSpell(player, Spells::ForceVehicleRide);

        _events.ScheduleEvent(Events::YakCartPathStart, 1800ms);
        _events.ScheduleEvent(Events::YakCartRopes, 1s);

        if (_data.QuestId && player->hasQuest(*_data.QuestId) && _data.CreditNPC)
            player->KilledMonsterCredit(*_data.CreditNPC, player->GetGUID());
    }

    void WaypointReached(uint32 nodeId, uint32 /*pathId*/) override
    {
        if (_data.EjectNodeId && nodeId == *_data.EjectNodeId)
            me->CastSpell(me, Spells::EjectPassengers);
    }

    void WaypointPathEnded(uint32 /*nodeId*/, uint32 /*pathId*/) override
    {
        me->DespawnOrUnsummon(1s);
    }

    void UpdateAI(uint32 diff) override
    {
        _events.Update(diff);

        while (uint32 eventId = _events.ExecuteEvent())
        {
            switch (eventId)
            {
                case Events::YakCartRopes:
                    me->CastSpell(me, Spells::OxCartRopeLeft);
                    break;
                case Events::YakCartPathStart:
                    me->GetMotionMaster()->MovePath(_data.PathId, false);
                    break;
                default:
                    break;
            }
        }
    }

private:
    EventMap _events;
    CartData _data;
};

// Quests 29422-29800 (second half of the island), retail sniff m2 (5.5.4.70449).
// Timed dialogue and summon chains are SmartAI data; see docs/mop-port/wandering-isle-second-half.md
namespace SecondHalf
{
namespace Spells
{
    static constexpr uint32 HuoOfferingStart = 109090;
    static constexpr uint32 HuoOfferingPulseA = 109095;
    static constexpr uint32 HuoOfferingPulseB = 109105;
    static constexpr uint32 HuoOfferingCredit = 109107;
    static constexpr uint32 HuoOfferingFinish = 109109;

    static constexpr uint32 SummonWaterSpout = 116810;
    static constexpr uint32 ShuSpoutCue = 117063;
    static constexpr uint32 WaterSpoutWarning = 116695;
    static constexpr uint32 WaterSpoutBurst = 117057;
    static constexpr uint32 WaterSpoutKnockUp = 116696;

    static constexpr uint32 ShuWakeWugou = 104017;

    static constexpr uint32 ZhaoRenLightning = 126006;
    static constexpr uint32 ZhaoRenStunned = 125992;
    static constexpr uint32 ZhaoRenShockwave = 125990;
    static constexpr uint32 ZhaoRenDefeated = 128808;
    static constexpr uint32 FireworkHit = 104855;
    static constexpr uint32 FireworkLaunch = 125970;
    static constexpr uint32 FireworkLauncherUsed = 125964;

    static constexpr uint32 RideVehicleHardcoded = 46598;
    static constexpr uint32 BalloonCreditStart = 105895;
    static constexpr uint32 BalloonCreditAirship = 105010;
    static constexpr uint32 Parachute = 45472;
    static constexpr uint32 EjectAllPassengers = 68576;
    static constexpr uint32 UpliftingDraftLaunch = 104490;

    static constexpr uint32 InjuredSailorVehicleKit = 105520;

    static constexpr uint32 HealingShenZinSuCredit = 108898;
}

namespace Creatures
{
    static constexpr uint32 BalloonAysa = 56661;
    static constexpr uint32 InjuredSailor = 55999;
    static constexpr uint32 RescuedSailor = 56236;
}

namespace Quests
{
    static constexpr uint32 HuoTheSpiritOfFire = 29422;
    static constexpr uint32 BattleForTheSkies = 29786;
    static constexpr uint32 NoneLeftBehind = 29794;
}

namespace Menus
{
    static constexpr uint32 ShuWakeWugou = 13140;
}

// 102522 - Huo's Offerings (quest 29422): 109090 on use, alternating pulses, 109109 + credit 109107 when the 12 s aura ends
class spell_huo_offering : public AuraScript
{
    void HandleApply(AuraEffect const* /*aurEff*/, AuraEffectHandleModes /*mode*/)
    {
        GetTarget()->CastSpell(GetTarget(), Spells::HuoOfferingStart, true);
    }

    void HandlePeriodic(AuraEffect const* aurEff)
    {
        // TODO(verify): retail pulses alternate 109095/109105, the exact order per tick is not clear from m2
        GetTarget()->CastSpell(GetTarget(), aurEff->GetTickNumber() % 2 ? Spells::HuoOfferingPulseA : Spells::HuoOfferingPulseB, true);
    }

    void HandleRemove(AuraEffect const* /*aurEff*/, AuraEffectHandleModes /*mode*/)
    {
        if (GetTargetApplication()->GetRemoveMode() != AURA_REMOVE_BY_EXPIRE)
            return;

        Player* player = GetTarget()->ToPlayer();
        if (!player || player->GetQuestStatus(Quests::HuoTheSpiritOfFire) != QUEST_STATUS_INCOMPLETE)
            return;

        player->CastSpell(player, Spells::HuoOfferingFinish, true);
        player->CastSpell(player, Spells::HuoOfferingCredit, true);
    }

    void Register() override
    {
        AfterEffectApply += AuraEffectApplyFn(spell_huo_offering::HandleApply, EFFECT_0, SPELL_AURA_PERIODIC_DUMMY, AURA_EFFECT_HANDLE_REAL);
        OnEffectPeriodic += AuraEffectPeriodicFn(spell_huo_offering::HandlePeriodic, EFFECT_0, SPELL_AURA_PERIODIC_DUMMY);
        AfterEffectRemove += AuraEffectRemoveFn(spell_huo_offering::HandleRemove, EFFECT_0, SPELL_AURA_PERIODIC_DUMMY, AURA_EFFECT_HANDLE_REAL);
    }
};

// Water spout spots of quest 29679 "A New Friend" (60488 spawn points, sniff m2 18:54:39-18:55:56)
Position const WaterSpoutSpots[] =
{
    { 1105.2310f, 2847.7656f, 92.22351f },
    { 1118.2205f, 2875.4270f, 92.22351f },
    { 1126.3577f, 2881.0051f, 92.22351f },
    { 1105.9202f, 2853.4324f, 92.22351f },
    { 1132.9115f, 2864.3810f, 92.22351f },
    { 1131.8560f, 2852.7805f, 92.22351f },
    { 1118.7656f, 2890.4192f, 92.22351f },
};

// 65493 - Shu (pool of quest 29679): summons a water spout every 9.7-12.9 s as in the sniff
struct npc_shu_water_spouts : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    void JustAppeared() override
    {
        _scheduler.CancelAll();
        _scheduler.Schedule(10s, [this](TaskContext& task)
        {
            Position const& spot = Trinity::Containers::SelectRandomContainerElement(WaterSpoutSpots);
            me->CastSpell(spot, Spells::SummonWaterSpout, true);
            task.Schedule(4s, [this](TaskContext const& /*task*/)
            {
                DoCastSelf(Spells::ShuSpoutCue, true);
            });
            task.Repeat(9700ms, 12900ms);
        });
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
};

// 60488 - Water Spout Bunny: warning visual, burst 4.4 s later (116696 knocks up and credits 55212)
struct npc_water_spout_bunny : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    void JustAppeared() override
    {
        me->SetReactState(REACT_PASSIVE);
        DoCastSelf(Spells::WaterSpoutWarning, true);
        _scheduler.Schedule(4400ms, [this](TaskContext const& /*task*/)
        {
            DoCastSelf(Spells::WaterSpoutBurst, true);
            DoCastSelf(Spells::WaterSpoutKnockUp, true);
            me->DespawnOrUnsummon(3s);
        });
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
};

// 55556 - Shu (quest 29774): gossip option 0 of menu 13140 casts 104017, which summons Wugou and gives the first credit
struct npc_shu_wake_wugou : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    bool OnGossipSelect(Player* player, uint32 menuId, uint32 gossipListId) override
    {
        if (menuId != Menus::ShuWakeWugou || gossipListId != 0)
            return false;

        CloseGossipMenuFor(player);
        player->CastSpell(player, Spells::ShuWakeWugou, true);
        return true;
    }
};

// Zhao-Ren circle and landing spot (spline of 55786, sniff m2 #49867 and #50307)
Position const ZhaoRenCircle[] =
{
    { 688.20f, 4186.41f, 214.87f }, { 682.38f, 4176.08f, 214.52f }, { 682.06f, 4157.68f, 214.09f }, { 691.18f, 4145.19f, 214.62f },
    { 709.08f, 4137.22f, 216.30f }, { 734.30f, 4134.32f, 220.85f }, { 750.48f, 4142.90f, 222.95f }, { 760.12f, 4158.66f, 223.89f },
    { 752.17f, 4179.30f, 222.46f }, { 736.62f, 4189.58f, 220.09f }, { 720.89f, 4193.51f, 216.79f }, { 704.30f, 4195.27f, 215.21f },
};
Position const ZhaoRenLandingSpot = { 723.16f, 4163.80f, 205.00f };

// 55786 - Zhao-Ren (quest 29786): circles, lands after 5 firework hits, recovers 18.7 s later
struct boss_zhao_ren : public ScriptedAI
{
    static constexpr uint32 PointLanding = 1;
    static constexpr uint8 HitsToLand = 5;

    boss_zhao_ren(Creature* creature) : ScriptedAI(creature), _hits(0), _grounded(false) { }

    void Reset() override
    {
        _hits = 0;
        _grounded = false;
        _scheduler.CancelAll();
        me->SetDisableGravity(true);
        StartCircling();
        _scheduler.Schedule(5s, [this](TaskContext& task)
        {
            if (!_grounded)
                if (Player* player = me->SelectNearestPlayer(80.0f))
                    if (player->GetQuestStatus(Quests::BattleForTheSkies) == QUEST_STATUS_INCOMPLETE)
                        DoCast(player, Spells::ZhaoRenLightning);
            task.Repeat(5s);
        });
    }

    void StartCircling()
    {
        std::vector<WaypointNode> nodes;
        for (Position const& pos : ZhaoRenCircle)
            nodes.emplace_back(uint32(nodes.size()), pos.GetPositionX(), pos.GetPositionY(), pos.GetPositionZ());

        WaypointPath path(0, std::move(nodes), WaypointMoveType::Run, WaypointPathFlags::FlyingPath);
        path.BuildSegments();
        me->GetMotionMaster()->MovePath(path, true, {}, 9.0f);
    }

    void SpellHit(WorldObject* /*caster*/, SpellInfo const* spellInfo) override
    {
        if (spellInfo->Id != Spells::FireworkHit || _grounded || ++_hits < HitsToLand)
            return;

        _grounded = true;
        _hits = 0;
        me->GetMotionMaster()->Clear();
        me->GetMotionMaster()->MovePoint(PointLanding, ZhaoRenLandingSpot, false, {}, 11.11f);
    }

    void MovementInform(uint32 type, uint32 id) override
    {
        if (type != POINT_MOTION_TYPE || id != PointLanding)
            return;

        DoCastSelf(Spells::ZhaoRenStunned, true);
        _scheduler.Schedule(15500ms, [this](TaskContext const& /*task*/)
        {
            DoCastSelf(Spells::ZhaoRenShockwave);
        });
        _scheduler.Schedule(18700ms, [this](TaskContext const& /*task*/)
        {
            _grounded = false;
            StartCircling();
        });
    }

    void JustDied(Unit* /*killer*/) override
    {
        DoCastSelf(Spells::ZhaoRenDefeated, true);
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);

        if (!UpdateVictim())
            return;
    }

private:
    TaskScheduler _scheduler;
    uint8 _hits;
    bool _grounded;
};

// 125961 - Firework Launcher click (quest 29786): the launcher makes the clicker fire 104855 at Zhao-Ren
class spell_firework_launcher_click : public SpellScript
{
    void HandleDummy(SpellEffIndex /*effIndex*/)
    {
        Unit* launcher = GetHitUnit();
        Unit* caster = GetCaster();
        if (!launcher || !caster || launcher->HasAura(Spells::FireworkLauncherUsed))
            return;

        launcher->CastSpell(caster, Spells::FireworkLaunch, true);
        launcher->CastSpell(launcher, Spells::FireworkLauncherUsed, true);
    }

    void Register() override
    {
        OnEffectHitTarget += SpellEffectFn(spell_firework_launcher_click::HandleDummy, EFFECT_0, SPELL_EFFECT_DUMMY);
    }
};

struct FlightLeg
{
    std::vector<Position> Points;
    float Speed;
};

// 55649 - Shang Xi's Hot Air Balloon (quest 29791): four legs as in the sniff splines (#57292, #57474, #57721, #57864)
struct npc_shang_xi_hot_air_balloon : public ScriptedAI
{
    npc_shang_xi_hot_air_balloon(Creature* creature) : ScriptedAI(creature), _leg(0) { }

    static std::vector<FlightLeg> const& Legs()
    {
        static std::vector<FlightLeg> const legs =
        {
            { { { 934.24f, 4571.04f, 233.65f }, { 1015.72f, 4604.33f, 216.55f }, { 1056.45f, 4658.65f, 187.74f }, { 1081.42f, 4796.38f, 157.66f } }, 7.35f },
            { { { 1091.85f, 4926.62f, 137.93f }, { 1026.33f, 5137.10f, 138.06f }, { 818.29f, 5216.31f, 134.64f }, { 621.72f, 5132.56f, 142.15f } }, 8.0f },
            { { { 547.26f, 5035.91f, 130.49f }, { 440.75f, 4867.26f, 117.58f }, { 403.52f, 4650.16f, 81.14f }, { 341.30f, 4475.94f, 75.50f },
                { 222.56f, 4369.27f, 93.21f }, { 164.76f, 4297.13f, 112.24f }, { 131.75f, 4156.71f, 124.64f } }, 26.71f },
            { { { 123.95f, 4109.05f, 124.64f }, { 112.05f, 3931.90f, 128.34f }, { 218.50f, 3824.77f, 137.58f }, { 388.92f, 3765.61f, 159.47f },
                { 596.57f, 3689.25f, 183.04f }, { 745.19f, 3664.53f, 194.05f } }, 32.0f },
        };
        return legs;
    }

    void IsSummonedBy(WorldObject* summoner) override
    {
        Player* player = summoner->ToPlayer();
        if (!player)
            return;

        _playerGuid = player->GetGUID();
        me->SetDisableGravity(true);
        player->CastSpell(me, Spells::RideVehicleHardcoded, true);

        _scheduler.Schedule(600ms, [this](TaskContext const& /*task*/)
        {
            // 106636 (triggered by 105002 after this summon) brings Aysa; she takes seat 1 (sniff m2 TransportEnter)
            if (Creature* aysa = me->FindNearestCreatureWithOptions(20.0f, { .CreatureId = Creatures::BalloonAysa, .IgnoreNotOwnedPrivateObjects = false, .PrivateObjectOwnerGuid = _playerGuid }))
                aysa->EnterVehicle(me, 1);
            DoCastSelf(Spells::BalloonCreditStart, true);
        });
        _scheduler.Schedule(4s, [this](TaskContext const& /*task*/)
        {
            FlyLeg();
        });
    }

    void FlyLeg()
    {
        FlightLeg const& leg = Legs()[_leg];
        std::vector<WaypointNode> nodes;
        for (Position const& pos : leg.Points)
            nodes.emplace_back(uint32(nodes.size()), pos.GetPositionX(), pos.GetPositionY(), pos.GetPositionZ());

        WaypointPath path(_leg, std::move(nodes), WaypointMoveType::Run, WaypointPathFlags::FlyingPath);
        path.BuildSegments();
        me->GetMotionMaster()->MovePath(path, false, {}, leg.Speed);

        if (_leg == Legs().size() - 1)
            DoCastSelf(Spells::BalloonCreditAirship, true);
    }

    void WaypointPathEnded(uint32 /*nodeId*/, uint32 /*pathId*/) override
    {
        if (++_leg < Legs().size())
        {
            FlyLeg();
            return;
        }

        _scheduler.Schedule(1600ms, [this](TaskContext const& /*task*/)
        {
            Player* player = ObjectAccessor::GetPlayer(*me, _playerGuid);
            if (player && player->GetVehicleBase() == me)
            {
                Position const exitPos = { 746.39276f, 3665.7275f, 194.19475f, 0.6864777f };
                player->ExitVehicle(&exitPos);
                DoCast(player, Spells::Parachute, true);
            }
            me->DespawnOrUnsummon(1s);
        });
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
    ObjectGuid _playerGuid;
    std::size_t _leg;
};

// 55685 - Uplifting Draft (quest 29776): lifts the rider to the upper ledge, ejects it 20.8 s after boarding
struct npc_uplifting_draft : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    void PassengerBoarded(Unit* passenger, int8 /*seatId*/, bool apply) override
    {
        if (!apply || !passenger->IsPlayer())
            return;

        ObjectGuid passengerGuid = passenger->GetGUID();
        me->SetDisableGravity(true);
        _scheduler.Schedule(4600ms, [this](TaskContext const& /*task*/)
        {
            // TODO(verify): retail moves the draft up instantly (spline t=0, m2 #30906); flown here in 1.2 s
            me->GetMotionMaster()->MovePoint(0, { 920.45f, 3604.77f, 253.17f }, false, {}, 48.0f);
        });
        _scheduler.Schedule(20800ms, [this, passengerGuid](TaskContext const& /*task*/)
        {
            Player* player = ObjectAccessor::GetPlayer(*me, passengerGuid);
            DoCastSelf(Spells::EjectAllPassengers, true);
            if (player)
            {
                player->NearTeleportTo({ 920.44965f, 3604.7708f, 255.17317f, 2.7885048f });
                DoCast(player, Spells::UpliftingDraftLaunch, true);
            }
            me->DespawnOrUnsummon(2s);
        });
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
};

// 55999 - Injured Sailor (quest 29794): the clicker becomes a vehicle (105520, kit 1845) and carries 56236
struct npc_injured_sailor : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    void OnSpellClick(Unit* clicker, bool /*spellClickHandled*/) override
    {
        Player* player = clicker->ToPlayer();
        if (!player || player->GetQuestStatus(Quests::NoneLeftBehind) != QUEST_STATUS_INCOMPLETE || !player->GetVehicleKit())
            return;

        if (Creature* sailor = me->SummonCreature(Creatures::RescuedSailor, me->GetPosition(), TEMPSUMMON_TIMED_DESPAWN, 3min, 0, 0, player->GetGUID()))
            sailor->EnterVehicle(player, 0);
        me->DespawnOrUnsummon(0s, 30s);
    }
};

// 7087 - shore of quest 29794: a carried sailor is dropped, thanks the player and counts as rescued
class at_none_left_behind : public AreaTriggerScript
{
public:
    at_none_left_behind() : AreaTriggerScript("at_none_left_behind") { }

    bool OnTrigger(Player* player, AreaTriggerEntry const* /*areaTrigger*/) override
    {
        Vehicle* kit = player->GetVehicleKit();
        Unit* passenger = kit ? kit->GetPassenger(0) : nullptr;
        Creature* sailor = passenger ? passenger->ToCreature() : nullptr;
        if (!sailor || sailor->GetEntry() != Creatures::RescuedSailor)
            return false;

        player->KilledMonsterCredit(Creatures::InjuredSailor);
        sailor->ExitVehicle();
        sailor->AI()->Talk(0, player);
        sailor->DespawnOrUnsummon(5s);
        player->RemoveAurasDueToSpell(Spells::InjuredSailorVehicleKit);
        return true;
    }
};

// 117783 - Healing of Shen-zin Su progress bar (alt power 158, max 700); retail fills it in ~246 s
class spell_healing_shen_zin_su_bar : public AuraScript
{
    void HandlePeriodic(AuraEffect const* aurEff)
    {
        Unit* target = GetTarget();
        // TODO(verify): retail adds 2-3 per second (m2 POWER_UPDATE), probably per living healer
        target->ModifyPower(POWER_ALTERNATE_POWER, aurEff->GetTickNumber() % 5 < 3 ? 3 : 2);
        if (target->GetPowerPct(POWER_ALTERNATE_POWER) < 100.0f)
            return;

        target->CastSpell(target, Spells::HealingShenZinSuCredit, true);
        Remove();
    }

    void Register() override
    {
        OnEffectPeriodic += AuraEffectPeriodicFn(spell_healing_shen_zin_su_bar::HandlePeriodic, EFFECT_1, SPELL_AURA_PERIODIC_DUMMY);
    }
};
}

// Quest 31450 - A New Fate (faction choice), retail sniff m2 (5.5.4.70449); see docs/mop-port/phase3-4-plan.md step 4
namespace NewFate
{
    static constexpr uint32 QuestANewFate = 31450;
    static constexpr uint32 NpcSpiritOfMasterShangXi = 56013;
    static constexpr uint32 MenuSpiritOfMasterShangXi = 13726;

    static constexpr uint32 SpellPandarenFactionChoice = 108897;
    static constexpr uint32 SpellBalloonExitMovieTimerHorde = 132211;
    static constexpr uint32 SpellBalloonExitMovieAlliance = 130420;
    static constexpr uint32 SpellBalloonExitMovieHorde = 132212;
    static constexpr uint32 SpellPandarenAllianceTeleport = 116957;
    static constexpr uint32 SpellPandarenHordeTeleport = 116962;

    static constexpr uint32 MovieBalloonExitAlliance = 116;
    static constexpr uint32 MovieBalloonExitHorde = 123;

    static constexpr uint32 TalkAccomplished = 0;
    static constexpr uint32 TalkJourneysNotDone = 1;
    static constexpr uint32 ActionFactionChosen = 1;
}

// 56013 - Spirit of Master Shang Xi
struct npc_spirit_of_master_shang_xi : public ScriptedAI
{
    using ScriptedAI::ScriptedAI;

    void OnQuestAccept(Player* player, Quest const* quest) override
    {
        if (quest->GetQuestId() == NewFate::QuestANewFate)
            Talk(NewFate::TalkAccomplished, player);
    }

    bool OnGossipSelect(Player* player, uint32 menuId, uint32 /*gossipListId*/) override
    {
        if (menuId != NewFate::MenuSpiritOfMasterShangXi)
            return false;

        CloseGossipMenuFor(player);
        player->CastSpell(player, NewFate::SpellPandarenFactionChoice, true);
        return true;
    }

    void SetGUID(ObjectGuid const& guid, int32 action) override
    {
        if (action != NewFate::ActionFactionChosen)
            return;

        // Retail: the line comes 6.4 s after the choice, while the exit movie plays (m2 #103953 -> #104186)
        _scheduler.Schedule(6s, [this, guid](TaskContext const& /*task*/)
        {
            if (Player* player = ObjectAccessor::GetPlayer(*me, guid))
                Talk(NewFate::TalkJourneysNotDone, player);
        });
    }

    void UpdateAI(uint32 diff) override
    {
        _scheduler.Update(diff);
    }

private:
    TaskScheduler _scheduler;
};

// 108897 - Pandaren Faction Choice
class spell_pandaren_faction_choice : public SpellScript
{
    void HandleScript(SpellEffIndex /*effIndex*/) const
    {
        Player* player = GetHitUnit()->ToPlayer();
        if (player && player->GetRace() == RACE_PANDAREN_NEUTRAL && player->GetQuestStatus(NewFate::QuestANewFate) == QUEST_STATUS_INCOMPLETE)
            player->SendDirectMessage(WorldPackets::Character::ShowNeutralPlayerFactionSelectUI().Write());
    }

    void Register() override
    {
        OnEffectHitTarget += SpellEffectFn(spell_pandaren_faction_choice::HandleScript, EFFECT_0, SPELL_EFFECT_SCRIPT_EFFECT);
    }
};

// 31336, 31337 - sent by 113244/113245 Faction Choice Trigger Spell (Alliance/Horde)
class event_pandaren_faction_chosen : public EventScript
{
public:
    event_pandaren_faction_chosen() : EventScript("event_pandaren_faction_chosen") { }

    void OnTrigger(WorldObject* object, WorldObject* /*invoker*/, uint32 /*eventId*/) override
    {
        Player* player = object->ToPlayer();
        if (!player)
            return;

        if (Creature* spirit = player->FindNearestCreature(NewFate::NpcSpiritOfMasterShangXi, 50.0f))
            spirit->AI()->SetGUID(player->GetGUID(), NewFate::ActionFactionChosen);
    }
};

// 130422, 132211 - Pandaren Balloon Exit Movie Timer Aura
class spell_pandaren_balloon_exit_movie_timer : public AuraScript
{
    void AfterRemove(AuraEffect const* /*aurEff*/, AuraEffectHandleModes /*mode*/) const
    {
        if (GetTargetApplication()->GetRemoveMode() != AURA_REMOVE_BY_EXPIRE)
            return;

        // Retail roots the player for the movie (MOVE_ROOT with TRIGGER_MOVIE, m2 #104031)
        Unit* target = GetTarget();
        target->SetControlled(true, UNIT_STATE_ROOT);
        target->CastSpell(target, GetId() == NewFate::SpellBalloonExitMovieTimerHorde
            ? NewFate::SpellBalloonExitMovieHorde : NewFate::SpellBalloonExitMovieAlliance, true);
    }

    void Register() override
    {
        AfterEffectRemove += AuraEffectRemoveFn(spell_pandaren_balloon_exit_movie_timer::AfterRemove, EFFECT_0, SPELL_AURA_DUMMY, AURA_EFFECT_HANDLE_REAL);
    }
};

// Retail sends the bind and the teleport only after CMSG_COMPLETE_MOVIE (m2 #104192)
class player_pandaren_balloon_exit_movie : public PlayerScript
{
public:
    player_pandaren_balloon_exit_movie() : PlayerScript("player_pandaren_balloon_exit_movie") { }

    void OnMovieComplete(Player* player, uint32 movieId) override
    {
        uint32 teleport = 0;
        if (movieId == NewFate::MovieBalloonExitAlliance)
            teleport = NewFate::SpellPandarenAllianceTeleport;
        else if (movieId == NewFate::MovieBalloonExitHorde)
            teleport = NewFate::SpellPandarenHordeTeleport;

        if (!teleport)
            return;

        player->SetControlled(false, UNIT_STATE_ROOT);
        player->CastSpell(player, teleport, true);
    }
};
}

void AddSC_zone_the_wandering_isle()
{
    using namespace Scripts::Pandaria::TheWanderingIsle;

    RegisterCreatureAI(npc_tushui_huojin_trainee);
    RegisterCreatureAI(npc_huojin_trainee);
    RegisterCreatureAI(npc_tushui_leading_trainee);
    RegisterCreatureAI(npc_instructor_zhi);
    RegisterGameObjectAI(go_edict_of_temperance);
    RegisterCreatureAI(npc_jaomin_ro);
    RegisterCreatureAI(npc_jaomin_ro_hawk);
    RegisterCreatureAI(npc_min_dimwind_summon);
    RegisterCreatureAI(npc_amberleaf_scamp);
    RegisterCreatureAI(npc_aysa_cloudsinger_summon);
    RegisterCreatureAI(npc_aysa_cloudsinger_cave_of_meditation);
    RegisterCreatureAI(npc_master_li_fei_summon);

    RegisterSpellScript(spell_force_summoner_to_ride_vehicle);
    RegisterSpellScript(spell_ride_drake);
    RegisterSpellScript(spell_meditation_timer_bar);
    RegisterSpellScript(spell_flame_spout);

    new at_min_dimwind_captured();
    new at_cave_of_meditation();
    new at_inside_of_cave_of_meditation();

    new at_singing_pools_transform_frog();
    new at_singing_pools_transform_base<Spells::CurseOfTheSkunk>("at_singing_pools_transform_skunk");
    new at_singing_pools_transform_base<Spells::CurseOfTheCrocodile>("at_singing_pools_transform_crocodile");
    new at_singing_pools_transform_base<Spells::CurseOfTheCrane>("at_singing_pools_transform_crane");
    new at_singing_pools_transform_base<Spells::CurseOfTheTurtle>("at_singing_pools_transform_turtle");

    RegisterCreatureAI(npc_li_fei);
    RegisterSpellScript(spell_fire_crash);
    RegisterCreatureAI(npc_li_fei_combat);
    RegisterSpellScript(spell_feet_of_fury);
    RegisterSpellScript(spell_flying_shadow_kick);

    RegisterCreatureAI(npc_delivery_cart);

    {
        using namespace SecondHalf;
        RegisterSpellScript(spell_huo_offering);
        RegisterCreatureAI(npc_shu_water_spouts);
        RegisterCreatureAI(npc_water_spout_bunny);
        RegisterCreatureAI(npc_shu_wake_wugou);
        RegisterCreatureAI(boss_zhao_ren);
        RegisterSpellScript(spell_firework_launcher_click);
        RegisterCreatureAI(npc_shang_xi_hot_air_balloon);
        RegisterCreatureAI(npc_uplifting_draft);
        RegisterCreatureAI(npc_injured_sailor);
        new at_none_left_behind();
        RegisterSpellScript(spell_healing_shen_zin_su_bar);
    }

    RegisterCreatureAI(npc_spirit_of_master_shang_xi);
    RegisterSpellScript(spell_pandaren_faction_choice);
    RegisterSpellScript(spell_pandaren_balloon_exit_movie_timer);
    new event_pandaren_faction_chosen();
    new player_pandaren_balloon_exit_movie();
}
