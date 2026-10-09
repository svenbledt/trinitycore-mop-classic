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
