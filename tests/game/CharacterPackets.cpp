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

#include "tc_catch2.h"

#include "CharacterPackets.h"
#include "WorldPacket.h"

// Defined in CharacterPackets.cpp (internal serializer); declared here to test the record layout.
namespace WorldPackets::Character
{
    ByteBuffer& operator<<(ByteBuffer& data, EnumCharactersResult::CharacterInfoBasic const& charInfo);
}

// The 5.5.4.70032 client reads the SMSG_CREATE_CHAR/DELETE_CHAR result code as a uint32
// (4-byte read, verified in the client dump), not the uint8 of earlier builds.
TEST_CASE("SMSG_CREATE_CHAR writes a uint32 result code then the packed GUID", "[Packets]")
{
    WorldPackets::Character::CreateChar packet;
    packet.Code = 57;
    packet.Guid = ObjectGuid::Create<HighGuid::Player>(0x1234);
    WorldPacket copy(*packet.Write());

    uint32 code = 0;
    copy >> code;
    REQUIRE(code == 57);
    ObjectGuid guid;
    copy >> guid;
    REQUIRE(guid == packet.Guid);
    REQUIRE(copy.rpos() == copy.size());
}

TEST_CASE("SMSG_DELETE_CHAR writes a uint32 result code", "[Packets]")
{
    WorldPackets::Character::DeleteChar packet;
    packet.Code = 70;
    WorldPacket copy(*packet.Write());

    uint32 code = 0;
    copy >> code;
    REQUIRE(code == 70);
    REQUIRE(copy.rpos() == copy.size());
}

// Decodes a serialized CharacterInfoBasic following the 5.5.4 client reader sub_1405A1160
// (WPP V5_5_0_61735 ReadBasicCharacterListEntry lacks the 5.5.4 additions).
TEST_CASE("Enum character record matches the 5.5.4 per-character layout", "[Packets]")
{
    using WorldPackets::Character::EnumCharactersResult;
    EnumCharactersResult::CharacterInfoBasic basic;
    basic.Guid = ObjectGuid::Create<HighGuid::Player>(0xABCD);
    basic.VirtualRealmAddress = 0x11223344;
    basic.ListPosition = 0x42;
    basic.RaceID = 1;
    basic.SexID = 0;
    basic.ClassID = 1;
    basic.SpecID = 0x0102;
    basic.ExperienceLevel = 1;
    basic.MapID = 0;
    basic.ZoneID = 12;
    basic.PreloadPos = TaggedPosition<Position::XYZ>(1.0f, 2.0f, 3.0f);
    basic.Flags = 0xA;
    basic.Flags2 = 0xB;
    basic.Flags3 = 0xC;
    basic.Flags4 = 0xD;
    basic.unkWod61x = 7;
    basic.Name = "Testchar";
    basic.FirstLogin = true;

    ByteBuffer buf;
    buf << basic;

    ObjectGuid guid;
    buf >> guid;
    REQUIRE(guid == basic.Guid);
    REQUIRE(buf.read<uint32>() == 0x11223344);
    REQUIRE(buf.read<uint16>() == 0x42); // ListPosition is a uint16 in 5.5.4
    REQUIRE(buf.read<uint8>() == 1);     // RaceID
    REQUIRE(buf.read<uint8>() == 0);     // SexID
    REQUIRE(buf.read<uint8>() == 1);     // ClassID
    REQUIRE(buf.read<int16>() == 0x0102);
    REQUIRE(buf.read<uint32>() == 0);    // customization count
    REQUIRE(buf.read<uint8>() == 1);     // ExperienceLevel
    REQUIRE(buf.read<int32>() == 0);     // MapID
    REQUIRE(buf.read<int32>() == 12);    // ZoneID
    REQUIRE(buf.read<float>() == 1.0f);
    REQUIRE(buf.read<float>() == 2.0f);
    REQUIRE(buf.read<float>() == 3.0f);
    REQUIRE(buf.read<uint64>() == 0);    // GuildClubMemberID
    ObjectGuid guildGuid;
    buf >> guildGuid;
    REQUIRE(guildGuid.IsEmpty());
    REQUIRE(buf.read<uint32>() == 0xA);  // Flags
    REQUIRE(buf.read<uint32>() == 0xB);  // Flags2
    REQUIRE(buf.read<uint32>() == 0xC);  // Flags3
    REQUIRE(buf.read<uint32>() == 0xD);  // Flags4
    REQUIRE(buf.read<uint8>() == 7);     // CantLoginReason (unkWod61x)
    REQUIRE(buf.read<uint32>() == 0);    // PetCreatureDisplayID
    REQUIRE(buf.read<uint32>() == 0);    // PetExperienceLevel
    REQUIRE(buf.read<uint32>() == 0);    // PetCreatureFamilyID

    for (int i = 0; i < 19; ++i)         // VisualItems
    {
        buf.read<uint32>(); buf.read<uint32>(); buf.read<uint8>(); buf.read<uint8>();
        buf.read<int32>(); buf.read<int32>(); buf.read<int32>(); buf.read<uint8>();
    }

    REQUIRE(buf.read<int32>() == 0);     // SaveVersion (Unknown703)
    buf.read<int64>();                   // LastPlayedTime
    REQUIRE(buf.read<uint64>() == 0);    // 5.5.4 second u64
    REQUIRE(buf.read<int32>() == 0);     // LastLoginVersion
    for (int i = 0; i < 5; ++i)
        REQUIRE(buf.read<int32>() == -1); // PersonalTabard defaults
    REQUIRE(buf.read<int32>() == 0);     // ProfessionIds[0]
    REQUIRE(buf.read<int32>() == 0);     // ProfessionIds[1]
    REQUIRE(buf.read<int32>() == 0);     // TimerunningSeasonID
    REQUIRE(buf.read<uint32>() == 0);    // OverrideSelectScreenFileDataID
    REQUIRE(buf.read<uint32>() == 0);    // Unused1110_1

    buf.ResetBitPos();
    REQUIRE(buf.ReadBits(6) == 8);       // name length
    REQUIRE(buf.ReadBit() == true);      // FirstLogin
    buf.ReadBit();                       // Unused1110_2
    buf.ReadBit();                       // Unused1110_3
    REQUIRE(buf.ReadString(8) == "Testchar");
    REQUIRE(buf.rpos() == buf.size());
}

// Client 5.5.4 reader sub_1405A2280: u8 RaceID, u32 class-unlock count, then 5 bits; a misread locks every race
TEST_CASE("SMSG_ENUM_CHARACTERS_RESULT writes the 5.5.4 RaceUnlockData entry", "[Packets]")
{
    WorldPackets::Character::EnumCharactersResult packet;
    WorldPacket empty(*packet.Write());

    WorldPackets::Character::EnumCharactersResult withRace;
    WorldPackets::Character::EnumCharactersResult::RaceUnlock& raceUnlock = withRace.RaceUnlockData.emplace_back();
    raceUnlock.RaceID = 1;
    raceUnlock.HasExpansion = true;
    WorldPacket copy(*withRace.Write());

    REQUIRE(copy.size() == empty.size() + 6);
    REQUIRE(copy[copy.size() - 6] == 1);
    for (size_t i = 5; i > 1; --i)
        REQUIRE(copy[copy.size() - i] == 0);
    REQUIRE(copy[copy.size() - 1] == 0x80);
}
