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

/*
 * Scripts for spells with SPELLFAMILY_MONK and SPELLFAMILY_GENERIC spells used by monk players.
 * Ordered alphabetically using scriptname.
 * Scriptnames of files in this file should be prefixed with "spell_monk_".
 */

#include "ScriptMgr.h"
#include "Player.h"
#include "Random.h"
#include "Spell.h"
#include "SpellInfo.h"
#include "SpellMgr.h"
#include "SpellScript.h"
#include "SpellAuraEffects.h"
#include "Unit.h"

namespace Scripts::Spells::Monk
{
    enum MonkSpells
    {
        SPELL_MONK_CHI_ENERGIZE             = 121588,
        SPELL_MONK_PROVOKE_SINGLE_TARGET    = 116189,
        SPELL_MONK_PROVOKE_AOE              = 118635,
        SPELL_MONK_ROLL_BACKWARD            = 109131,
        SPELL_MONK_ROLL_FORWARD             = 107427,
        SPELL_MONK_2H_STAFF_OVERRIDE        = 108561,
        SPELL_MONK_2H_POLEARM_OVERRIDE      = 115697,
        SPELL_MONK_BREWMASTER_TRAINING      = 120267, // $bm / $apc in the damage formula
        SPELL_MONK_DUAL_WIELD_OFFHAND       = 124146  // $offlow uses the off-hand weapon
    };

    // Monk melee range from the 5.5.4 tooltip variables ($<low>/$<high>, e.g. Blackout Kick 100784, Expel Harm 115072)
    static std::pair<float, float> GetMonkMeleeDamageRange(Unit const* caster)
    {
        bool twoHanded = caster->HasAura(SPELL_MONK_2H_STAFF_OVERRIDE) || caster->HasAura(SPELL_MONK_2H_POLEARM_OVERRIDE);
        Player const* player = caster->ToPlayer();
        bool brewmaster = player && player->HasSpell(SPELL_MONK_BREWMASTER_TRAINING);
        float dwm = twoHanded ? 1.0f : 0.898882275f;
        float bm = brewmaster ? 0.4f : 1.0f;
        float apc = caster->GetTotalAttackPowerValue(BASE_ATTACK) / (brewmaster ? 11.0f : 14.0f);

        auto speed = [caster](WeaponAttackType type) { return std::max(caster->GetBaseAttackTime(type), 1u) / 1000.0f; };
        float mainSpeed = speed(BASE_ATTACK);
        float mainMin = caster->GetWeaponDamageRange(BASE_ATTACK, MINDAMAGE);
        float mainMax = caster->GetWeaponDamageRange(BASE_ATTACK, MAXDAMAGE);

        float offLow = 0.0f, offHigh = 0.0f;
        if (!twoHanded)
        {
            bool useOffHand = player && player->HasSpell(SPELL_MONK_DUAL_WIELD_OFFHAND) && caster->haveOffhandWeapon();
            WeaponAttackType type = useOffHand ? OFF_ATTACK : BASE_ATTACK;
            offLow = caster->GetWeaponDamageRange(type, MINDAMAGE) / 2.0f / speed(type);
            offHigh = caster->GetWeaponDamageRange(type, MAXDAMAGE) / 2.0f / speed(type);
        }

        float low = bm * dwm * (mainMin / mainSpeed + offLow) + apc - 1.0f;
        float high = bm * dwm * (mainMax / mainSpeed + offHigh) + apc + 1.0f;
        return { std::max(low, 0.0f), std::max(high, 0.0f) };
    }

    // 100784 - Blackout Kick
    class spell_monk_blackout_kick : public SpellScript
    {
        // The DB2 effect carries only BasePoints 1; the damage is the tooltip's 7.12 x <low>..<high>
        void CalculateDamage(SpellEffectInfo const& /*spellEffectInfo*/, Unit* /*victim*/, int32& damage, int32& /*flatMod*/, float& /*pctMod*/) const
        {
            auto [low, high] = GetMonkMeleeDamageRange(GetCaster());
            damage = int32(7.12f * frand(low, high));
        }

        void Register() override
        {
            CalcDamage += SpellCalcDamageFn(spell_monk_blackout_kick::CalculateDamage);
        }
    };

    enum MonkCreatures
    {
        NPC_MONK_BLACK_OX_STATUE            = 61146
    };

    // 100780 - Jab
    // 108557, 115687, 115693, 115695, 115698 - Jab (weapon overrides)
    class spell_monk_jab : public SpellScript
    {
        bool Validate(SpellInfo const* spellInfo) override
        {
            return ValidateSpellInfo({ SPELL_MONK_CHI_ENERGIZE }) && ValidateSpellEffect({ { spellInfo->Id, EFFECT_1 } });
        }

        // Retail 70449 sniff: one 121588 cast (+1 Chi) per effect point on each hit, none on a miss;
        // Fierce Tiger's PointsIndex1 mod makes it 2.
        void HandleChi(SpellEffIndex /*effIndex*/) const
        {
            Unit* caster = GetCaster();
            for (int32 i = 0; i < GetEffectValueAsInt(); ++i)
                caster->CastSpell(caster, SPELL_MONK_CHI_ENERGIZE, GetSpell());
        }

        void Register() override
        {
            OnEffectHitTarget += SpellEffectFn(spell_monk_jab::HandleChi, EFFECT_1, SPELL_EFFECT_DUMMY);
        }
    };

    // 115546 - Provoke
    class spell_monk_provoke : public SpellScript
    {
        bool Validate(SpellInfo const* spellInfo) override
        {
            if (!(spellInfo->GetExplicitTargetMask() & TARGET_FLAG_UNIT_MASK))
                return false;

            return ValidateSpellInfo({ SPELL_MONK_PROVOKE_SINGLE_TARGET, SPELL_MONK_PROVOKE_AOE });
        }

        SpellCastResult CheckExplicitTarget()
        {
            Unit* target = GetExplTargetUnit();
            if (target->GetEntry() != NPC_MONK_BLACK_OX_STATUE)
            {
                SpellInfo const* singleTarget = sSpellMgr->AssertSpellInfo(SPELL_MONK_PROVOKE_SINGLE_TARGET, GetCastDifficulty());
                return singleTarget->CheckExplicitTarget(GetCaster(), target);
            }

            if (target->GetOwnerGUID() != GetCaster()->GetGUID())
                return SPELL_FAILED_BAD_TARGETS;

            return SPELL_CAST_OK;
        }

        void HandleDummy(SpellEffIndex effIndex)
        {
            PreventHitDefaultEffect(effIndex);
            Unit* target = GetHitUnit();
            GetCaster()->CastSpell(target, target->GetEntry() == NPC_MONK_BLACK_OX_STATUE ? SPELL_MONK_PROVOKE_AOE : SPELL_MONK_PROVOKE_SINGLE_TARGET, true);
        }

        void Register() override
        {
            OnCheckCast += SpellCheckCastFn(spell_monk_provoke::CheckExplicitTarget);
            OnEffectHitTarget += SpellEffectFn(spell_monk_provoke::HandleDummy, EFFECT_0, SPELL_EFFECT_DUMMY);
        }
    };

    // 109132 - Roll
    class spell_monk_roll : public SpellScript
    {
        bool Validate(SpellInfo const* /*spellInfo*/) override
        {
            return ValidateSpellInfo({ SPELL_MONK_ROLL_BACKWARD, SPELL_MONK_ROLL_FORWARD });
        }

        SpellCastResult CheckCast()
        {
            if (GetCaster()->HasUnitState(UNIT_STATE_ROOT))
                return SPELL_FAILED_ROOTED;

            return SPELL_CAST_OK;
        }

        void HandleDummy(SpellEffIndex /*effIndex*/)
        {
            Unit* caster = GetCaster();
            // Fully triggered: with only IGNORE_CAST_IN_PROGRESS the roll failed with NOT_READY (GCD Roll itself started)
            caster->CastSpell(caster, caster->HasUnitMovementFlag(MOVEMENTFLAG_BACKWARD) ? SPELL_MONK_ROLL_BACKWARD : SPELL_MONK_ROLL_FORWARD,
                TRIGGERED_FULL_MASK);
        }

        void Register() override
        {
            OnCheckCast += SpellCheckCastFn(spell_monk_roll::CheckCast);
            OnEffectHitTarget += SpellEffectFn(spell_monk_roll::HandleDummy, EFFECT_0, SPELL_EFFECT_DUMMY);
        }
    };

    // 107427 - Roll
    // 109131 - Roll (backward)
    class spell_monk_roll_aura : public AuraScript
    {
        // A backward roll moves at run speed: retail 70449 sends run and run-back 21.175 during the roll.
        void ChangeRunBackSpeed(AuraEffect const* /*aurEff*/, AuraEffectHandleModes /*mode*/) const
        {
            GetTarget()->SetSpeed(MOVE_RUN_BACK, GetTarget()->GetSpeed(MOVE_RUN));
        }

        void RestoreRunBackSpeed(AuraEffect const* /*aurEff*/, AuraEffectHandleModes /*mode*/) const
        {
            GetTarget()->UpdateSpeed(MOVE_RUN_BACK);
        }

        void Register() override
        {
            AfterEffectApply += AuraEffectApplyFn(spell_monk_roll_aura::ChangeRunBackSpeed, EFFECT_4, SPELL_AURA_USE_NORMAL_MOVEMENT_SPEED, AURA_EFFECT_HANDLE_REAL);
            AfterEffectRemove += AuraEffectApplyFn(spell_monk_roll_aura::RestoreRunBackSpeed, EFFECT_4, SPELL_AURA_USE_NORMAL_MOVEMENT_SPEED, AURA_EFFECT_HANDLE_REAL);
        }
    };
}

void AddSC_monk_spell_scripts()
{
    using namespace Scripts::Spells::Monk;
    RegisterSpellScript(spell_monk_blackout_kick);
    RegisterSpellScript(spell_monk_jab);
    RegisterSpellScript(spell_monk_provoke);
    RegisterSpellScript(spell_monk_roll);
    RegisterSpellScript(spell_monk_roll_aura);
}
