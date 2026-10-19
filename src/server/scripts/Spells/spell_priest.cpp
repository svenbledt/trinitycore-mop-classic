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
 * Scripts for spells with SPELLFAMILY_PRIEST and SPELLFAMILY_GENERIC spells used by priest players.
 * Ordered alphabetically using scriptname.
 * Scriptnames of files in this file should be prefixed with "spell_pri_".
 */

#include "ScriptMgr.h"
#include "Spell.h"
#include "SpellAuraEffects.h"
#include "SpellInfo.h"
#include "SpellMgr.h"
#include "SpellScript.h"
#include "Unit.h"

namespace Scripts::Spells::Priest
{
    enum PriestSpells
    {
        SPELL_PRIEST_PRAYER_OF_MENDING          = 33076,
        SPELL_PRIEST_PRAYER_OF_MENDING_AURA     = 41635,
        SPELL_PRIEST_PRAYER_OF_MENDING_HEAL     = 33110,
        SPELL_PRIEST_PRAYER_OF_MENDING_JUMP     = 351575
    };

    // 5.5.4 tooltip variables 208: $mending = $33076m1 * 1.7948 + SP * 0.571; the done-pct part ($pctH, $mult)
    // is applied by the server when 33110 heals. TODO(verify) against a retail sniff.
    static int32 CalculatePrayerOfMendingHeal(Unit const* priest)
    {
        SpellInfo const* spellInfo = sSpellMgr->AssertSpellInfo(SPELL_PRIEST_PRAYER_OF_MENDING, DIFFICULTY_NONE);
        float base = spellInfo->GetEffect(EFFECT_0).CalcValue(priest) * 1.7948f;
        return int32(base + priest->SpellBaseHealingBonusDone(spellInfo->GetSchoolMask()) * 0.571f);
    }

    static void CastPrayerOfMendingAura(Unit* priest, Unit* target, int32 stacks)
    {
        CastSpellExtraArgs args(TRIGGERED_FULL_MASK);
        args.AddSpellMod(SPELLVALUE_AURA_STACK, stacks);
        args.AddSpellBP0(CalculatePrayerOfMendingHeal(priest));
        priest->CastSpell(target, SPELL_PRIEST_PRAYER_OF_MENDING_AURA, args);
    }

    // 33076 - Prayer of Mending
    class spell_pri_prayer_of_mending : public SpellScript
    {
        bool Validate(SpellInfo const* /*spellInfo*/) override
        {
            return ValidateSpellInfo({ SPELL_PRIEST_PRAYER_OF_MENDING_AURA, SPELL_PRIEST_PRAYER_OF_MENDING_HEAL, SPELL_PRIEST_PRAYER_OF_MENDING_JUMP })
                && ValidateSpellEffect({ { SPELL_PRIEST_PRAYER_OF_MENDING, EFFECT_1 } });
        }

        // EFFECT_1 holds the number of heals ($<charges>), kept as the aura's stack count
        void HandleDummy(SpellEffIndex /*effIndex*/) const
        {
            int32 stacks = GetSpellInfo()->GetEffect(EFFECT_1).CalcValue(GetCaster());
            CastPrayerOfMendingAura(GetCaster(), GetHitUnit(), stacks);
        }

        void Register() override
        {
            OnEffectHitTarget += SpellEffectFn(spell_pri_prayer_of_mending::HandleDummy, EFFECT_0, SPELL_EFFECT_DUMMY);
        }
    };

    // 41635 - Prayer of Mending (aura)
    class spell_pri_prayer_of_mending_aura : public AuraScript
    {
        bool Validate(SpellInfo const* /*spellInfo*/) override
        {
            return ValidateSpellInfo({ SPELL_PRIEST_PRAYER_OF_MENDING_HEAL, SPELL_PRIEST_PRAYER_OF_MENDING_JUMP });
        }

        void HandleHeal(AuraEffect const* aurEff, ProcEventInfo const& /*eventInfo*/)
        {
            Unit* target = GetTarget();
            Unit* priest = GetCaster();
            if (!priest)
                return;

            CastSpellExtraArgs healArgs(aurEff);
            healArgs.AddSpellBP0(aurEff->GetAmount());
            priest->CastSpell(target, SPELL_PRIEST_PRAYER_OF_MENDING_HEAL, healArgs);

            if (GetStackAmount() > 1)
            {
                CastSpellExtraArgs jumpArgs(aurEff);
                jumpArgs.OriginalCaster = priest->GetGUID();
                jumpArgs.AddSpellBP0(GetStackAmount() - 1);
                target->CastSpell(target, SPELL_PRIEST_PRAYER_OF_MENDING_JUMP, jumpArgs);
            }

            Remove();
        }

        void Register() override
        {
            OnEffectProc += AuraEffectProcFn(spell_pri_prayer_of_mending_aura::HandleHeal, EFFECT_0, SPELL_AURA_DUMMY);
        }
    };

    // 351575 - Prayer of Mending (jump)
    class spell_pri_prayer_of_mending_jump : public SpellScript
    {
        bool Validate(SpellInfo const* /*spellInfo*/) override
        {
            return ValidateSpellInfo({ SPELL_PRIEST_PRAYER_OF_MENDING_AURA });
        }

        void FilterTargets(std::list<WorldObject*>& targets) const
        {
            targets.remove(GetCaster());
            Trinity::SelectRandomInjuredTargets(targets, 1, true);
        }

        void HandleJump(SpellEffIndex /*effIndex*/) const
        {
            if (Unit* priest = GetOriginalCaster())
                CastPrayerOfMendingAura(priest, GetHitUnit(), GetEffectValueAsInt());
        }

        void Register() override
        {
            OnObjectAreaTargetSelect += SpellObjectAreaTargetSelectFn(spell_pri_prayer_of_mending_jump::FilterTargets, EFFECT_0, TARGET_UNIT_SRC_AREA_ALLY);
            OnEffectHitTarget += SpellEffectFn(spell_pri_prayer_of_mending_jump::HandleJump, EFFECT_0, SPELL_EFFECT_DUMMY);
        }
    };
}

void AddSC_priest_spell_scripts()
{
    using namespace Scripts::Spells::Priest;
    RegisterSpellScript(spell_pri_prayer_of_mending);
    RegisterSpellScript(spell_pri_prayer_of_mending_aura);
    RegisterSpellScript(spell_pri_prayer_of_mending_jump);
}
