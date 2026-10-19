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

#include "WorldSession.h"
#include "Common.h"
#include "DB2Stores.h"
#include "GossipDef.h"
#include "Log.h"
#include "ObjectAccessor.h"
#include "Pet.h"
#include "Player.h"
#include "SpellPackets.h"
#include "TalentPackets.h"

void WorldSession::HandleLearnTalentOpcode(WorldPackets::Talent::LearnTalent& packet)
{
    if (_player->LearnTalent(packet.TalentID, packet.Rank))
        _player->SendTalentsInfoData();
}

void WorldSession::HandleLearnPreviewTalentsOpcode(WorldPackets::Talent::LearnPreviewTalents& packet)
{
    if (!_player->GetPrimaryTalentTree() && packet.TabIndex >= 0)
        if (TalentTabEntry const* talentTab = sDB2Manager.GetTalentTabByIndex(_player->GetClass(), packet.TabIndex))
            _player->SetPrimaryTalentTree(talentTab->ID, true);

    for (auto const& talentInfo : packet.Talents)
        if (!_player->LearnTalent(talentInfo.TalentID, talentInfo.Rank))
            break;

    _player->SendTalentsInfoData();
}

void WorldSession::HandleSetPrimaryTalentTreeOpcode(WorldPackets::Talent::SetPrimaryTalentTree& packet)
{
    if (_player->GetPrimaryTalentTree() != 0 || packet.TabIndex < 0)
        return;

    if (TalentTabEntry const* talentTab = sDB2Manager.GetTalentTabByIndex(_player->GetClass(), packet.TabIndex))
        _player->SetPrimaryTalentTree(talentTab->ID, true);
}

void WorldSession::HandleSetSpecializationOpcode(WorldPackets::Talent::SetSpecialization& packet)
{
    ChrSpecializationEntry const* spec = sChrSpecializationStore.LookupEntry(packet.SpecID);
    if (!spec || spec->IsPetSpecialization() || spec->ClassID != _player->GetClass() || spec->OrderIndex >= INITIAL_SPECIALIZATION_INDEX)
        return;

    // Client sends this only while the active group still has the initial spec (0x14180DB50); changing needs a respec.
    if (_player->GetTalentGroupSpecialization(_player->GetActiveTalentGroup()) || _player->GetLevel() < MIN_SPECIALIZATION_LEVEL)
        return;

    if (_player->IsInCombat() || _player->IsNonMeleeSpellCast(false))
        return;

    _player->SetSpecialization(spec);
}

void WorldSession::HandleLearnTalentsOpcode(WorldPackets::Talent::LearnTalents& packet)
{
    if (_player->IsInCombat())
        return;

    bool anythingLearned = false;
    for (uint16 talentId : packet.Talents)
        if (_player->LearnTalent(talentId, 0))
            anythingLearned = true;

    if (anythingLearned)
        _player->SendTalentsInfoData();
}

void WorldSession::HandleRemoveGlyphOpcode(WorldPackets::Talent::RemoveGlyph& packet)
{
    if (_player->IsInCombat())
        return;

    _player->RemoveAurasWithInterruptFlags(SpellAuraInterruptFlags2::ChangeGlyph);
    _player->RemoveGlyph(packet.GlyphSlot);
}

void WorldSession::HandleSetLootSpecializationOpcode(WorldPackets::Talent::SetLootSpecialization& packet)
{
    if (packet.SpecID)
    {
        ChrSpecializationEntry const* spec = sChrSpecializationStore.LookupEntry(packet.SpecID);
        if (!spec || spec->ClassID != _player->GetClass() || spec->OrderIndex >= INITIAL_SPECIALIZATION_INDEX)
            return;
    }

    _player->SetLootSpecId(packet.SpecID);
}

void WorldSession::HandleConfirmRespecWipeOpcode(WorldPackets::Talent::ConfirmRespecWipe& confirmRespecWipe)
{
    Creature* unit = GetPlayer()->GetNPCIfCanInteractWith(confirmRespecWipe.RespecMaster, UNIT_NPC_FLAG_TRAINER, UNIT_NPC_FLAG_2_NONE);
    if (!unit)
    {
        TC_LOG_DEBUG("network", "WORLD: HandleConfirmRespecWipeOpcode - {} not found or you can't interact with him.", confirmRespecWipe.RespecMaster);
        return;
    }

    if (confirmRespecWipe.RespecType == SPEC_RESET_SPECIALIZATION)
    {
        // TODO(verify): SpecializationMaster gossip offers this for free (cost 0); SkyFire charges a separate fee.
        if (!_player->GetTalentGroupSpecialization(_player->GetActiveTalentGroup()) || _player->IsInCombat())
            return;

        _player->ResetSpecialization();
        unit->CastSpell(_player, 14867 /*SPELL_UNTALENT_VISUAL_EFFECT*/, true);
        return;
    }

    if (confirmRespecWipe.RespecType != SPEC_RESET_TALENTS)
    {
        TC_LOG_DEBUG("network", "WORLD: HandleConfirmRespecWipeOpcode - reset type {} is not implemented.", confirmRespecWipe.RespecType);
        return;
    }

    if (!unit->CanResetTalents(_player))
        return;

    int64 cost = _player->GetNextResetTalentsCost();
    if (!_player->HasEnoughMoney(cost))
        return; // // silently return, client should display the error by itself

    // remove fake death
    if (GetPlayer()->HasUnitState(UNIT_STATE_DIED))
        GetPlayer()->RemoveAurasByType(SPELL_AURA_FEIGN_DEATH);

    if (!_player->ResetTalents())
    {
        _player->SendRespecWipeConfirm(ObjectGuid::Empty, 0, static_cast<SpecResetType>(confirmRespecWipe.RespecType));
        return;
    }

    _player->ModifyMoney(-cost);
    _player->IncreaseResetTalentsCostAndCounters(cost);
    //_player->SendTalentsInfoData();

    unit->CastSpell(_player, 14867 /*SPELL_UNTALENT_VISUAL_EFFECT*/, true);
}

void WorldSession::HandleUnlearnSkillOpcode(WorldPackets::Spells::UnlearnSkill& packet)
{
    SkillRaceClassInfoEntry const* rcEntry = sDB2Manager.GetSkillRaceClassInfo(packet.SkillLine, GetPlayer()->GetRace(), GetPlayer()->GetClass());
    if (!rcEntry || !(rcEntry->Flags & SKILL_FLAG_UNLEARNABLE))
        return;

    GetPlayer()->SetSkill(packet.SkillLine, 0, 0, 0);
}
