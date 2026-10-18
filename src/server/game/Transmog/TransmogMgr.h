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

#ifndef TRINITYCORE_TRANSMOG_MGR_H
#define TRINITYCORE_TRANSMOG_MGR_H

#include "Common.h"
#include <span>

class Player;
struct TransmogOutfitEntryEntry;
struct TransmogOutfitSlotInfoEntry;
struct TransmogOutfitSlotOptionEntry;
struct TransmogSituationEntry;
enum EquipmentSlots : uint8;
enum class TransmogOutfitEntrySource : uint8;
enum class TransmogOutfitSlot : int8;
enum class TransmogOutfitSlotOption : uint8;

namespace WorldPackets::Transmogrification
{
struct TransmogOutfitSituationInfo;
struct TransmogOutfitSlotData;
}

// Transmog outfits (5.5.4 runs transmog through outfits); ported from TrinityCore master, outfit parts only
namespace TransmogMgr
{
struct TransmogOutfitSlotAndOptionInfo
{
    TransmogOutfitSlotInfoEntry const* Slot = nullptr;
    TransmogOutfitSlotOptionEntry const* SlotOption = nullptr;
    uint32 SlotIndex = 0;
};

inline constexpr std::array<std::string_view, TOTAL_LOCALES> DefaultOutfitName =
{
    "Outfit"sv,
    "\354\235\230\354\203\201"sv,
    "Tenue"sv,
    "Outfit"sv,
    "\345\244\226\350\247\202\346\226\271\346\241\210"sv,
    "\346\234\215\350\243\235"sv,
    "Atuendo"sv,
    "Indumentaria"sv,
    "\320\241\320\275\320\260\321\200\321\217\320\266\320\265\320\275\320\270\320\265"sv,
    ""sv,
    "Roupa"sv,
    "Completo"sv
};

inline constexpr uint32 DefaultOutfitIcon = 134400;

TC_GAME_API void Load();

TC_GAME_API std::span<TransmogOutfitEntryEntry const* const> GetAutomaticallyUnlockedOutfits();
TC_GAME_API std::span<TransmogOutfitSlotAndOptionInfo const> GetAllSlots();
TC_GAME_API TransmogOutfitSlotAndOptionInfo const* GetSlotAndOption(TransmogOutfitSlot slot, TransmogOutfitSlotOption slotOption);
TC_GAME_API TransmogOutfitSlotAndOptionInfo const* GetSlotAndOption(EquipmentSlots inventorySlot, TransmogOutfitSlotOption slotOption);
TC_GAME_API std::span<TransmogSituationEntry const* const> GetDefaultSituations();
TC_GAME_API TransmogOutfitEntryEntry const* GetNextOutfitToUnlock(TransmogOutfitEntrySource source, Player const* player);
TC_GAME_API bool ValidateSituations(std::span<WorldPackets::Transmogrification::TransmogOutfitSituationInfo const> situations);
TC_GAME_API bool ValidateSlots(std::span<WorldPackets::Transmogrification::TransmogOutfitSlotData const> slots);
}

#endif // TRINITYCORE_TRANSMOG_MGR_H
