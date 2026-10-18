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
#include "CollectionMgr.h"
#include "DB2Stores.h"
#include "Item.h"
#include "Log.h"
#include "NPCPackets.h"
#include "ObjectMgr.h"
#include "Player.h"
#include "TransmogMgr.h"
#include "TransmogrificationPackets.h"
#include "Util.h"

void WorldSession::HandleTransmogrifyItems(WorldPackets::Transmogrification::TransmogrifyItems& transmogrifyItems)
{
    Player* player = GetPlayer();
    // Validate
    if (!player->GetNPCIfCanInteractWith(transmogrifyItems.Npc, UNIT_NPC_FLAG_TRANSMOGRIFIER, UNIT_NPC_FLAG_2_NONE))
    {
        TC_LOG_DEBUG("network", "WORLD: HandleTransmogrifyItems - {} not found or player can't interact with it.", transmogrifyItems.Npc.ToString());
        return;
    }

    int64 cost = 0;
    std::unordered_map<Item*, std::pair<uint32, uint32>> transmogItems;
    std::unordered_map<Item*, uint32> illusionItems;

    std::vector<Item*> resetAppearanceItems;
    std::vector<Item*> resetIllusionItems;
    std::vector<uint32> bindAppearances;

    auto validateAndStoreTransmogItem = [&](Item* itemTransmogrified, uint32 itemModifiedAppearanceId, bool isSecondary)
    {
        ItemModifiedAppearanceEntry const* itemModifiedAppearance = sItemModifiedAppearanceStore.LookupEntry(itemModifiedAppearanceId);
        if (!itemModifiedAppearance)
        {
            TC_LOG_DEBUG("network", "WORLD: HandleTransmogrifyItems - {}, Name: {} tried to transmogrify using invalid appearance ({}).", player->GetGUID().ToString(), player->GetName(), itemModifiedAppearanceId);
            return false;
        }

        if (isSecondary && itemTransmogrified->GetTemplate()->GetInventoryType() != INVTYPE_SHOULDERS)
        {
            TC_LOG_DEBUG("network", "WORLD: HandleTransmogrifyItems - {}, Name: {} tried to transmogrify secondary appearance to non-shoulder item.", player->GetGUID().ToString(), player->GetName());
            return false;
        }

        auto [hasAppearance, isTemporary] = GetCollectionMgr()->HasItemAppearance(itemModifiedAppearanceId);
        if (!hasAppearance)
        {
            TC_LOG_DEBUG("network", "WORLD: HandleTransmogrifyItems - {}, Name: {} tried to transmogrify using appearance he has not collected ({}).", player->GetGUID().ToString(), player->GetName(), itemModifiedAppearanceId);
            return false;
        }
        ItemTemplate const* itemTemplate = sObjectMgr->GetItemTemplate(itemModifiedAppearance->ItemID);
        if (player->CanUseItem(itemTemplate) != EQUIP_ERR_OK)
        {
            TC_LOG_DEBUG("network", "WORLD: HandleTransmogrifyItems - {}, Name: {} tried to transmogrify using appearance he can never use ({}).", player->GetGUID().ToString(), player->GetName(), itemModifiedAppearanceId);
            return false;
        }

        // validity of the transmogrification items
        if (!Item::CanTransmogrifyItemWithItem(itemTransmogrified, itemModifiedAppearance))
        {
            TC_LOG_DEBUG("network", "WORLD: HandleTransmogrifyItems - {}, Name: {} failed CanTransmogrifyItemWithItem ({} with appearance {}).", player->GetGUID().ToString(), player->GetName(), itemTransmogrified->GetEntry(), itemModifiedAppearanceId);
            return false;
        }

        if (!isSecondary)
            transmogItems[itemTransmogrified].first = itemModifiedAppearanceId;
        else
            transmogItems[itemTransmogrified].second = itemModifiedAppearanceId;

        if (isTemporary)
            bindAppearances.push_back(itemModifiedAppearanceId);

        return true;
    };

    for (WorldPackets::Transmogrification::TransmogrifyItem const& transmogItem : transmogrifyItems.Items)
    {
        // slot of the transmogrified item
        if (transmogItem.Slot >= EQUIPMENT_SLOT_END)
        {
            TC_LOG_DEBUG("network", "WORLD: HandleTransmogrifyItems - Player ({}, name: {}) tried to transmogrify wrong slot ({}) when transmogrifying items.", player->GetGUID().ToString(), player->GetName(), transmogItem.Slot);
            return;
        }

        // transmogrified item
        Item* itemTransmogrified = player->GetItemByPos(INVENTORY_SLOT_BAG_0, transmogItem.Slot);
        if (!itemTransmogrified)
        {
            TC_LOG_DEBUG("network", "WORLD: HandleTransmogrifyItems - Player ({}, name: {}) tried to transmogrify an invalid item in a valid slot (slot: {}).", player->GetGUID().ToString(), player->GetName(), transmogItem.Slot);
            return;
        }

        if (transmogItem.ItemModifiedAppearanceID || transmogItem.SecondaryItemModifiedAppearanceID > 0)
        {
            if (transmogItem.ItemModifiedAppearanceID && !validateAndStoreTransmogItem(itemTransmogrified, transmogItem.ItemModifiedAppearanceID, false))
                return;

            if (transmogItem.SecondaryItemModifiedAppearanceID > 0 && !validateAndStoreTransmogItem(itemTransmogrified, transmogItem.SecondaryItemModifiedAppearanceID, true))
                return;

            // add cost
            cost += itemTransmogrified->GetSellPrice(_player);
        }
        else
            resetAppearanceItems.push_back(itemTransmogrified);
    }

    if (!player->HasAuraType(SPELL_AURA_REMOVE_TRANSMOG_COST) && cost) // 0 cost if reverting look
    {
        if (!player->HasEnoughMoney(cost))
            return;
        player->ModifyMoney(-cost);
    }

    // Everything is fine, proceed
    for (auto& transmogPair : transmogItems)
    {
        Item* transmogrified = transmogPair.first;

        if (!transmogrifyItems.CurrentSpecOnly)
        {
            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS, transmogPair.second.first);
            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_1, 0);
            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_2, 0);
            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_3, 0);
            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_4, 0);

            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS, transmogPair.second.second);
            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_1, 0);
            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_2, 0);
            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_3, 0);
            transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_4, 0);
        }
        else
        {
            if (!transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_1))
                transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_1, transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS));
            if (!transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_2))
                transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_2, transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS));
            if (!transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_3))
                transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_3, transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS));
            if (!transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_4))
                transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_4, transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS));

            if (!transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_1))
                transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_1, transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS));
            if (!transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_2))
                transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_2, transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS));
            if (!transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_3))
                transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_3, transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS));
            if (!transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_4))
                transmogrified->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_4, transmogrified->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS));

            transmogrified->SetModifier(AppearanceModifierSlotBySpec[player->GetActiveTalentGroup()], transmogPair.second.first);
            transmogrified->SetModifier(SecondaryAppearanceModifierSlotBySpec[player->GetActiveTalentGroup()], transmogPair.second.second);
        }

        player->SetVisibleItemSlot(transmogrified->GetSlot(), transmogrified);

        transmogrified->SetNotRefundable(player);
        transmogrified->ClearSoulboundTradeable(player);
        transmogrified->SetState(ITEM_CHANGED, player);
    }

    for (auto& illusionPair : illusionItems)
    {
        Item* transmogrified = illusionPair.first;

        if (!transmogrifyItems.CurrentSpecOnly)
        {
            transmogrified->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS, illusionPair.second);
            transmogrified->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_1, 0);
            transmogrified->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_2, 0);
            transmogrified->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_3, 0);
            transmogrified->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_4, 0);
        }
        else
        {
            if (!transmogrified->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_1))
                transmogrified->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_1, transmogrified->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS));
            if (!transmogrified->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_2))
                transmogrified->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_2, transmogrified->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS));
            if (!transmogrified->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_3))
                transmogrified->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_3, transmogrified->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS));
            if (!transmogrified->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_4))
                transmogrified->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_4, transmogrified->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS));
            transmogrified->SetModifier(IllusionModifierSlotBySpec[player->GetActiveTalentGroup()], illusionPair.second);
        }

        player->SetVisibleItemSlot(transmogrified->GetSlot(), transmogrified);

        transmogrified->SetNotRefundable(player);
        transmogrified->ClearSoulboundTradeable(player);
        transmogrified->SetState(ITEM_CHANGED, player);
    }

    for (Item* item : resetAppearanceItems)
    {
        if (!transmogrifyItems.CurrentSpecOnly)
        {
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS, 0);
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_1, 0);
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_2, 0);
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_3, 0);
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_4, 0);

            item->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS, 0);
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_1, 0);
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_2, 0);
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_3, 0);
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_4, 0);
        }
        else
        {
            if (!item->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_1))
                item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_1, item->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS));
            if (!item->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_2))
                item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_2, item->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS));
            if (!item->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_3))
                item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_3, item->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS));
            if (!item->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_4))
                item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_SPEC_4, item->GetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS));

            if (!item->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_1))
                item->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_1, item->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS));
            if (!item->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_2))
                item->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_2, item->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS));
            if (!item->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_3))
                item->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_3, item->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS));
            if (!item->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_4))
                item->SetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_SPEC_4, item->GetModifier(ITEM_MODIFIER_TRANSMOG_SECONDARY_APPEARANCE_ALL_SPECS));

            item->SetModifier(AppearanceModifierSlotBySpec[player->GetActiveTalentGroup()], 0);
            item->SetModifier(SecondaryAppearanceModifierSlotBySpec[player->GetActiveTalentGroup()], 0);
            item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS, 0);
        }

        item->SetState(ITEM_CHANGED, player);
        player->SetVisibleItemSlot(item->GetSlot(), item);
    }

    for (Item* item : resetIllusionItems)
    {
        if (!transmogrifyItems.CurrentSpecOnly)
        {
            item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS, 0);
            item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_1, 0);
            item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_2, 0);
            item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_3, 0);
            item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_4, 0);
        }
        else
        {
            if (!item->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_1))
                item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_1, item->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS));
            if (!item->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_2))
                item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_2, item->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS));
            if (!item->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_3))
                item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_3, item->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS));
            if (!item->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_4))
                item->SetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_SPEC_4, item->GetModifier(ITEM_MODIFIER_ENCHANT_ILLUSION_ALL_SPECS));

            item->SetModifier(IllusionModifierSlotBySpec[player->GetActiveTalentGroup()], 0);
            item->SetModifier(ITEM_MODIFIER_TRANSMOG_APPEARANCE_ALL_SPECS, 0);
        }

        item->SetState(ITEM_CHANGED, player);
        player->SetVisibleItemSlot(item->GetSlot(), item);
    }

    for (uint32 itemModifedAppearanceId : bindAppearances)
    {
        std::unordered_set<ObjectGuid> itemsProvidingAppearance = GetCollectionMgr()->GetItemsProvidingTemporaryAppearance(itemModifedAppearanceId);
        for (ObjectGuid const& itemGuid : itemsProvidingAppearance)
        {
            if (Item* item = player->GetItemByGuid(itemGuid))
            {
                item->SetNotRefundable(player);
                item->ClearSoulboundTradeable(player);
                GetCollectionMgr()->AddItemAppearance(item);
            }
        }
    }
}

namespace
{
// character_transmog_outfit.name is varchar(16)
bool IsValidTransmogOutfitName(std::string_view name)
{
    std::wstring wname;
    return Utf8toWStr(name, wname) && wname.length() <= 16;
}
}

void WorldSession::HandleTransmogOutfitNew(WorldPackets::Transmogrification::TransmogOutfitNew& transmogOutfitNew)
{
    if (!_player->GetNPCIfCanInteractWith(transmogOutfitNew.Npc, UNIT_NPC_FLAG_TRANSMOGRIFIER, UNIT_NPC_FLAG_2_NONE))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitNew - {} not found or player can't interact with it.",
            GetPlayerInfo(), transmogOutfitNew.Npc.ToString());
        return;
    }

    _player->RemoveAurasWithInterruptFlags(SpellAuraInterruptFlags::Interacting);

    if (transmogOutfitNew.Source != TransmogOutfitEntrySource::PlayerPurchased || transmogOutfitNew.Info.SetType != TransmogOutfitSetType::Outfit)
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitNew - source {} / set type {} not allowed.",
            GetPlayerInfo(), AsUnderlyingType(transmogOutfitNew.Source), AsUnderlyingType(transmogOutfitNew.Info.SetType));
        return;
    }

    if (!IsValidTransmogOutfitName(transmogOutfitNew.Info.Name))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitNew - invalid outfit name.", GetPlayerInfo());
        return;
    }

    TransmogOutfitEntryEntry const* transmogOutfitEntry = TransmogMgr::GetNextOutfitToUnlock(transmogOutfitNew.Source, _player);
    if (!transmogOutfitEntry)
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitNew - no next unlockable outfit entry found for source {}.",
            GetPlayerInfo(), AsUnderlyingType(transmogOutfitNew.Source));
        return;
    }

    if (!_player->HasEnoughMoney(transmogOutfitEntry->Cost))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitNew - not enough money.", GetPlayerInfo());
        return;
    }

    _player->CreateTransmogOutfit(transmogOutfitEntry->ID, transmogOutfitNew.Info);
    _player->ModifyMoney(-int64(transmogOutfitEntry->Cost));

    WorldPackets::Transmogrification::TransmogOutfitNewEntryAdded transmogOutfitNewEntryAdded;
    transmogOutfitNewEntryAdded.TransmogOutfitID = transmogOutfitEntry->ID;
    SendPacket(transmogOutfitNewEntryAdded.Write());
}

void WorldSession::HandleTransmogOutfitUpdateInfo(WorldPackets::Transmogrification::TransmogOutfitUpdateInfo& transmogOutfitUpdateInfo)
{
    if (!_player->GetNPCIfCanInteractWith(transmogOutfitUpdateInfo.Npc, UNIT_NPC_FLAG_TRANSMOGRIFIER, UNIT_NPC_FLAG_2_NONE))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateInfo - {} not found or player can't interact with it.",
            GetPlayerInfo(), transmogOutfitUpdateInfo.Npc.ToString());
        return;
    }

    _player->RemoveAurasWithInterruptFlags(SpellAuraInterruptFlags::Interacting);

    if (!IsValidTransmogOutfitName(transmogOutfitUpdateInfo.Info.Name))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateInfo - invalid outfit name.", GetPlayerInfo());
        return;
    }

    if (!_player->UpdateTransmogOutfit(transmogOutfitUpdateInfo.OutfitID, transmogOutfitUpdateInfo.Info))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateInfo - player does not have outfit {}.",
            GetPlayerInfo(), transmogOutfitUpdateInfo.OutfitID);
        return;
    }

    // SMSG_UPDATE_OBJECT must be received by client before transmog packet for UI to properly update
    Player::ValuesUpdateForPlayerWithMaskSender sendUpdateObject(_player);
    sendUpdateObject.ActivePlayerMask.MarkChanged(&UF::ActivePlayerData::TransmogOutfits);
    sendUpdateObject(_player);

    WorldPackets::Transmogrification::TransmogOutfitInfoUpdated transmogOutfitInfoUpdated;
    transmogOutfitInfoUpdated.TransmogOutfitID = transmogOutfitUpdateInfo.OutfitID;
    transmogOutfitInfoUpdated.OutfitInfo = &transmogOutfitUpdateInfo.Info;
    SendPacket(transmogOutfitInfoUpdated.Write());
}

void WorldSession::HandleTransmogOutfitUpdateSituations(WorldPackets::Transmogrification::TransmogOutfitUpdateSituations& transmogOutfitUpdateSituations)
{
    if (!_player->GetNPCIfCanInteractWith(transmogOutfitUpdateSituations.Npc, UNIT_NPC_FLAG_TRANSMOGRIFIER, UNIT_NPC_FLAG_2_NONE))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSituations - {} not found or player can't interact with it.",
            GetPlayerInfo(), transmogOutfitUpdateSituations.Npc.ToString());
        return;
    }

    _player->RemoveAurasWithInterruptFlags(SpellAuraInterruptFlags::Interacting);

    if (!_player->m_activePlayerData->TransmogOutfits->contains(transmogOutfitUpdateSituations.OutfitID))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSituations - player does not have outfit {}.",
            GetPlayerInfo(), transmogOutfitUpdateSituations.OutfitID);
        return;
    }

    if (!TransmogMgr::ValidateSituations(transmogOutfitUpdateSituations.Situations))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSituations - player sent invalid situations.", GetPlayerInfo());
        return;
    }

    _player->UpdateTransmogOutfitSituations(transmogOutfitUpdateSituations.OutfitID, transmogOutfitUpdateSituations.SituationsEnabled,
        transmogOutfitUpdateSituations.Situations);

    // SMSG_UPDATE_OBJECT must be received by client before transmog packet for UI to properly update
    Player::ValuesUpdateForPlayerWithMaskSender sendUpdateObject(_player);
    sendUpdateObject.ActivePlayerMask.MarkChanged(&UF::ActivePlayerData::TransmogOutfits);
    sendUpdateObject(_player);

    WorldPackets::Transmogrification::TransmogOutfitSituationsUpdated transmogOutfitSituationsUpdated;
    transmogOutfitSituationsUpdated.TransmogOutfitID = transmogOutfitUpdateSituations.OutfitID;
    transmogOutfitSituationsUpdated.SituationsEnabled = transmogOutfitUpdateSituations.SituationsEnabled;
    transmogOutfitSituationsUpdated.Situations = transmogOutfitUpdateSituations.Situations;
    SendPacket(transmogOutfitSituationsUpdated.Write());
}

void WorldSession::HandleTransmogOutfitUpdateSlots(WorldPackets::Transmogrification::TransmogOutfitUpdateSlots& transmogOutfitUpdateSlots)
{
    if (!_player->GetNPCIfCanInteractWith(transmogOutfitUpdateSlots.Npc, UNIT_NPC_FLAG_TRANSMOGRIFIER, UNIT_NPC_FLAG_2_NONE))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSlots - {} not found or player can't interact with it.",
            GetPlayerInfo(), transmogOutfitUpdateSlots.Npc.ToString());
        return;
    }

    _player->RemoveAurasWithInterruptFlags(SpellAuraInterruptFlags::Interacting);

    auto outfitItr = _player->m_activePlayerData->TransmogOutfits->find(transmogOutfitUpdateSlots.OutfitID);
    if (outfitItr == _player->m_activePlayerData->TransmogOutfits->end())
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSlots - player does not have outfit {}.",
            GetPlayerInfo(), transmogOutfitUpdateSlots.OutfitID);
        return;
    }

    UF::TransmogOutfitData const& transmogOutfit = outfitItr->second;

    if (!TransmogMgr::ValidateSlots(transmogOutfitUpdateSlots.Slots))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSlots - player sent invalid slots.", GetPlayerInfo());
        return;
    }

    std::vector<uint32> bindAppearances;
    for (WorldPackets::Transmogrification::TransmogOutfitSlotData const& slot : transmogOutfitUpdateSlots.Slots)
    {
        if (!slot.ItemModifiedAppearanceID)
            continue;

        auto [hasAppearance, isTemporary] = GetCollectionMgr()->HasItemAppearance(slot.ItemModifiedAppearanceID);
        if (!hasAppearance)
        {
            TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSlots - player does not have appearance {} in collection.",
                GetPlayerInfo(), slot.ItemModifiedAppearanceID);
            return;
        }

        if (isTemporary)
            bindAppearances.push_back(slot.ItemModifiedAppearanceID);
    }

    if (transmogOutfitUpdateSlots.UseAvailableDiscount && _player->HasPlayerLocalFlag(PLAYER_LOCAL_FLAG_FREE_TRANSMOG_CLAIMED))
    {
        TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSlots - player has already claimed free transmog before.", GetPlayerInfo());
        return;
    }

    uint64 cost = 0;
    if (!transmogOutfitUpdateSlots.UseAvailableDiscount)
    {
        // 5.5.4 sniffs match the curve at the player level, not at TransmogCostMinScalingLevel (90 while level 14 paid curve(14) = 960 per 1.0)
        float baseCost = 0.0f;
        if (uint32 curveId = sDB2Manager.GetGlobalCurveId(GlobalCurve::TransmogCost))
            baseCost = sDB2Manager.GetCurveValueAt(curveId, _player->GetLevel());

        float costMultiplier = 1.0f;
        if (TransmogOutfitEntryEntry const* transmogOutfitEntry = sTransmogOutfitEntryStore.LookupEntry(transmogOutfitUpdateSlots.OutfitID))
            if (transmogOutfitEntry->HasFlag(TransmogOutfitEntryFlags::UseOverrideCostModifier))
                costMultiplier *= transmogOutfitEntry->OverrideCostModifier;

        for (WorldPackets::Transmogrification::TransmogOutfitSlotData const& slot : transmogOutfitUpdateSlots.Slots)
        {
            TransmogMgr::TransmogOutfitSlotAndOptionInfo const* slotInfo = TransmogMgr::GetSlotAndOption(slot.Slot, slot.SlotOption);
            if (slotInfo->SlotIndex >= transmogOutfit.Slots.size())
                continue;

            UF::TransmogOutfitSlotData const& oldSlot = transmogOutfit.Slots[slotInfo->SlotIndex];
            if (slot.AppearanceDisplayType == TransmogOutfitDisplayType::Assigned && oldSlot.ItemModifiedAppearanceID != slot.ItemModifiedAppearanceID)
            {
                ItemModifiedAppearanceEntry const* itemModifiedAppearance = sItemModifiedAppearanceStore.LookupEntry(slot.ItemModifiedAppearanceID);
                if (!itemModifiedAppearance || !sTransmogHolidayStore.HasRecord(itemModifiedAppearance->ItemID))
                {
                    cost += static_cast<uint64>(std::floor(baseCost * slotInfo->Slot->ItemCostMultiplier));
                    if (slotInfo->SlotOption)
                        cost += static_cast<uint64>(std::floor(baseCost * slotInfo->SlotOption->ItemCostMultiplier));
                }
            }

            if (slot.IllusionDisplayType == TransmogOutfitDisplayType::Assigned && oldSlot.SpellItemEnchantmentID != slot.SpellItemEnchantmentID)
            {
                cost += static_cast<uint64>(std::floor(baseCost * slotInfo->Slot->IllusionCostMultiplier));
                if (slotInfo->SlotOption)
                    cost += static_cast<uint64>(std::floor(baseCost * slotInfo->SlotOption->IllusionCostMultiplier));
            }
        }

        cost = static_cast<uint64>(std::clamp(costMultiplier, 0.0f, 1.0f) * cost);

        if (cost != transmogOutfitUpdateSlots.Cost)
        {
            TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSlots - player sent cost {}, expected {}.",
                GetPlayerInfo(), transmogOutfitUpdateSlots.Cost, cost);
            return;
        }

        if (!_player->HasEnoughMoney(cost))
        {
            TC_LOG_ERROR("entities.player.cheat", "{} WorldSession::HandleTransmogOutfitUpdateSlots - not enough money.", GetPlayerInfo());
            return;
        }
    }
    else
    {
        _player->SetPlayerLocalFlag(PLAYER_LOCAL_FLAG_FREE_TRANSMOG_CLAIMED);
        _player->SetHasClaimedFreeTransmog();
    }

    _player->ModifyMoney(-int64(cost));

    _player->UpdateTransmogOutfitSlots(transmogOutfitUpdateSlots.OutfitID, transmogOutfitUpdateSlots.Slots);

    if (transmogOutfitUpdateSlots.OutfitID == _player->m_activePlayerData->TransmogMetadata->TransmogOutfitID)
        _player->EquipTransmogOutfit(transmogOutfitUpdateSlots.OutfitID, TransmogSituationTrigger::TransmogUpdate, {});

    // retail sends the outfit, viewed outfit and visible items in one UPDATE_OBJECT right before the reply (t1.pkt 7320/7321)
    Player::ValuesUpdateForPlayerWithMaskSender sendUpdateObject(_player);
    sendUpdateObject.ActivePlayerMask.MarkChanged(&UF::ActivePlayerData::TransmogOutfits);
    sendUpdateObject.ActivePlayerMask.MarkChanged(&UF::ActivePlayerData::ViewedOutfit);
    sendUpdateObject.ActivePlayerMask.MarkChanged(&UF::ActivePlayerData::TransmogMetadata);
    sendUpdateObject(_player);

    WorldPackets::Transmogrification::TransmogOutfitSlotsUpdated transmogOutfitSlotsUpdated;
    transmogOutfitSlotsUpdated.TransmogOutfitID = transmogOutfitUpdateSlots.OutfitID;
    transmogOutfitSlotsUpdated.Slots = transmogOutfitUpdateSlots.Slots;
    SendPacket(transmogOutfitSlotsUpdated.Write());

    for (uint32 itemModifedAppearanceId : bindAppearances)
    {
        std::unordered_set<ObjectGuid> itemsProvidingAppearance = GetCollectionMgr()->GetItemsProvidingTemporaryAppearance(itemModifedAppearanceId);
        for (ObjectGuid const& itemGuid : itemsProvidingAppearance)
        {
            if (Item* item = _player->GetItemByGuid(itemGuid))
            {
                item->SetNotRefundable(_player);
                item->ClearSoulboundTradeable(_player);
                GetCollectionMgr()->AddItemAppearance(item);
            }
        }
    }
}

void WorldSession::SendOpenTransmogrifier(ObjectGuid const& guid)
{
    WorldPackets::NPC::NPCInteractionOpenResult npcInteraction;
    npcInteraction.Npc = guid;
    npcInteraction.InteractionType = PlayerInteractionType::Transmogrifier;
    npcInteraction.Success = true;
    SendPacket(npcInteraction.Write());
}
