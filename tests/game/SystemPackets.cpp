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

#include "SystemPackets.h"
#include "WorldPacket.h"

// Client 5.5.4.70032 reader sub_1405A8450: 31 bits, 11-bit alert length, then 6 bits (48 bits = 6 bytes).
// Bit 43 lands in packet+365, which IsWowTokenLimitedModeEnabled() returns (handler sub_1417F3CF0).
TEST_CASE("SMSG_FEATURE_SYSTEM_STATUS_GLUE_SCREEN places WowTokenLimitedMode at bit 43", "[Packets]")
{
    WorldPackets::System::FeatureSystemStatusGlueScreen packet;
    WorldPacket copy(*packet.Write());

    REQUIRE(copy.GetOpcode() == 0x460064);
    REQUIRE(copy.size() == 6 + 92 + 1); // bits, fixed fields, empty RealmHiddenAlert NUL
    REQUIRE((copy[5] & 0x10) == 0);

    WorldPackets::System::FeatureSystemStatusGlueScreen limited;
    limited.WowTokenLimitedMode = true;
    WorldPacket limitedCopy(*limited.Write());
    REQUIRE((limitedCopy[5] & 0x10) == 0x10);
}
