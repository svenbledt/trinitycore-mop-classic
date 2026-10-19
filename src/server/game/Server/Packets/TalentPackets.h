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

#ifndef TalentPackets_h__
#define TalentPackets_h__

#include "Packet.h"
#include "DBCEnums.h"
#include "ObjectGuid.h"
#include "PacketUtilities.h"

namespace WorldPackets
{
    namespace Talent
    {
        struct TalentInfo
        {
            uint32 TalentID = 0;
            uint32 Rank = 0;
        };

        struct PvPTalent
        {
            uint16 PvPTalentID = 0;
            uint8 Slot = 0;
        };

        struct TalentGroupInfo
        {
            uint8 SpecID = 0;
            uint32 PrimarySpecialization = 0;
            std::vector<TalentInfo> Talents;
            std::vector<PvPTalent> PvPTalents; // TODO(verify): 5.5.4 {u16, u8} list per group; WPP names it PvP talents
            std::vector<uint16> Glyphs;
        };

        struct TalentInfoUpdate
        {
            uint32 UnspentTalentPoints = 0;
            uint8 ActiveGroup = 0;
            bool IsPetTalents = false;

            std::vector<TalentGroupInfo> TalentGroups;
        };

        class UpdateTalentData final : public ServerPacket
        {
        public:
            UpdateTalentData() : ServerPacket(SMSG_UPDATE_TALENT_DATA, 2+4+4+4+12) { }

            WorldPacket const* Write() override;

            TalentInfoUpdate Info;
            int32 PrimarySpecialization = 0; // TODO(verify): WPP 5.5.0 name for the u32 after ActiveGroup
        };

        class LearnTalent final : public ClientPacket
        {
        public:
            LearnTalent(WorldPacket&& packet) : ClientPacket(CMSG_LEARN_TALENT, std::move(packet)) { }

            void Read() override;

            uint32 TalentID = 0;
            uint16 Rank = 0;
        };

        class LearnPreviewTalents final : public ClientPacket
        {
        public:
            LearnPreviewTalents(WorldPacket&& packet) : ClientPacket(CMSG_LEARN_PREVIEW_TALENTS, std::move(packet)) { }

            void Read() override;

            int32 TabIndex = 0;
            Array<TalentInfo, 100> Talents;
        };

        class SetPrimaryTalentTree final : public ClientPacket
        {
        public:
            SetPrimaryTalentTree(WorldPacket&& packet) : ClientPacket(CMSG_SET_PRIMARY_TALENT_TREE, std::move(packet)) { }

            void Read() override;

            int32 TabIndex = 0;
        };

        class LearnTalents final : public ClientPacket
        {
        public:
            LearnTalents(WorldPacket&& packet) : ClientPacket(CMSG_LEARN_TALENTS, std::move(packet)) { }

            void Read() override;

            Array<uint16, 64> Talents; // client writer 0x14065EC60: Bits<6> count, then u16 Talent IDs
        };

        class RemoveGlyph final : public ClientPacket
        {
        public:
            RemoveGlyph(WorldPacket&& packet) : ClientPacket(CMSG_REMOVE_GLYPH, std::move(packet)) { }

            void Read() override;

            uint8 GlyphSlot = 0; // 0-based socket index (Lua RemoveGlyphFromSocket 0x141C7FCC0, < 6)
        };

        class SetLootSpecialization final : public ClientPacket
        {
        public:
            SetLootSpecialization(WorldPacket&& packet) : ClientPacket(CMSG_SET_LOOT_SPECIALIZATION, std::move(packet)) { }

            void Read() override;

            int32 SpecID = 0; // ChrSpecialization ID, 0 = current spec (writer 0x140584D10, u32)
        };

        class SetSpecialization final : public ClientPacket
        {
        public:
            SetSpecialization(WorldPacket&& packet) : ClientPacket(CMSG_SET_SPECIALIZATION, std::move(packet)) { }

            void Read() override;

            int32 SpecID = 0; // ChrSpecialization ID, not the spec index (retail sniff: 269 for Windwalker)
        };

        class RespecWipeConfirm final : public ServerPacket
        {
        public:
            RespecWipeConfirm() : ServerPacket(SMSG_RESPEC_WIPE_CONFIRM, 16 + 4 +1) { }

            WorldPacket const* Write() override;

            ObjectGuid RespecMaster;
            uint32 Cost = 0;
            int8 RespecType = 0;
        };

        class ConfirmRespecWipe final : public ClientPacket
        {
        public:
            ConfirmRespecWipe(WorldPacket&& packet) : ClientPacket(CMSG_CONFIRM_RESPEC_WIPE, std::move(packet)) { }

            void Read() override;

            ObjectGuid RespecMaster;
            uint8 RespecType = 0;
        };

        class TalentsInvoluntarilyReset final : public ServerPacket
        {
        public:
            explicit TalentsInvoluntarilyReset(bool isPetTalents) : ServerPacket(SMSG_TALENTS_INVOLUNTARILY_RESET, 1), IsPetTalents(isPetTalents) { }

            WorldPacket const* Write() override;

            bool IsPetTalents = false;
        };

        class LearnTalentFailed final : public ServerPacket
        {
        public:
            LearnTalentFailed() : ServerPacket(SMSG_LEARN_TALENT_FAILED, 1 + 4 + 4 + 2 * MAX_TALENT_TIERS) { }

            WorldPacket const* Write() override;

            uint32 Reason = 0;
            int32 SpellID = 0;
            std::vector<uint16> Talents;
        };

        struct GlyphBinding
        {
            GlyphBinding(uint32 spellId = 0, uint16 glyphId = 0) : SpellID(spellId), GlyphID(glyphId) { }

            uint32 SpellID;
            uint16 GlyphID;
        };

        class ActiveGlyphs final : public ServerPacket
        {
        public:
            ActiveGlyphs() : ServerPacket(SMSG_ACTIVE_GLYPHS) { }

            WorldPacket const* Write() override;

            std::vector<GlyphBinding> Glyphs;
            bool IsFullUpdate = false;
        };

        ByteBuffer& operator<<(ByteBuffer& data, WorldPackets::Talent::TalentInfoUpdate const& talentInfoUpdate);
        ByteBuffer& operator<<(ByteBuffer& data, WorldPackets::Talent::TalentGroupInfo const& talentGroupInfo);
        ByteBuffer& operator<<(ByteBuffer& data, WorldPackets::Talent::TalentInfo const& talentInfo);
    }
}

#endif // TalentPackets_h__
