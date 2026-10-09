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

#include "ObjectMgr.h"
#include "SharedDefines.h"

// Review-focus guard: an invalid create name must be rejected without a crash. Only the
// too-long/invalid-character paths avoid sWorld/DB2, so the success path is covered by e2e.
TEST_CASE("CheckPlayerName rejects invalid character names", "[Character]")
{
    REQUIRE(ObjectMgr::CheckPlayerName("Thisnameistoolong", DEFAULT_LOCALE, false) == CHAR_NAME_TOO_LONG);
    REQUIRE(ObjectMgr::CheckPlayerName(std::string_view("\xFF\xFE", 2), DEFAULT_LOCALE, false) == CHAR_NAME_INVALID_CHARACTER);
    REQUIRE(ObjectMgr::CheckPlayerName("Thisnameistoolong", DEFAULT_LOCALE, false) != CHAR_NAME_SUCCESS);
}
