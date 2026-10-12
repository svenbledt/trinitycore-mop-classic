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

#include "AuthenticationPackets.h"
#include "ClientConfigPackets.h"
#include "WorldPacket.h"

// Client 5.5.4.70032 ctor sub_1405BE7D0 reads packed GUID, u64 server time, then 20 u64 slots
TEST_CASE("SMSG_ACCOUNT_DATA_TIMES writes 20 account data slots", "[Packets]")
{
    WorldPackets::ClientConfig::AccountDataTimes packet;
    packet.ServerTime = 1;
    packet.AccountTimes[16] = 7;
    WorldPacket copy(*packet.Write());

    REQUIRE(copy.GetOpcode() == 0x4601B9);
    REQUIRE(copy.size() == 2 + 8 + 20 * 8); // empty packed GUID is two mask bytes
    copy.rpos(2 + 8 + 16 * 8);
    int64 slot16 = 0;
    copy >> slot16;
    REQUIRE(slot16 == 7);
}

// Client 5.5.4.70032 ctor sub_1405CFC30 reads u32 BillingPlan, u32 TimeRemain, u32, then one byte of 3 bits
TEST_CASE("SMSG_UPDATE_GAME_TIME_STATE writes the GameTimeInfo block", "[Packets]")
{
    WorldPackets::Auth::UpdateGameTimeState packet;
    packet.GameTimeInfo.BillingPlan = 1;
    packet.GameTimeInfo.TimeRemain = 7;
    packet.GameTimeInfo.InGameRoom = true;
    WorldPacket copy(*packet.Write());

    REQUIRE(copy.GetOpcode() == 0x4602DB);
    REQUIRE(copy.size() == 13);

    uint32 billingPlan = 0, timeRemain = 0, unknown = 0;
    uint8 bits = 0;
    copy >> billingPlan >> timeRemain >> unknown >> bits;
    REQUIRE(billingPlan == 1);
    REQUIRE(timeRemain == 7);
    REQUIRE(unknown == 0);
    REQUIRE(bits == 0xE0);
}

// Client 5.5.4 reader (case 0x4D0008 in sub_140616FF0): payload list, no RSA signature; a misread crashed the client
TEST_CASE("SMSG_CONNECT_TO writes the 5.5.4 payload-list layout", "[Packets]")
{
    WorldPackets::Auth::ConnectTo packet;
    packet.Key = 0x1122334455667788;
    packet.NativeRealmAddress = 0x01000001;
    packet.Serial = WorldPackets::Auth::ConnectToSerial::WorldAttempt1;
    packet.Con = 1;
    WorldPackets::Auth::ConnectTo::ConnectPayload& payload = packet.Payload.emplace_back();
    payload.Where.Type = WorldPackets::Auth::ConnectTo::IPv4;
    payload.Where.Address.V4 = { 127, 0, 0, 1 };
    payload.Port = 8085;
    WorldPacket copy(*packet.Write());

    REQUIRE(copy.read<uint32>() == 1);
    REQUIRE(copy.read<uint32>() == 17);
    REQUIRE(copy.read<uint8>() == 1);
    REQUIRE(copy.read<uint64>() == 0x1122334455667788);
    REQUIRE(copy.read<uint32>() == 0x01000001);
    REQUIRE(copy.read<uint32>() == 0);
    REQUIRE(copy.read<uint8>() == 1);
    REQUIRE(copy.read<uint8>() == 127);
    copy.read_skip(3);
    REQUIRE(copy.read<uint16>() == 8085);
    copy.read_skip(5);                  // 5 + 24 + 6 bits of empty bleep-token lengths
    REQUIRE(copy.read<uint64>() == 0);  // TokenLifespan
    REQUIRE(copy.rpos() == copy.size());
}
