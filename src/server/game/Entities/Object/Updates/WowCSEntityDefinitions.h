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

#ifndef TRINITYCORE_WOWCS_ENTITY_DEFINITIONS_H
#define TRINITYCORE_WOWCS_ENTITY_DEFINITIONS_H

#include "Define.h"
#include <array>
#include <span>

namespace WowCS
{
// 5.5.4.70449 uses the retail 11.2.7 numbering (client registry 0x14024AE40; WPP WowCSEntityFragments1127)
enum class EntityFragment : uint8
{
    FEntityPosition             = 1,
    CGObject                    = 2, //  UPDATEABLE, INDIRECT,
    FTransportLink              = 5,
    FPlayerOwnershipLink        = 13,
    CActor                      = 15, //  INDIRECT,
    FVendor_C                   = 17, //  UPDATEABLE, INDIRECT,
    FMirroredObject_C           = 18,
    Tag_Item                    = 200, //  TAG,
    Tag_Container               = 201, //  TAG,
    Tag_AzeriteEmpoweredItem    = 202, //  TAG,
    Tag_AzeriteItem             = 203, //  TAG,
    Tag_Unit                    = 204, //  TAG,
    Tag_Player                  = 205, //  TAG,
    Tag_GameObject              = 206, //  TAG,
    Tag_DynamicObject           = 207, //  TAG,
    Tag_Corpse                  = 208, //  TAG,
    Tag_AreaTrigger             = 209, //  TAG,
    Tag_SceneObject             = 210, //  TAG,
    Tag_Conversation            = 211, //  TAG,
    Tag_AIGroup                 = 212, //  TAG,
    Tag_Scenario                = 213, //  TAG,
    Tag_LootObject              = 214, //  TAG,
    Tag_ActivePlayer            = 215, //  TAG,
    Tag_ActiveClient_S          = 216, //  TAG,
    Tag_ActiveObject_C          = 217, //  TAG,
    Tag_VisibleObject_C         = 218, //  TAG,
    Tag_UnitVehicle             = 219, //  TAG,
    End                         = 255,
};

inline constexpr bool IsUpdateableFragment(EntityFragment frag)
{
    return frag == EntityFragment::CGObject || frag == EntityFragment::FVendor_C;
}

inline constexpr bool IsIndirectFragment(EntityFragment frag)
{
    return frag == EntityFragment::CGObject || frag == EntityFragment::CActor || frag == EntityFragment::FVendor_C;
}

// common case optimization, make use of the fact that fragment arrays are sorted
inline constexpr uint8 CGObjectActiveMask   = 0x1;
inline constexpr uint8 CGObjectChangedMask  = 0x2;
inline constexpr uint8 CGObjectUpdateMask   = CGObjectActiveMask | CGObjectChangedMask;

struct EntityFragmentsHolder
{
    std::array<EntityFragment, 8> Ids =
    {
        EntityFragment::End, EntityFragment::End, EntityFragment::End, EntityFragment::End,
        EntityFragment::End, EntityFragment::End, EntityFragment::End, EntityFragment::End
    };
    uint8 Count = 0;
    bool IdsChanged = false;

    std::array<EntityFragment, 2> UpdateableIds = { EntityFragment::End, EntityFragment::End };
    std::array<uint8, 2> UpdateableMasks = { };
    uint8 UpdateableCount = 0;
    uint8 ContentsChangedMask = 0;

    void Add(EntityFragment fragment, bool update);
    void Remove(EntityFragment fragment);

    std::span<EntityFragment const> GetIds() const { return std::span(Ids.begin(), Count); }
    std::span<EntityFragment const> GetUpdateableIds() const { return std::span(UpdateableIds.begin(), UpdateableCount); }

    uint8 GetUpdateMaskFor(EntityFragment fragment) const
    {
        if (fragment == EntityFragment::CGObject)   // common case optimization, make use of the fact that fragment arrays are sorted
            return CGObjectChangedMask;

        for (uint8 i = 1; i < UpdateableCount; ++i)
            if (UpdateableIds[i] == fragment)
                return UpdateableMasks[i];

        return 0;
    }
};

enum class EntityFragmentSerializationType : uint8
{
    Full    = 0,
    Partial = 1
};
}

#endif // TRINITYCORE_WOWCS_ENTITY_DEFINITIONS_H
