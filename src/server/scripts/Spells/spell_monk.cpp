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
        SPELL_MONK_MANA_MEDITATION          = 121278, // Mistweaver: $mist in the damage formula
        SPELL_MONK_DUAL_WIELD_OFFHAND       = 124146, // $offl/$offh use the off-hand weapon
        SPELL_MONK_EXPEL_HARM_DAMAGE        = 115129
    };

    // How a 5.5.4 SpellDescriptionVariables formula treats the off-hand (docs/mop-port/monk-damage.md)
    enum class MonkFormula
    {
        MainOnly,   // 907, 278, 281: off-hand term only with Dual Wield (124146)
        WithOffHand // 251, 279, 301: off-hand term from the main hand without Dual Wield, none with a 2H override
    };

    // The client's $<low>/$<high>, minus the stance, Brewmaster and Muscle Memory factors the server applies as auras
    static std::pair<float, float> GetMonkTooltipRange(Unit const* caster, MonkFormula formula, float scale)
    {
        bool twoHanded = caster->HasAura(SPELL_MONK_2H_STAFF_OVERRIDE) || caster->HasAura(SPELL_MONK_2H_POLEARM_OVERRIDE);
        bool mistweaver = caster->HasAura(SPELL_MONK_MANA_MEDITATION);
        Player const* player = caster->ToPlayer();
        bool dualWield = player && player->HasSpell(SPELL_MONK_DUAL_WIELD_OFFHAND);
        float dw = twoHanded ? 1.0f : 0.898882275f;
        float ap = caster->GetTotalAttackPowerValue(BASE_ATTACK) / 14.0f;

        auto speed = [caster](WeaponAttackType type) { return std::max(caster->GetBaseAttackTime(type), 1u) / 1000.0f; };
        auto weapon = [caster](WeaponAttackType type, WeaponDamageRange range) { return caster->GetWeaponDamageRange(type, range); };

        float mist = 1.0f;
        float offLow = 0.0f, offHigh = 0.0f;
        if (formula == MonkFormula::MainOnly)
        {
            if (mistweaver)
                mist = twoHanded ? 0.5f : 0.75f;
            if (dualWield)
            {
                offLow = weapon(OFF_ATTACK, MINDAMAGE) / 2.0f / speed(OFF_ATTACK);
                offHigh = weapon(OFF_ATTACK, MAXDAMAGE) / 2.0f / speed(OFF_ATTACK);
            }
        }
        else
        {
            if (mistweaver)
                mist = 0.5f;
            if (!twoHanded)
            {
                WeaponAttackType type = dualWield ? OFF_ATTACK : BASE_ATTACK;
                offLow = weapon(type, MINDAMAGE) / 2.0f / speed(type);
                offHigh = weapon(type, MAXDAMAGE) / 2.0f / speed(type);
            }
        }

        float mainSpeed = speed(BASE_ATTACK);
        float low = scale * (dw * (weapon(BASE_ATTACK, MINDAMAGE) / mainSpeed * mist + offLow) + ap - 1.0f);
        float high = scale * (dw * (weapon(BASE_ATTACK, MAXDAMAGE) / mainSpeed * mist + offHigh) + ap + 1.0f);
        return { std::max(low, 0.0f), std::max(high, 0.0f) };
    }

    // 100784, 107428, 117418, 121253, 115073, 107270, 148187 (spell list in docs/mop-port/monk-damage.md)
    // The DB2 effect carries a placeholder of 1; the damage is the tooltip's multiplier x <low>..<high>
    class spell_monk_tooltip_damage : public SpellScript
    {
    public:
        spell_monk_tooltip_damage(float multiplier, MonkFormula formula, float scale, bool splitBetweenTargets)
            : _multiplier(multiplier), _formula(formula), _scale(scale), _splitBetweenTargets(splitBetweenTargets) { }

    private:
        void CalculateDamage(SpellEffectInfo const& spellEffectInfo, Unit* /*victim*/, int32& damage, int32& /*flatMod*/, float& /*pctMod*/) const
        {
            auto [low, high] = GetMonkTooltipRange(GetCaster(), _formula, _scale);
            float value = _multiplier * frand(low, high);
            if (_splitBetweenTargets)
                value /= std::max<int64>(GetUnitTargetCountForEffect(spellEffectInfo.EffectIndex), 1);
            damage = int32(value);
        }

        void Register() override
        {
            CalcDamage += SpellCalcDamageFn(spell_monk_tooltip_damage::CalculateDamage);
        }

        float _multiplier;
        MonkFormula _formula;
        float _scale;
        bool _splitBetweenTargets;
    };

    // 115072 - Expel Harm, 147489 - Expel Harm (Glyph of Targeted Expulsion)
    class spell_monk_expel_harm : public SpellScript
    {
        bool Validate(SpellInfo const* /*spellInfo*/) override
        {
            return ValidateSpellEffect({ { SPELL_MONK_EXPEL_HARM_DAMAGE, EFFECT_1 } });
        }

        // Tooltip: 7 x <low>..<high> (description variables 278)
        void CalculateHealing(SpellEffectInfo const& /*spellEffectInfo*/, Unit* /*victim*/, int32& healing, int32& /*flatMod*/, float& /*pctMod*/) const
        {
            auto [low, high] = GetMonkTooltipRange(GetCaster(), MonkFormula::MainOnly, 1.0f);
            healing = int32(7.0f * frand(low, high));
        }

        // $115129s2% of the amount healed hits a nearby enemy as Nature damage
        void HandleDamage() const
        {
            Unit* target = GetHitUnit();
            int32 healed = GetHitHeal();
            if (!target || healed <= 0)
                return;

            SpellInfo const* damageInfo = sSpellMgr->AssertSpellInfo(SPELL_MONK_EXPEL_HARM_DAMAGE, GetCastDifficulty());
            CastSpellExtraArgs args(TRIGGERED_FULL_MASK);
            args.AddSpellMod(SPELLVALUE_BASE_POINT0, CalculatePct(healed, damageInfo->GetEffect(EFFECT_1).CalcValue(GetCaster())));
            GetCaster()->CastSpell(target, SPELL_MONK_EXPEL_HARM_DAMAGE, args);
        }

        void Register() override
        {
            CalcHealing += SpellCalcHealingFn(spell_monk_expel_harm::CalculateHealing);
            AfterHit += SpellHitFn(spell_monk_expel_harm::HandleDamage);
        }
    };

    // 115129 - Expel Harm (damage)
    class spell_monk_expel_harm_damage : public SpellScript
    {
        // "dealt to a nearby enemy": one target, the closest to the healed unit
        void FilterTargets(std::list<WorldObject*>& targets) const
        {
            if (targets.size() <= 1)
                return;

            WorldObject const* origin = GetExplTargetUnit() ? static_cast<WorldObject const*>(GetExplTargetUnit()) : GetCaster();
            targets.sort(Trinity::ObjectDistanceOrderPred(origin));
            targets.resize(1);
        }

        void Register() override
        {
            OnObjectAreaTargetSelect += SpellObjectAreaTargetSelectFn(spell_monk_expel_harm_damage::FilterTargets, EFFECT_0, TARGET_UNIT_DEST_AREA_ENEMY);
        }
    };

    // 132463/132467 - Chi Wave, 130654/148135 - Chi Burst, 124098/125033/124101 - Zen Sphere
    // Tooltip is $m1 + AP x coefficient (description variables 266, 295, 296); the server only computed $m1
    class spell_monk_ap_bonus : public SpellScript
    {
    public:
        explicit spell_monk_ap_bonus(float coefficient) : _coefficient(coefficient) { }

    private:
        void AddAttackPower(SpellEffectInfo const& /*spellEffectInfo*/, Unit* /*victim*/, int32& value, int32& /*flatMod*/, float& /*pctMod*/) const
        {
            value += int32(GetCaster()->GetTotalAttackPowerValue(BASE_ATTACK) * _coefficient);
        }

        void Register() override
        {
            if (m_scriptSpellId == 132463 || m_scriptSpellId == 130654 || m_scriptSpellId == 124101)
                CalcHealing += SpellCalcHealingFn(spell_monk_ap_bonus::AddAttackPower);
            else
                CalcDamage += SpellCalcDamageFn(spell_monk_ap_bonus::AddAttackPower);
        }

        float _coefficient;
    };

    // 124081 - Zen Sphere (periodic heal): $124081m1 + AP x 0.104
    class spell_monk_zen_sphere_periodic : public AuraScript
    {
        void CalculateAmount(AuraEffect const* /*aurEff*/, SpellEffectValue& amount, bool& /*canBeRecalculated*/) const
        {
            if (Unit* caster = GetCaster())
                amount += caster->GetTotalAttackPowerValue(BASE_ATTACK) * 0.104f;
        }

        void Register() override
        {
            DoEffectCalcAmount += AuraEffectCalcAmountFn(spell_monk_zen_sphere_periodic::CalculateAmount, EFFECT_0, SPELL_AURA_PERIODIC_HEAL);
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
    RegisterSpellScriptWithArgs(spell_monk_tooltip_damage, "spell_monk_blackout_kick", 7.12f, MonkFormula::MainOnly, 1.0f, false);
    RegisterSpellScriptWithArgs(spell_monk_tooltip_damage, "spell_monk_rising_sun_kick", 14.4f, MonkFormula::WithOffHand, 0.89f, false);
    RegisterSpellScriptWithArgs(spell_monk_tooltip_damage, "spell_monk_fists_of_fury_damage", 7.5f, MonkFormula::WithOffHand, 0.89f, true);
    RegisterSpellScriptWithArgs(spell_monk_tooltip_damage, "spell_monk_keg_smash", 10.0f, MonkFormula::WithOffHand, 1.0f, false);
    RegisterSpellScriptWithArgs(spell_monk_tooltip_damage, "spell_monk_spinning_fire_blossom", 2.1f, MonkFormula::WithOffHand, 1.0f, false);
    RegisterSpellScriptWithArgs(spell_monk_tooltip_damage, "spell_monk_spinning_crane_kick_damage", 1.59f, MonkFormula::MainOnly, 1.75f / 1.59f, false);
    RegisterSpellScriptWithArgs(spell_monk_tooltip_damage, "spell_monk_rushing_jade_wind_damage", 1.59f, MonkFormula::WithOffHand, 1.4f / 1.59f, false);
    RegisterSpellScript(spell_monk_expel_harm);
    RegisterSpellScript(spell_monk_expel_harm_damage);
    RegisterSpellScriptWithArgs(spell_monk_ap_bonus, "spell_monk_chi_wave_heal", 0.45f);
    RegisterSpellScriptWithArgs(spell_monk_ap_bonus, "spell_monk_chi_wave_damage", 0.45f);
    RegisterSpellScriptWithArgs(spell_monk_ap_bonus, "spell_monk_chi_burst_heal", 1.0f);
    RegisterSpellScriptWithArgs(spell_monk_ap_bonus, "spell_monk_chi_burst_damage", 1.21f);
    RegisterSpellScriptWithArgs(spell_monk_ap_bonus, "spell_monk_zen_sphere_damage", 0.104f);
    RegisterSpellScriptWithArgs(spell_monk_ap_bonus, "spell_monk_zen_sphere_detonate_damage", 0.423f);
    RegisterSpellScriptWithArgs(spell_monk_ap_bonus, "spell_monk_zen_sphere_detonate_heal", 0.269f);
    RegisterSpellScript(spell_monk_zen_sphere_periodic);
    RegisterSpellScript(spell_monk_jab);
    RegisterSpellScript(spell_monk_provoke);
    RegisterSpellScript(spell_monk_roll);
    RegisterSpellScript(spell_monk_roll_aura);
}
