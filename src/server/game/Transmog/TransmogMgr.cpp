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

#include "TransmogMgr.h"
#include "DB2Stores.h"
#include "ItemTemplate.h"
#include "ObjectMgr.h"
#include "Player.h"
#include "TransmogrificationPackets.h"
#include <algorithm>

namespace
{
std::array<std::vector<TransmogOutfitEntryEntry const*>, AsUnderlyingType(TransmogOutfitEntrySource::Max)> TransmogOutfitsBySource;
std::vector<TransmogOutfitEntryEntry const*> TransmogOutfitsAutomaticallyCreated;
std::vector<TransmogMgr::TransmogOutfitSlotAndOptionInfo> AllSlots;
std::array<std::array<int32, AsUnderlyingType(TransmogOutfitSlotOption::Max)>, AsUnderlyingType(TransmogOutfitSlot::Max)> SlotIndexBySlotAndOption;
std::array<TransmogOutfitSlot, EQUIPMENT_SLOT_END> OutfitSlotByInvSlot;
std::vector<TransmogSituationEntry const*> DefaultSituations;

// Item.db2 SheatheType values (same numbering as retail ItemSheatheType)
enum class ItemSheatheType : uint8
{
    None, Shoulder, Inverted, Hip, Shield, Crossbow, ShoulderInvis, InvertedInvis, HipInvis, ShieldInvis, CrossbowInvis,
    InvertedDualWield, InvertedDualWieldInvis,

    Max
};

constexpr ItemSheatheType TransmogSheatheMappingByCategoryAndSheatheType[AsUnderlyingType(ItemSheatheType::Max)][AsUnderlyingType(TransmogOutfitSlotOptionSheatheCategory::Max)] =
{
    { ItemSheatheType::None,                   ItemSheatheType::None,              ItemSheatheType::None, ItemSheatheType::None                   },
    { ItemSheatheType::Shoulder,               ItemSheatheType::Shoulder,          ItemSheatheType::None, ItemSheatheType::ShoulderInvis          },
    { ItemSheatheType::Inverted,               ItemSheatheType::Inverted,          ItemSheatheType::None, ItemSheatheType::InvertedInvis          },
    { ItemSheatheType::Hip,                    ItemSheatheType::Shoulder,          ItemSheatheType::Hip,  ItemSheatheType::HipInvis               },
    { ItemSheatheType::Shield,                 ItemSheatheType::Shield,            ItemSheatheType::None, ItemSheatheType::ShieldInvis            },
    { ItemSheatheType::Crossbow,               ItemSheatheType::Crossbow,          ItemSheatheType::None, ItemSheatheType::CrossbowInvis          },
    { ItemSheatheType::ShoulderInvis,          ItemSheatheType::Shoulder,          ItemSheatheType::None, ItemSheatheType::ShoulderInvis          },
    { ItemSheatheType::InvertedInvis,          ItemSheatheType::Inverted,          ItemSheatheType::None, ItemSheatheType::InvertedInvis          },
    { ItemSheatheType::HipInvis,               ItemSheatheType::Shoulder,          ItemSheatheType::Hip,  ItemSheatheType::HipInvis               },
    { ItemSheatheType::ShieldInvis,            ItemSheatheType::Shield,            ItemSheatheType::None, ItemSheatheType::ShieldInvis            },
    { ItemSheatheType::CrossbowInvis,          ItemSheatheType::Crossbow,          ItemSheatheType::None, ItemSheatheType::CrossbowInvis          },
    { ItemSheatheType::InvertedDualWield,      ItemSheatheType::InvertedDualWield, ItemSheatheType::None, ItemSheatheType::InvertedDualWieldInvis },
    { ItemSheatheType::InvertedDualWieldInvis, ItemSheatheType::InvertedDualWield, ItemSheatheType::None, ItemSheatheType::InvertedDualWieldInvis }
};

bool IsValidTransmogOutfitSlotForItem(ItemTemplate const* item, TransmogOutfitSlot slot, TransmogOutfitSlotOption option)
{
    switch (item->GetInventoryType())
    {
        case INVTYPE_HEAD:
            return slot == TransmogOutfitSlot::Head;
        case INVTYPE_SHOULDERS:
            return slot == TransmogOutfitSlot::ShoulderLeft || slot == TransmogOutfitSlot::ShoulderRight;
        case INVTYPE_BODY:
            return slot == TransmogOutfitSlot::Body;
        case INVTYPE_CHEST:
        case INVTYPE_ROBE:
            return slot == TransmogOutfitSlot::Chest;
        case INVTYPE_WAIST:
            return slot == TransmogOutfitSlot::Waist;
        case INVTYPE_LEGS:
            return slot == TransmogOutfitSlot::Legs;
        case INVTYPE_FEET:
            return slot == TransmogOutfitSlot::Feet;
        case INVTYPE_WRISTS:
            return slot == TransmogOutfitSlot::Wrist;
        case INVTYPE_HANDS:
            return slot == TransmogOutfitSlot::Hand;
        case INVTYPE_WEAPON:
        case INVTYPE_WEAPONMAINHAND:
        case INVTYPE_WEAPONOFFHAND:
            return slot == TransmogOutfitSlot::WeaponMainHand || slot == TransmogOutfitSlot::WeaponOffHand;
        case INVTYPE_SHIELD:
        case INVTYPE_HOLDABLE:
            return slot == TransmogOutfitSlot::WeaponOffHand;
        case INVTYPE_RANGED:
            return slot == TransmogOutfitSlot::WeaponMainHand && option == TransmogOutfitSlotOption::RangedWeapon;
        case INVTYPE_CLOAK:
            return slot == TransmogOutfitSlot::Back;
        case INVTYPE_2HWEAPON:
            return slot == TransmogOutfitSlot::WeaponMainHand || (slot == TransmogOutfitSlot::WeaponOffHand && option == TransmogOutfitSlotOption::FuryTwoHandedWeapon);
        case INVTYPE_TABARD:
            return slot == TransmogOutfitSlot::Tabard;
        case INVTYPE_RANGEDRIGHT:
            // 5.5.4 has no ranged slot in TransmogOutfitSlotInfo.db2; guns, bows and wands live in the main hand
            return slot == TransmogOutfitSlot::WeaponMainHand || slot == TransmogOutfitSlot::WeaponRanged;
        default:
            break;
    }
    return false;
}
}

void TransmogMgr::Load()
{
    for (TransmogOutfitEntryEntry const* transmogOutfitEntry : sTransmogOutfitEntryStore)
    {
        if (transmogOutfitEntry->HasFlag(TransmogOutfitEntryFlags::AutomaticallyAwardedOnLogin))
            TransmogOutfitsAutomaticallyCreated.push_back(transmogOutfitEntry);

        if (transmogOutfitEntry->GetSetType() == TransmogOutfitSetType::Outfit && transmogOutfitEntry->GetSource() < TransmogOutfitEntrySource::Max)
            TransmogOutfitsBySource[AsUnderlyingType(transmogOutfitEntry->GetSource())].push_back(transmogOutfitEntry);
    }

    for (std::vector<TransmogOutfitEntryEntry const*>& transmogOutfitEntries : TransmogOutfitsBySource)
        std::ranges::sort(transmogOutfitEntries, {}, &TransmogOutfitEntryEntry::OrderIndex);

    for (std::array<int32, AsUnderlyingType(TransmogOutfitSlotOption::Max)>& options : SlotIndexBySlotAndOption)
        options.fill(-1);

    OutfitSlotByInvSlot.fill(TransmogOutfitSlot::Max);

    // the client keeps outfit slots in DB2 row order (slot rows, each followed by its options); see sniffs in docs/mop-port/re-notes.md
    for (TransmogOutfitSlotInfoEntry const* transmogOutfitSlot : sTransmogOutfitSlotInfoStore)
    {
        if (transmogOutfitSlot->GetSlot() < TransmogOutfitSlot::Head || transmogOutfitSlot->GetSlot() >= TransmogOutfitSlot::Max)
            continue;

        if (!transmogOutfitSlot->HasFlag(TransmogOutfitSlotFlags::IsSecondarySlot) && transmogOutfitSlot->InventorySlotEnum >= 0
            && transmogOutfitSlot->InventorySlotEnum < EQUIPMENT_SLOT_END)
            OutfitSlotByInvSlot[transmogOutfitSlot->InventorySlotEnum] = transmogOutfitSlot->GetSlot();

        std::array<int32, AsUnderlyingType(TransmogOutfitSlotOption::Max)>& slotIndexes = SlotIndexBySlotAndOption[AsUnderlyingType(transmogOutfitSlot->GetSlot())];
        bool hasOptions = false;
        for (TransmogOutfitSlotOptionEntry const* transmogOutfitSlotOption : sTransmogOutfitSlotOptionInfoStore)
        {
            if (transmogOutfitSlotOption->TransmogOutfitSlotInfoID != transmogOutfitSlot->ID || transmogOutfitSlotOption->GetOption() >= TransmogOutfitSlotOption::Max)
                continue;

            TransmogOutfitSlotAndOptionInfo& slot = AllSlots.emplace_back();
            slot.Slot = transmogOutfitSlot;
            slot.SlotOption = transmogOutfitSlotOption;
            slot.SlotIndex = AllSlots.size() - 1;
            slotIndexes[AsUnderlyingType(transmogOutfitSlotOption->GetOption())] = slot.SlotIndex;
            hasOptions = true;
        }

        if (!hasOptions)
        {
            TransmogOutfitSlotAndOptionInfo& slot = AllSlots.emplace_back();
            slot.Slot = transmogOutfitSlot;
            slot.SlotIndex = AllSlots.size() - 1;
            slotIndexes.fill(slot.SlotIndex);
        }
    }

    for (TransmogSituationEntry const* transmogSituation : sTransmogSituationStore)
        if (transmogSituation->HasFlag(TransmogSituationFlags::DefaultsToOn))
            DefaultSituations.push_back(transmogSituation);
}

std::span<TransmogOutfitEntryEntry const* const> TransmogMgr::GetAutomaticallyUnlockedOutfits()
{
    return TransmogOutfitsAutomaticallyCreated;
}

std::span<TransmogMgr::TransmogOutfitSlotAndOptionInfo const> TransmogMgr::GetAllSlots()
{
    return AllSlots;
}

TransmogMgr::TransmogOutfitSlotAndOptionInfo const* TransmogMgr::GetSlotAndOption(TransmogOutfitSlot slot, TransmogOutfitSlotOption slotOption)
{
    if (slot < TransmogOutfitSlot::Head || slot >= TransmogOutfitSlot::Max || slotOption >= TransmogOutfitSlotOption::Max)
        return nullptr;

    int32 slotIndex = SlotIndexBySlotAndOption[AsUnderlyingType(slot)][AsUnderlyingType(slotOption)];
    if (slotIndex >= 0)
        return &AllSlots[slotIndex];

    return nullptr;
}

TransmogMgr::TransmogOutfitSlotAndOptionInfo const* TransmogMgr::GetSlotAndOption(EquipmentSlots inventorySlot, TransmogOutfitSlotOption slotOption)
{
    if (inventorySlot >= EQUIPMENT_SLOT_END)
        return nullptr;

    return GetSlotAndOption(OutfitSlotByInvSlot[inventorySlot], slotOption);
}

std::span<TransmogSituationEntry const* const> TransmogMgr::GetDefaultSituations()
{
    return DefaultSituations;
}

TransmogOutfitEntryEntry const* TransmogMgr::GetNextOutfitToUnlock(TransmogOutfitEntrySource source, Player const* player)
{
    if (source >= TransmogOutfitEntrySource::Max || TransmogOutfitsBySource[AsUnderlyingType(source)].empty())
        return nullptr;

    TransmogOutfitEntryEntry const* lastOwnedOutfit = nullptr;
    for (auto const& [id, transmogOutfit] : *player->m_activePlayerData->TransmogOutfits)
    {
        TransmogOutfitEntryEntry const* transmogOutfitEntry = sTransmogOutfitEntryStore.LookupEntry(id);
        if (!transmogOutfitEntry || transmogOutfitEntry->GetSource() != source)
            continue;

        if (!lastOwnedOutfit || transmogOutfitEntry->OrderIndex > lastOwnedOutfit->OrderIndex)
            lastOwnedOutfit = transmogOutfitEntry;
    }

    std::vector<TransmogOutfitEntryEntry const*> const& outfits = TransmogOutfitsBySource[AsUnderlyingType(source)];
    if (!lastOwnedOutfit)
        return outfits.front();

    auto itr = std::ranges::find(outfits, lastOwnedOutfit);
    if (itr != outfits.end() && ++itr != outfits.end())
        return *itr;

    return nullptr;
}

bool TransmogMgr::ValidateSituations(std::span<WorldPackets::Transmogrification::TransmogOutfitSituationInfo const> situations)
{
    struct SituationTriggerStatus
    {
        uint8 AllSituationCount = 0;
        uint8 NoneSituationCount = 0;
        uint8 RegularSituationCount = 0;
    };

    std::array<SituationTriggerStatus, AsUnderlyingType(TransmogSituationTrigger::Max)> statusByTrigger;

    for (WorldPackets::Transmogrification::TransmogOutfitSituationInfo const& situation : situations)
    {
        TransmogSituationEntry const* transmogSituation = sTransmogSituationStore.LookupEntry(situation.SituationID);
        if (!transmogSituation)
            return false;

        TransmogSituationGroupEntry const* transmogSituationGroup = sTransmogSituationGroupStore.LookupEntry(transmogSituation->TransmogSituationGroupID);
        if (!transmogSituationGroup)
            return false;

        TransmogSituationTriggerEntry const* transmogSituationTrigger = sTransmogSituationTriggerStore.LookupEntry(transmogSituationGroup->TransmogSituationTriggerID);
        if (!transmogSituationTrigger || transmogSituationTrigger->GetTrigger() >= TransmogSituationTrigger::Max)
            return false;

        SituationTriggerStatus& triggers = statusByTrigger[AsUnderlyingType(transmogSituationTrigger->GetTrigger())];
        uint8* count = nullptr;
        if (transmogSituation->HasFlag(TransmogSituationFlags::AllSituation))
            count = &triggers.AllSituationCount;
        else if (transmogSituation->HasFlag(TransmogSituationFlags::NoneSituation))
            count = &triggers.NoneSituationCount;
        else
            count = &triggers.RegularSituationCount;

        *count += 1;
        if (transmogSituationTrigger->HasFlag(TransmogSituationTriggerFlags::SituationsAreExclusive) && *count > 1)
            return false;
    }

    for (SituationTriggerStatus const& triggers : statusByTrigger)
        if ((triggers.AllSituationCount > 0) + (triggers.NoneSituationCount > 0) + (triggers.RegularSituationCount > 0) > 1) // only 1 group can be active
            return false;

    return true;
}

bool TransmogMgr::ValidateSlots(std::span<WorldPackets::Transmogrification::TransmogOutfitSlotData const> slots)
{
    for (WorldPackets::Transmogrification::TransmogOutfitSlotData const& slot : slots)
    {
        if (slot.SheatheCategory >= TransmogOutfitSlotOptionSheatheCategory::Max)
            return false;

        if (slot.AppearanceDisplayType >= TransmogOutfitDisplayType::Max)
            return false;

        if (slot.IllusionDisplayType >= TransmogOutfitDisplayType::Max)
            return false;

        if (!GetSlotAndOption(slot.Slot, slot.SlotOption))
            return false;

        if (slot.ItemModifiedAppearanceID)
        {
            ItemModifiedAppearanceEntry const* itemModifiedAppearance = sItemModifiedAppearanceStore.LookupEntry(slot.ItemModifiedAppearanceID);
            if (!itemModifiedAppearance)
                return false;

            ItemTemplate const* itemTemplate = sObjectMgr->GetItemTemplate(itemModifiedAppearance->ItemID);
            if (!itemTemplate)
                return false;

            if (!IsValidTransmogOutfitSlotForItem(itemTemplate, slot.Slot, slot.SlotOption))
                return false;

            TransmogOutfitSlotOption appearanceSlotOption = itemTemplate->GetWeaponTransmogOutfitSlotOption();
            if (appearanceSlotOption != slot.SlotOption
                && (slot.SlotOption != TransmogOutfitSlotOption::FuryTwoHandedWeapon
                    || appearanceSlotOption != TransmogOutfitSlotOption::TwoHandedWeapon))
                return false;

            uint8 sheatheType = itemTemplate->BasicData->SheatheType;
            if (slot.SheatheCategory != TransmogOutfitSlotOptionSheatheCategory::Default &&
                (sheatheType >= AsUnderlyingType(ItemSheatheType::Max) ||
                    TransmogSheatheMappingByCategoryAndSheatheType[sheatheType][AsUnderlyingType(slot.SheatheCategory)] == ItemSheatheType::None))
                return false;
        }

        // TODO(verify): TransmogIllusion.db2 is empty in 5.5.4.70449, so no illusion can be valid yet
        if (slot.SpellItemEnchantmentID)
            return false;
    }

    return true;
}
