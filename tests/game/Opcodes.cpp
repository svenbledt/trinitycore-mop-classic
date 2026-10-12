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

#include "Opcodes.h"
#include <set>

TEST_CASE("Opcode array indices are unique and in range", "[Opcodes]")
{
    std::set<std::ptrdiff_t> client, server;
    for (uint32 g = 0; g < 0x100; ++g)
    {
        for (uint32 i = 0; i < 0x1000; ++i)
        {
            // Out-of-range ids in a known group wrap to a large positive value; OpcodeTable treats >= NUM as invalid too
            std::ptrdiff_t c = GetOpcodeArrayIndex(OpcodeClient(g << 16 | i));
            if (c >= 0 && c < std::ptrdiff_t(NUM_CMSG_OPCODES))
                REQUIRE(client.insert(c).second);
            std::ptrdiff_t s = GetOpcodeArrayIndex(OpcodeServer(g << 16 | i));
            if (s >= 0 && s < std::ptrdiff_t(NUM_SMSG_OPCODES))
                REQUIRE(server.insert(s).second);
        }
    }
    REQUIRE(client.size() == NUM_CMSG_OPCODES);
    REQUIRE(server.size() == NUM_SMSG_OPCODES);
}

TEST_CASE("Opcodes absent in the client build are never valid", "[Opcodes]")
{
    REQUIRE(CMSG_QUERY_VOID_STORAGE == UNKNOWN_OPCODE);
    REQUIRE(GetOpcodeArrayIndex(CMSG_QUERY_VOID_STORAGE) == -1);
}

TEST_CASE("Login path opcodes match client build 5.5.4.70032", "[Opcodes]")
{
    // Values verified against the client (dispatch + handlers), see docs/mop-port/re-notes.md
    REQUIRE(CMSG_AUTH_SESSION == 0x450001);
    REQUIRE(CMSG_ENUM_CHARACTERS == 0x440014);
    REQUIRE(SMSG_AUTH_CHALLENGE == 0x4D0000);
    REQUIRE(SMSG_AUTH_RESPONSE == 0x460001);
    REQUIRE(SMSG_ENUM_CHARACTERS_RESULT == 0x460018);
    REQUIRE(SMSG_ENTER_ENCRYPTED_MODE == 0x4D0004);
    REQUIRE(SMSG_SOCIAL_CONTRACT_REQUEST_RESPONSE == 0x460331);
    for (OpcodeClient op : { CMSG_AUTH_SESSION, CMSG_ENUM_CHARACTERS, CMSG_PING })
        REQUIRE(GetOpcodeArrayIndex(op) >= 0);
    for (OpcodeServer op : { SMSG_AUTH_CHALLENGE, SMSG_AUTH_RESPONSE, SMSG_ENUM_CHARACTERS_RESULT })
        REQUIRE(GetOpcodeArrayIndex(op) >= 0);
}

TEST_CASE("Login-flow SMSGs match client build 5.5.4.70032", "[Opcodes]")
{
    // Each value tied to its client ctor/handler layout, see docs/mop-port/opcode-harvest.md
    REQUIRE(SMSG_UPDATE_GAME_TIME_STATE == 0x4602DB);
    REQUIRE(SMSG_TUTORIAL_FLAGS == 0x460272);
    REQUIRE(SMSG_BATTLE_NET_CONNECTION_STATUS == 0x4602BB);
    REQUIRE(SMSG_UNDELETE_COOLDOWN_STATUS_RESPONSE == 0x460280);
    REQUIRE(SMSG_NPC_INTERACTION_OPEN_RESULT == 0x460326);
    REQUIRE(SMSG_SET_TIME_ZONE_INFORMATION == 0x460124);
    REQUIRE(SMSG_ACCOUNT_DATA_TIMES == 0x4601B9);
    REQUIRE(SMSG_HOTFIX_CONNECT == 0x4A0003);
    REQUIRE(SMSG_CACHE_VERSION == 0x4A000E);
    REQUIRE(SMSG_SUSPEND_COMMS == 0x4D0005);
    REQUIRE(SMSG_PONG == 0x4D0009);
    REQUIRE(SMSG_MULTIPLE_PACKETS == 0x4D000D);
    REQUIRE(SMSG_NEW_WORLD == 0x46002D);
    for (OpcodeServer op : { SMSG_UPDATE_GAME_TIME_STATE, SMSG_TUTORIAL_FLAGS, SMSG_PONG, SMSG_MULTIPLE_PACKETS })
        REQUIRE(GetOpcodeArrayIndex(op) >= 0);
}

TEST_CASE("Character create/delete opcodes match client build 5.5.4.70032", "[Opcodes]")
{
    // Harvested from the client dump (packet-class getters + (de)serializers), see docs/mop-port/re-notes.md.
    REQUIRE(CMSG_CREATE_CHARACTER == 0x440070);
    REQUIRE(CMSG_CHAR_DELETE == 0x4400CD);
    REQUIRE(SMSG_CREATE_CHAR == 0x4601AF);
    REQUIRE(SMSG_DELETE_CHAR == 0x4601B0);
    // 0x4400CC is the no-arg SERVER_TIME_OFFSET_REQUEST (sent at the char screen), not char-delete.
    REQUIRE(CMSG_SERVER_TIME_OFFSET_REQUEST == 0x4400CC);
    for (OpcodeClient op : { CMSG_CREATE_CHARACTER, CMSG_CHAR_DELETE })
        REQUIRE(GetOpcodeArrayIndex(op) >= 0);
    for (OpcodeServer op : { SMSG_CREATE_CHAR, SMSG_DELETE_CHAR })
        REQUIRE(GetOpcodeArrayIndex(op) >= 0);
}
