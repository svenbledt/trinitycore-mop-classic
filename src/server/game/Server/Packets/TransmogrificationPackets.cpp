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

#include "TransmogrificationPackets.h"

ByteBuffer& operator>>(ByteBuffer& data, WorldPackets::Transmogrification::TransmogrifyItem& transmogItem)
{
    data >> transmogItem.ItemModifiedAppearanceID;
    data >> transmogItem.Slot;
    data >> transmogItem.SpellItemEnchantmentID;
    data >> transmogItem.SecondaryItemModifiedAppearanceID;

    return data;
}

void WorldPackets::Transmogrification::TransmogrifyItems::Read()
{
    Items.resize(_worldPacket.read<uint32>());
    _worldPacket >> Npc;
    for (TransmogrifyItem& item : Items)
        _worldPacket >> item;

    CurrentSpecOnly = _worldPacket.ReadBit();
}

WorldPacket const* WorldPackets::Transmogrification::AccountTransmogUpdate::Write()
{
    _worldPacket.WriteBit(IsFullUpdate);
    _worldPacket.WriteBit(IsSetFavorite);
    _worldPacket << uint32(FavoriteAppearances.size());
    _worldPacket << uint32(NewAppearances.size());
    if (!FavoriteAppearances.empty())
        _worldPacket.append(FavoriteAppearances.data(), FavoriteAppearances.size());

    if (!NewAppearances.empty())
        _worldPacket.append(NewAppearances.data(), NewAppearances.size());

    return &_worldPacket;
}

// 5.5.4 layout from the client reader (ctor 0x1405A42D0); retail sends IsFullUpdate+IsSetFavorite with no sets at login
WorldPacket const* WorldPackets::Transmogrification::AccountTransmogSetFavoritesUpdate::Write()
{
    _worldPacket.WriteBit(IsFullUpdate);
    _worldPacket.WriteBit(IsSetFavorite);
    _worldPacket << uint32(TransmogSetIDs.size());
    if (!TransmogSetIDs.empty())
        _worldPacket.append(TransmogSetIDs.data(), TransmogSetIDs.size());

    return &_worldPacket;
}

namespace WorldPackets::Transmogrification
{
ByteBuffer& operator>>(ByteBuffer& data, TransmogOutfitDataInfo& transmogOutfitDataInfo)
{
    data.ResetBitPos();
    transmogOutfitDataInfo.SetType = static_cast<TransmogOutfitSetType>(data.read<uint8>());
    data >> transmogOutfitDataInfo.Icon;
    uint32 nameLength = data.ReadBits(8);
    transmogOutfitDataInfo.SituationsEnabled = data.ReadBit();
    transmogOutfitDataInfo.Name = data.ReadString(nameLength);

    return data;
}

ByteBuffer& operator<<(ByteBuffer& data, TransmogOutfitDataInfo const& transmogOutfitDataInfo)
{
    data << uint8(transmogOutfitDataInfo.SetType);
    data << uint32(transmogOutfitDataInfo.Icon);
    data.WriteBits(transmogOutfitDataInfo.Name.length(), 8);
    data.WriteBit(transmogOutfitDataInfo.SituationsEnabled);
    data.FlushBits();
    data.WriteString(transmogOutfitDataInfo.Name);

    return data;
}

void TransmogOutfitNew::Read()
{
    // 5.5.4 client writer (0x140653BB0) sends Source before the outfit info; retail 12.x sends it last
    _worldPacket >> Npc;
    Source = static_cast<TransmogOutfitEntrySource>(_worldPacket.read<uint8>());
    _worldPacket >> Info;
}

WorldPacket const* TransmogOutfitNewEntryAdded::Write()
{
    _worldPacket << uint32(TransmogOutfitID);

    return &_worldPacket;
}

void TransmogOutfitUpdateInfo::Read()
{
    _worldPacket >> OutfitID;
    _worldPacket >> Npc;
    _worldPacket >> Info;
}

WorldPacket const* TransmogOutfitInfoUpdated::Write()
{
    _worldPacket << uint32(TransmogOutfitID);
    _worldPacket << *OutfitInfo;

    return &_worldPacket;
}

ByteBuffer& operator>>(ByteBuffer& data, TransmogOutfitSituationInfo& transmogOutfitSituationInfo)
{
    data >> transmogOutfitSituationInfo.SituationID;
    data >> transmogOutfitSituationInfo.SpecID;
    data >> transmogOutfitSituationInfo.LoadoutID;
    data >> transmogOutfitSituationInfo.EquipmentSetID;

    return data;
}

ByteBuffer& operator<<(ByteBuffer& data, TransmogOutfitSituationInfo const& transmogOutfitSituationInfo)
{
    data << uint32(transmogOutfitSituationInfo.SituationID);
    data << uint32(transmogOutfitSituationInfo.SpecID);
    data << uint32(transmogOutfitSituationInfo.LoadoutID);
    data << uint32(transmogOutfitSituationInfo.EquipmentSetID);

    return data;
}

void TransmogOutfitUpdateSituations::Read()
{
    _worldPacket >> OutfitID;
    _worldPacket >> Npc;
    Situations.resize(_worldPacket.read<uint32>());
    for (TransmogOutfitSituationInfo& situation : Situations)
        _worldPacket >> situation;

    _worldPacket.ResetBitPos();
    SituationsEnabled = _worldPacket.ReadBit();
}

WorldPacket const* TransmogOutfitSituationsUpdated::Write()
{
    _worldPacket << uint32(TransmogOutfitID);
    _worldPacket << uint32(Situations.size());
    for (TransmogOutfitSituationInfo const& situation : Situations)
        _worldPacket << situation;

    _worldPacket.WriteBit(SituationsEnabled);
    _worldPacket.FlushBits();

    return &_worldPacket;
}

ByteBuffer& operator>>(ByteBuffer& data, TransmogOutfitSlotData& transmogOutfitSlotData)
{
    transmogOutfitSlotData.Slot = static_cast<TransmogOutfitSlot>(data.read<int8>());
    transmogOutfitSlotData.SlotOption = static_cast<TransmogOutfitSlotOption>(data.read<uint8>());
    transmogOutfitSlotData.SheatheCategory = static_cast<TransmogOutfitSlotOptionSheatheCategory>(data.read<uint8>());
    data >> transmogOutfitSlotData.ItemModifiedAppearanceID;
    transmogOutfitSlotData.AppearanceDisplayType = static_cast<TransmogOutfitDisplayType>(data.read<uint8>());
    data >> transmogOutfitSlotData.SpellItemEnchantmentID;
    transmogOutfitSlotData.IllusionDisplayType = static_cast<TransmogOutfitDisplayType>(data.read<uint8>());
    data >> transmogOutfitSlotData.Flags;

    return data;
}

ByteBuffer& operator<<(ByteBuffer& data, TransmogOutfitSlotData const& transmogOutfitSlotData)
{
    data << int8(transmogOutfitSlotData.Slot);
    data << uint8(transmogOutfitSlotData.SlotOption);
    data << uint8(transmogOutfitSlotData.SheatheCategory);
    data << uint32(transmogOutfitSlotData.ItemModifiedAppearanceID);
    data << uint8(transmogOutfitSlotData.AppearanceDisplayType);
    data << uint32(transmogOutfitSlotData.SpellItemEnchantmentID);
    data << uint8(transmogOutfitSlotData.IllusionDisplayType);
    data << uint32(transmogOutfitSlotData.Flags);

    return data;
}

void TransmogOutfitUpdateSlots::Read()
{
    _worldPacket >> OutfitID;
    Slots.resize(_worldPacket.read<uint32>());
    _worldPacket >> Npc;
    _worldPacket >> Cost;
    for (TransmogOutfitSlotData& slot : Slots)
        _worldPacket >> slot;

    _worldPacket.ResetBitPos();
    UseAvailableDiscount = _worldPacket.ReadBit();
}

WorldPacket const* TransmogOutfitSlotsUpdated::Write()
{
    _worldPacket << uint32(TransmogOutfitID);
    _worldPacket << uint32(Slots.size());
    for (TransmogOutfitSlotData const& slot : Slots)
        _worldPacket << slot;

    return &_worldPacket;
}
}
