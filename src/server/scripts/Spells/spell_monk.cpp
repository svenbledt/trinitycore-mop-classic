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
        SPELL_MONK_PROVOKE_SINGLE_TARGET    = 116189,
        SPELL_MONK_PROVOKE_AOE              = 118635,
        SPELL_MONK_ROLL_BACKWARD            = 109131,
        SPELL_MONK_ROLL_FORWARD             = 107427
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
            return ValidateSpellEffect({ { spellInfo->Id, EFFECT_1 } });
        }

        // 5.5.4 data makes the Chi gain a dummy (5.4.8: ENERGIZE Chi); Fierce Tiger's PointsIndex1 mod adds +1.
        // TODO(verify): energize spell ID and amount in a retail SPELL_ENERGIZE_LOG.
        void HandleChi(SpellEffIndex /*effIndex*/) const
        {
            Unit* caster = GetCaster();
            caster->EnergizeBySpell(caster, GetSpellInfo(), GetEffectValueAsInt(), POWER_CHI);
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
            caster->CastSpell(caster, caster->HasUnitMovementFlag(MOVEMENTFLAG_BACKWARD) ? SPELL_MONK_ROLL_BACKWARD : SPELL_MONK_ROLL_FORWARD,
                TRIGGERED_IGNORE_CAST_IN_PROGRESS);
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
        // A backward roll moves at run speed, not run-back speed.
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
    RegisterSpellScript(spell_monk_jab);
    RegisterSpellScript(spell_monk_provoke);
    RegisterSpellScript(spell_monk_roll);
    RegisterSpellScript(spell_monk_roll_aura);
}
