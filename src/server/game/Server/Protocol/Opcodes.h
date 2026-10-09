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

#ifndef TRINITYCORE_OPCODES_H
#define TRINITYCORE_OPCODES_H

#include "Define.h"
#include "StringFormatFwd.h"
#include <array>
#include <memory>

enum ConnectionType : int8
{
    CONNECTION_TYPE_REALM       = 0,
    CONNECTION_TYPE_INSTANCE    = 1,
    MAX_CONNECTION_TYPES,

    CONNECTION_TYPE_DEFAULT     = -1
};

constexpr uint32 UNKNOWN_OPCODE = 0xBADD;   // special marker value for uninitialized WorldPackets

// Values generated for client build 70032 by tools/mop-re; see docs/mop-port/re-notes.md
enum OpcodeClient : uint32
{
    CMSG_ACCEPT_GUILD_INVITE                           = 0x440029,
    CMSG_ACCEPT_SOCIAL_CONTRACT                        = 0x440180,
    CMSG_ACCEPT_TRADE                                  = 0x3E0005,
    CMSG_ACCEPT_WARGAME_INVITE                         = 0x44000C,
    CMSG_ACCOUNT_NOTIFICATION_ACKNOWLEDGED             = 0x44016D,
    CMSG_ACCOUNT_STORE_BEGIN_PURCHASE_OR_REFUND        = 0x4400C2,
    CMSG_ACTIVATE_TAXI                                 = 0x3F0037,
    CMSG_ADDON_LIST                                    = 0x440004,
    CMSG_ADD_BATTLENET_FRIEND                          = 0x440088,
    CMSG_ADD_FRIEND                                    = 0x44010B,
    CMSG_ADD_IGNORE                                    = 0x44010F,
    CMSG_ADD_TOY                                       = 0x3E015D,
    CMSG_ADVENTURE_JOURNAL_OPEN_QUEST                  = 0x3E00B5,
    CMSG_ADVENTURE_MAP_START_QUEST                     = 0x3E01A3, // TODO(verify): low-confidence match
    CMSG_ALTER_APPEARANCE                              = 0x3F008A,
    CMSG_AREA_SPIRIT_HEALER_QUERY                      = 0x3F003C,
    CMSG_AREA_SPIRIT_HEALER_QUEUE                      = 0x3F003D,
    CMSG_AREA_TRIGGER                                  = 0x3E0088,
    CMSG_ARENA_TEAM_ACCEPT                             = 0x4400EA,
    CMSG_ARENA_TEAM_DECLINE                            = 0x4400EB,
    CMSG_ARENA_TEAM_DISBAND                            = 0x4400EE,
    CMSG_ARENA_TEAM_LEADER                             = 0x4400EF,
    CMSG_ARENA_TEAM_LEAVE                              = 0x4400EC,
    CMSG_ARENA_TEAM_REMOVE                             = 0x4400ED,
    CMSG_ARENA_TEAM_ROSTER                             = 0x4400E9,
    CMSG_ASSIGN_EQUIPMENT_SET_SPEC                     = 0x3E00BE,
    CMSG_ATTACK_STOP                                   = 0x3E0115,
    CMSG_ATTACK_SWING                                  = 0x3E0114,
    CMSG_AUCTIONABLE_TOKEN_SELL                        = 0x440121,
    CMSG_AUCTIONABLE_TOKEN_SELL_AT_MARKET_PRICE        = 0x440122,
    CMSG_AUCTION_BROWSE_QUERY                          = 0x3F005E,
    CMSG_AUCTION_CANCEL_COMMODITIES_PURCHASE           = 0x3F0066,
    CMSG_AUCTION_CONFIRM_COMMODITIES_PURCHASE          = 0x3F0065,
    CMSG_AUCTION_GET_COMMODITY_QUOTE                   = 0x3F0064,
    CMSG_AUCTION_HELLO_REQUEST                         = 0x3F0056,
    CMSG_AUCTION_LIST_BIDDED_ITEMS                     = 0x3F0062,
    CMSG_AUCTION_LIST_BIDDER_ITEMS                     = 0x3F005C,
    CMSG_AUCTION_LIST_BUCKETS_BY_BUCKET_KEYS           = 0x3F0063,
    CMSG_AUCTION_LIST_ITEMS                            = 0x3F0059,
    CMSG_AUCTION_LIST_ITEMS_BY_BUCKET_KEY              = 0x3F005F,
    CMSG_AUCTION_LIST_ITEMS_BY_ITEM_ID                 = 0x3F0060,
    CMSG_AUCTION_LIST_OWNED_ITEMS                      = 0x3F0061,
    CMSG_AUCTION_LIST_OWNER_ITEMS                      = 0x3F005B,
    CMSG_AUCTION_LIST_PENDING_SALES                    = 0x3F0068,
    CMSG_AUCTION_PLACE_BID                             = 0x3F005D,
    CMSG_AUCTION_REMOVE_ITEM                           = 0x3F0058,
    CMSG_AUCTION_REPLICATE_ITEMS                       = 0x3F005A,
    CMSG_AUCTION_SELL_COMMODITY                        = 0x3F0067,
    CMSG_AUCTION_SELL_ITEM                             = 0x3F0057,
    CMSG_AUCTION_SET_FAVORITE_ITEM                     = 0x44016E,
    CMSG_AUTH_CONTINUED_SESSION                        = 0x450003,
    CMSG_AUTH_SESSION                                  = 0x450001,
    CMSG_AUTOBANK_ITEM                                 = 0x410003,
    CMSG_AUTOSTORE_BANK_ITEM                           = 0x410002,
    CMSG_AUTO_EQUIP_ITEM                               = 0x410004,
    CMSG_AUTO_EQUIP_ITEM_SLOT                          = 0x410009,
    CMSG_AUTO_GUILD_BANK_ITEM                          = 0x3F0042,
    CMSG_AUTO_STORE_BAG_ITEM                           = 0x410005,
    CMSG_AUTO_STORE_GUILD_BANK_ITEM                    = 0x3F004B,
    CMSG_AZERITE_EMPOWERED_ITEM_SELECT_POWER           = 0x3E01BE,
    CMSG_AZERITE_EMPOWERED_ITEM_VIEWED                 = 0x3E01AB,
    CMSG_AZERITE_ESSENCE_ACTIVATE_ESSENCE              = 0x3E01C0, // TODO(verify): low-confidence match
    CMSG_AZERITE_ESSENCE_UNLOCK_MILESTONE              = 0x3E01BF, // TODO(verify): low-confidence match
    CMSG_BANKER_ACTIVATE                               = 0x3F003F,
    CMSG_BATTLEFIELD_LEAVE                             = 0x3E0020,
    CMSG_BATTLEFIELD_LIST                              = 0x3E002C,
    CMSG_BATTLEFIELD_PORT                              = 0x3F00BE,
    CMSG_BATTLEMASTER_HELLO                            = 0x3E0177,
    CMSG_BATTLEMASTER_JOIN                             = 0x3F00B6,
    CMSG_BATTLEMASTER_JOIN_ARENA                       = 0x3F00B7,
    CMSG_BATTLEMASTER_JOIN_SKIRMISH                    = 0x3F00B8,
    CMSG_BATTLENET_CHALLENGE_RESPONSE                  = 0x44010E,
    CMSG_BATTLENET_REQUEST                             = 0x44012F,
    CMSG_BATTLE_PAY_ACK_FAILED_RESPONSE                = 0x440108,
    CMSG_BATTLE_PAY_CANCEL_OPEN_CHECKOUT               = 0x44014B,
    CMSG_BATTLE_PAY_CONFIRM_PURCHASE_RESPONSE          = 0x440107,
    CMSG_BATTLE_PAY_DISTRIBUTION_ASSIGN_TO_TARGET      = 0x4400FD,
    CMSG_BATTLE_PAY_DISTRIBUTION_ASSIGN_VAS            = 0x440171,
    CMSG_BATTLE_PAY_GET_PRODUCT_LIST                   = 0x4400F5,
    CMSG_BATTLE_PAY_GET_PURCHASE_LIST                  = 0x4400F6,
    CMSG_BATTLE_PAY_OPEN_CHECKOUT                      = 0x440144,
    CMSG_BATTLE_PAY_REQUEST_PRICE_INFO                 = 0x440140,
    CMSG_BATTLE_PAY_START_PURCHASE                     = 0x440106,
    CMSG_BATTLE_PAY_START_VAS_PURCHASE                 = 0x44012D,
    CMSG_BATTLE_PET_CLEAR_FANFARE                      = 0x2D0002,
    CMSG_BATTLE_PET_DELETE_PET                         = 0x44004F,
    CMSG_BATTLE_PET_DELETE_PET_CHEAT                   = 0x440050, // TODO(verify): low-confidence match
    CMSG_BATTLE_PET_MODIFY_NAME                        = 0x440052,
    CMSG_BATTLE_PET_REQUEST_JOURNAL                    = 0x44004E,
    CMSG_BATTLE_PET_REQUEST_JOURNAL_LOCK               = 0x44004D,
    CMSG_BATTLE_PET_SET_BATTLE_SLOT                    = 0x440057,
    CMSG_BATTLE_PET_SET_FLAGS                          = 0x44005A,
    CMSG_BATTLE_PET_SUMMON                             = 0x440053,
    CMSG_BATTLE_PET_UPDATE_DISPLAY_NOTIFY              = 0x3E0092,
    CMSG_BATTLE_PET_UPDATE_NOTIFY                      = 0x3E0091,
    CMSG_BEGIN_TRADE                                   = 0x3E0002,
    CMSG_BINDER_ACTIVATE                               = 0x3F003E,
    CMSG_BLACK_MARKET_BID_ON_ITEM                      = 0x3F00C6,
    CMSG_BLACK_MARKET_OPEN                             = 0x3F00C4,
    CMSG_BLACK_MARKET_REQUEST_ITEMS                    = 0x3F00C5,
    CMSG_BUG_REPORT                                    = 0x4400B3,
    CMSG_BUSY_TRADE                                    = 0x3E0003,
    CMSG_BUY_BACK_ITEM                                 = 0x3F0030,
    CMSG_BUY_BANK_SLOT                                 = 0x3F0040,
    CMSG_BUY_ITEM                                      = 0x3F002F,
    CMSG_BUY_STABLE_SLOT                               = 0x3E0013,
    CMSG_CAGE_BATTLE_PET                               = 0x3E00A3,
    CMSG_CALENDAR_ADD_EVENT                            = 0x4400AB,
    CMSG_CALENDAR_COMMUNITY_INVITE                     = 0x44009F,
    CMSG_CALENDAR_COMPLAIN                             = 0x4400A7,
    CMSG_CALENDAR_COPY_EVENT                           = 0x4400A6,
    CMSG_CALENDAR_EVENT_SIGN_UP                        = 0x4400A9,
    CMSG_CALENDAR_GET                                  = 0x44009D,
    CMSG_CALENDAR_GET_EVENT                            = 0x44009E,
    CMSG_CALENDAR_GET_NUM_PENDING                      = 0x4400A8,
    CMSG_CALENDAR_INVITE                               = 0x4400A0,
    CMSG_CALENDAR_MODERATOR_STATUS                     = 0x4400A4,
    CMSG_CALENDAR_REMOVE_EVENT                         = 0x4400A5,
    CMSG_CALENDAR_REMOVE_INVITE                        = 0x4400A1,
    CMSG_CALENDAR_RSVP                                 = 0x4400A2,
    CMSG_CALENDAR_STATUS                               = 0x4400A3,
    CMSG_CALENDAR_UPDATE_EVENT                         = 0x4400AC,
    CMSG_CANCEL_AURA                                   = 0x3E005E, // TODO(verify): low-confidence match
    CMSG_CANCEL_AUTO_REPEAT_SPELL                      = 0x3F007C,
    CMSG_CANCEL_CAST                                   = 0x3E0163,
    CMSG_CANCEL_CHANNELLING                            = 0x3E012C,
    CMSG_CANCEL_GROWTH_AURA                            = 0x3E0131,
    CMSG_CANCEL_MOUNT_AURA                             = 0x3E0141,
    CMSG_CANCEL_QUEUED_SPELL                           = 0x3E002D,
    CMSG_CANCEL_TEMP_ENCHANTMENT                       = 0x3F0087,
    CMSG_CANCEL_TRADE                                  = 0x3E0007,
    CMSG_CAN_DUEL                                      = 0x440090,
    CMSG_CAN_REDEEM_TOKEN_FOR_BALANCE                  = 0x44013F,
    CMSG_CAST_SPELL                                    = 0x3E0160,
    CMSG_CHALLENGE_MODE_REQUEST_LEADERBOARD            = 0x3E0200,
    CMSG_CHALLENGE_MODE_REQUEST_LEADERS                = 0x300001,
    CMSG_CHANGE_REALM_TICKET                           = 0x440133,
    CMSG_CHANGE_SUB_GROUP                              = 0x44007A,
    CMSG_CHARACTER_CHECK_UPGRADE                       = 0x440100,
    CMSG_CHARACTER_RENAME_REQUEST                      = 0x4400FB,
    CMSG_CHARACTER_UPGRADE_MANUAL_UNREVOKE_REQUEST     = 0x4400FE,
    CMSG_CHARACTER_UPGRADE_START                       = 0x4400FF,
    CMSG_CHAR_CREATE_FINALIZE_REINCARNATION            = 0x440199,
    CMSG_CHAR_CUSTOMIZE                                = 0x4400BA,
    CMSG_CHAR_DELETE                                   = 0x4400CD,
    CMSG_CHAR_RACE_OR_FACTION_CHANGE                   = 0x4400C0,
    CMSG_CHAT_ADDON_MESSAGE                            = 0x2F002A,
    CMSG_CHAT_ADDON_MESSAGE_TARGETED                   = 0x2F002B,
    CMSG_CHAT_CHANNEL_ANNOUNCEMENTS                    = 0x2F001F,
    CMSG_CHAT_CHANNEL_BAN                              = 0x2F001D,
    CMSG_CHAT_CHANNEL_DECLINE_INVITE                   = 0x2F0022,
    CMSG_CHAT_CHANNEL_DISPLAY_LIST                     = 0x2F0012,
    CMSG_CHAT_CHANNEL_INVITE                           = 0x2F001B,
    CMSG_CHAT_CHANNEL_KICK                             = 0x2F001C,
    CMSG_CHAT_CHANNEL_LIST                             = 0x2F0011,
    CMSG_CHAT_CHANNEL_MODERATE                         = 0x2F0016,
    CMSG_CHAT_CHANNEL_MODERATOR                        = 0x2F0017,
    CMSG_CHAT_CHANNEL_OWNER                            = 0x2F0015,
    CMSG_CHAT_CHANNEL_PASSWORD                         = 0x2F0013,
    CMSG_CHAT_CHANNEL_SET_OWNER                        = 0x2F0014,
    CMSG_CHAT_CHANNEL_SILENCE_ALL                      = 0x2F0020,
    CMSG_CHAT_CHANNEL_UNBAN                            = 0x2F001E,
    CMSG_CHAT_CHANNEL_UNMODERATOR                      = 0x2F0018,
    CMSG_CHAT_CHANNEL_UNSILENCE_ALL                    = 0x2F0021,
    CMSG_CHAT_DROP_CAUTIONARY_CHAT_MESSAGE             = 0x2F000A,
    CMSG_CHAT_JOIN_CHANNEL                             = 0x2F0000,
    CMSG_CHAT_LEAVE_CHANNEL                            = 0x2F0001,
    CMSG_CHAT_MESSAGE_AFK                              = 0x2F000F,
    CMSG_CHAT_MESSAGE_CHANNEL                          = 0x2F0007,
    CMSG_CHAT_MESSAGE_DND                              = 0x2F0010,
    CMSG_CHAT_MESSAGE_EMOTE                            = 0x2F0024,
    CMSG_CHAT_MESSAGE_GUILD                            = 0x2F000D,
    CMSG_CHAT_MESSAGE_INSTANCE_CHAT                    = 0x2F0028,
    CMSG_CHAT_MESSAGE_OFFICER                          = 0x2F000E,
    CMSG_CHAT_MESSAGE_PARTY                            = 0x2F0026,
    CMSG_CHAT_MESSAGE_RAID                             = 0x2F0027,
    CMSG_CHAT_MESSAGE_RAID_WARNING                     = 0x2F0029,
    CMSG_CHAT_MESSAGE_SAY                              = 0x2F0023,
    CMSG_CHAT_MESSAGE_WHISPER                          = 0x2F0008,
    CMSG_CHAT_MESSAGE_YELL                             = 0x2F0025,
    CMSG_CHAT_REGISTER_ADDON_PREFIXES                  = 0x2F0005,
    CMSG_CHAT_REPORT_FILTERED                          = 0x2F0004,
    CMSG_CHAT_REPORT_IGNORED                           = 0x2F0003,
    CMSG_CHAT_SEND_CAUTIONARY_CHANNEL_MESSAGE          = 0x2F000B,
    CMSG_CHAT_SEND_CAUTIONARY_CHAT_MESSAGE             = 0x2F0009,
    CMSG_CHAT_UNREGISTER_ALL_ADDON_PREFIXES            = 0x2F0006,
    CMSG_CHECK_IS_ADVENTURE_MAP_POI_VALID              = 0x3E0106,
    CMSG_CHOICE_RESPONSE                               = 0x3E0166,
    CMSG_CLEAR_NEW_APPEARANCE                          = 0x2D0005,
    CMSG_CLEAR_RAID_MARKER                             = 0x3E0056, // TODO(verify): low-confidence match
    CMSG_CLEAR_TRADE_ITEM                              = 0x3E0009,
    CMSG_CLIENT_PORT_GRAVEYARD                         = 0x3F00C0,
    CMSG_CLOSE_INTERACTION                             = 0x3F001F,
    CMSG_CLOSE_QUEST_CHOICE                            = 0x3E0167,
    CMSG_CLOSE_TRAIT_SYSTEM_INTERACTION                = 0x3E01DA,
    CMSG_CLUB_FINDER_APPLICATION_RESPONSE              = 0x440156,
    CMSG_CLUB_FINDER_GET_APPLICANTS_LIST               = 0x440154,
    CMSG_CLUB_FINDER_POST                              = 0x440151,
    CMSG_CLUB_FINDER_REQUEST_CLUBS_DATA                = 0x440158,
    CMSG_CLUB_FINDER_REQUEST_CLUBS_LIST                = 0x440152,
    CMSG_CLUB_FINDER_REQUEST_MEMBERSHIP_TO_CLUB        = 0x440153,
    CMSG_CLUB_FINDER_REQUEST_PENDING_CLUBS_LIST        = 0x440157,
    CMSG_CLUB_FINDER_REQUEST_SUBSCRIBED_CLUB_POSTING_IDS = 0x440159,
    CMSG_CLUB_FINDER_RESPOND_TO_APPLICANT              = 0x440155,
    CMSG_CLUB_FINDER_WHISPER_APPLICANT_REQUEST         = 0x440173,
    CMSG_CLUB_PRESENCE_SUBSCRIBE                       = 0x440131,
    CMSG_COLLECTION_ITEM_SET_FAVORITE                  = 0x44005D,
    CMSG_COMMENTATOR_ENABLE                            = 0x44001C,
    CMSG_COMMENTATOR_ENTER_INSTANCE                    = 0x440020,
    CMSG_COMMENTATOR_EXIT_INSTANCE                     = 0x440021,
    CMSG_COMMENTATOR_GET_MAP_INFO                      = 0x44001D,
    CMSG_COMMENTATOR_GET_PLAYER_COOLDOWNS              = 0x44001F,
    CMSG_COMMENTATOR_GET_PLAYER_INFO                   = 0x44001E,
    CMSG_COMMENTATOR_START_WARGAME                     = 0x44001B,
    CMSG_COMMERCE_TOKEN_GET_COUNT                      = 0x44011F,
    CMSG_COMMERCE_TOKEN_GET_LOG                        = 0x440129,
    CMSG_COMMERCE_TOKEN_GET_MARKET_PRICE               = 0x440120,
    CMSG_COMPLAINT                                     = 0x44009A,
    CMSG_COMPLETE_CINEMATIC                            = 0x3F00DE,
    CMSG_COMPLETE_MOVIE                                = 0x3F0072,
    CMSG_CONFIRM_BARBERS_CHOICE                        = 0x3E00C5,
    CMSG_CONFIRM_RESPEC_WIPE                           = 0x3E00C4,
    CMSG_CONNECT_TO_FAILED                             = 0x440000,
    CMSG_CONSUMABLE_TOKEN_BUY                          = 0x440124,
    CMSG_CONSUMABLE_TOKEN_BUY_AT_MARKET_PRICE          = 0x440125,
    CMSG_CONSUMABLE_TOKEN_CAN_VETERAN_BUY              = 0x440123,
    CMSG_CONSUMABLE_TOKEN_REDEEM                       = 0x440127,
    CMSG_CONSUMABLE_TOKEN_REDEEM_CONFIRMATION          = 0x440128,
    CMSG_CONTRIBUTION_LAST_UPDATE_REQUEST              = 0x3F00F8,
    CMSG_CONVERSATION_LINE_STARTED                     = 0x3F00DF,
    CMSG_CONVERT_RAID                                  = 0x44007C,
    CMSG_CREATE_CHARACTER                              = 0x440070,
    CMSG_DB_QUERY_BULK                                 = 0x440010,
    CMSG_DECLINE_GUILD_INVITES                         = 0x3F00B3,
    CMSG_DECLINE_PETITION                              = 0x3F00CD,
    CMSG_DELETE_EQUIPMENT_SET                          = 0x3F00A0,
    CMSG_DEL_FRIEND                                    = 0x44010C,
    CMSG_DEL_IGNORE                                    = 0x440110,
    CMSG_DESTROY_ITEM                                  = 0x3E0157,
    CMSG_DF_BOOT_PLAYER_VOTE                           = 0x440044,
    CMSG_DF_GET_JOIN_STATUS                            = 0x440042,
    CMSG_DF_GET_SYSTEM_INFO                            = 0x440041,
    CMSG_DF_JOIN                                       = 0x440037,
    CMSG_DF_LEAVE                                      = 0x440040,
    CMSG_DF_PROPOSAL_RESPONSE                          = 0x440035,
    CMSG_DF_READY_CHECK_RESPONSE                       = 0x440048,
    CMSG_DF_SET_ROLES                                  = 0x440043,
    CMSG_DF_TELEPORT                                   = 0x440045,
    CMSG_DISCARDED_TIME_SYNC_ACKS                      = 0x420060,
    CMSG_DISMISS_CRITTER                               = 0x3F008E,
    CMSG_DO_COUNTDOWN                                  = 0x440150,
    CMSG_DO_READY_CHECK                                = 0x44005E,
    CMSG_DUEL_RESPONSE                                 = 0x3F0077,
    CMSG_EJECT_PASSENGER                               = 0x3E00FB,
    CMSG_EMOTE                                         = 0x3F00DA,
    CMSG_ENABLE_NAGLE                                  = 0x450009,
    CMSG_ENABLE_TAXI_NODE                              = 0x3F0035,
    CMSG_ENGINE_SURVEY                                 = 0x44011E,
    CMSG_ENTER_ENCRYPTED_MODE_ACK                      = 0x450005,
    CMSG_ENUM_CHARACTERS                               = 0x440014,
    CMSG_ENUM_CHARACTERS_DELETED_BY_CLIENT             = 0x440118,
    CMSG_FAR_SIGHT                                     = 0x3F007D,
    CMSG_GAME_EVENT_DEBUG_DISABLE                      = 0x3E0061, // TODO(verify): low-confidence match
    CMSG_GAME_EVENT_DEBUG_ENABLE                       = 0x3E0060,
    CMSG_GAME_OBJ_REPORT_USE                           = 0x3F0084,
    CMSG_GAME_OBJ_USE                                  = 0x3F0083,
    CMSG_GENERATE_RANDOM_CHARACTER_NAME                = 0x440013,
    CMSG_GET_ACCOUNT_CHARACTER_LIST                    = 0x4400F0,
    CMSG_GET_ACCOUNT_NOTIFICATIONS                     = 0x44016C,
    CMSG_GET_ITEM_PURCHASE_DATA                        = 0x3F00C8,
    CMSG_GET_MIRROR_IMAGE_DATA                         = 0x3E015B,
    CMSG_GET_PVP_OPTIONS_ENABLED                       = 0x44001A,
    CMSG_GET_REMAINING_GAME_TIME                       = 0x440126,
    CMSG_GET_UNDELETE_CHARACTER_COOLDOWN_STATUS        = 0x44011A,
    CMSG_GET_VAS_ACCOUNT_CHARACTER_LIST                = 0x44012B,
    CMSG_GET_VAS_TRANSFER_TARGET_REALM_LIST            = 0x44012C,
    CMSG_GM_TICKET_ACKNOWLEDGE_SURVEY                  = 0x4400BE,
    CMSG_GM_TICKET_GET_CASE_STATUS                     = 0x4400BD,
    CMSG_GM_TICKET_GET_SYSTEM_STATUS                   = 0x4400BC,
    CMSG_GOSSIP_SELECT_OPTION                          = 0x3F0020,
    CMSG_GUILD_ADD_BATTLENET_FRIEND                    = 0x310020,
    CMSG_GUILD_ADD_RANK                                = 0x310005,
    CMSG_GUILD_ASSIGN_MEMBER_RANK                      = 0x310002,
    CMSG_GUILD_BANK_ACTIVATE                           = 0x3F0041,
    CMSG_GUILD_BANK_BUY_TAB                            = 0x3F004F,
    CMSG_GUILD_BANK_DEPOSIT_MONEY                      = 0x3F0051,
    CMSG_GUILD_BANK_LOG_QUERY                          = 0x310019,
    CMSG_GUILD_BANK_QUERY_TAB                          = 0x3F004E,
    CMSG_GUILD_BANK_REMAINING_WITHDRAW_MONEY_QUERY     = 0x31001A,
    CMSG_GUILD_BANK_SET_TAB_TEXT                       = 0x31001D,
    CMSG_GUILD_BANK_TEXT_QUERY                         = 0x31001E,
    CMSG_GUILD_BANK_UPDATE_TAB                         = 0x3F0050,
    CMSG_GUILD_BANK_WITHDRAW_MONEY                     = 0x3F0052,
    CMSG_GUILD_CHALLENGE_UPDATE_REQUEST                = 0x310017,
    CMSG_GUILD_CHANGE_NAME_REQUEST                     = 0x310018,
    CMSG_GUILD_DECLINE_INVITATION                      = 0x44002A,
    CMSG_GUILD_DELETE                                  = 0x310009,
    CMSG_GUILD_DELETE_RANK                             = 0x310006,
    CMSG_GUILD_DEMOTE_MEMBER                           = 0x310001,
    CMSG_GUILD_EVENT_LOG_QUERY                         = 0x31001C,
    CMSG_GUILD_GET_ACHIEVEMENT_MEMBERS                 = 0x310012,
    CMSG_GUILD_GET_RANKS                               = 0x31000E,
    CMSG_GUILD_GET_ROSTER                              = 0x310014,
    CMSG_GUILD_INVITE_BY_NAME                          = 0x440034,
    CMSG_GUILD_LEAVE                                   = 0x310003,
    CMSG_GUILD_NEWS_UPDATE_STICKY                      = 0x31000F,
    CMSG_GUILD_OFFICER_REMOVE_MEMBER                   = 0x310004,
    CMSG_GUILD_PERMISSIONS_QUERY                       = 0x31001B,
    CMSG_GUILD_PROMOTE_MEMBER                          = 0x310000,
    CMSG_GUILD_QUERY_MEMBER_RECIPES                    = 0x31000A,
    CMSG_GUILD_QUERY_NEWS                              = 0x31000D,
    CMSG_GUILD_QUERY_RECIPES                           = 0x31000B,
    CMSG_GUILD_REPLACE_GUILD_MASTER                    = 0x31001F,
    CMSG_GUILD_REQUEST_RENAME                          = 0x310023,
    CMSG_GUILD_REQUEST_RENAME_NAME_CHECK               = 0x310022,
    CMSG_GUILD_REQUEST_RENAME_REFUND                   = 0x310024,
    CMSG_GUILD_REQUEST_RENAME_STATUS                   = 0x310021,
    CMSG_GUILD_SET_ACHIEVEMENT_TRACKING                = 0x310010,
    CMSG_GUILD_SET_FOCUSED_ACHIEVEMENT                 = 0x310011,
    CMSG_GUILD_SET_GUILD_MASTER                        = 0x440103,
    CMSG_GUILD_SET_MEMBER_NOTE                         = 0x310013,
    CMSG_GUILD_SET_RANK_PERMISSIONS                    = 0x310008,
    CMSG_GUILD_SHIFT_RANK                              = 0x310007,
    CMSG_GUILD_UPDATE_INFO_TEXT                        = 0x310016,
    CMSG_GUILD_UPDATE_MOTD_TEXT                        = 0x310015,
    CMSG_HEARTH_AND_RESURRECT                          = 0x3F009C,
    CMSG_HOTFIX_REQUEST                                = 0x440011,
    CMSG_IGNORE_TRADE                                  = 0x3E0004,
    CMSG_INITIATE_ROLE_POLL                            = 0x440006,
    CMSG_INITIATE_TRADE                                = 0x3E0001,
    CMSG_INSPECT                                       = 0x3F00C2,
    CMSG_INSPECT_PVP                                   = 0x4400D3,
    CMSG_INSTANCE_LOCK_RESPONSE                        = 0x3F00A1,
    CMSG_ITEM_PURCHASE_REFUND                          = 0x3F00C9,
    CMSG_ITEM_TEXT_QUERY                               = 0x3E018E,
    CMSG_JOIN_PET_BATTLE_QUEUE                         = 0x3E008F,
    CMSG_JOIN_RATED_BATTLEGROUND                       = 0x3E0026,
    CMSG_KEEP_ALIVE                                    = 0x4400AD,
    CMSG_KEYBOUND_OVERRIDE                             = 0x3E00DD,
    CMSG_LATENCY_REPORT                                = 0x45000F,
    CMSG_LEARN_PET_SPECIALIZATION_GROUP                = 0x3E0016,
    CMSG_LEARN_PREVIEW_TALENTS                         = 0x3F00EF,
    CMSG_LEARN_PREVIEW_TALENTS_PET                     = 0x3F00F1,
    CMSG_LEARN_TALENT                                  = 0x3F00EE,
    CMSG_LEARN_TALENTS                                 = 0x3F00F4,
    CMSG_LEAVE_GROUP                                   = 0x440077,
    CMSG_LEAVE_PET_BATTLE_QUEUE                        = 0x3E0090,
    CMSG_LFG_LIST_APPLY_TO_GROUP                       = 0x44003B,
    CMSG_LFG_LIST_CANCEL_APPLICATION                   = 0x44003C,
    CMSG_LFG_LIST_DECLINE_APPLICANT                    = 0x44003D,
    CMSG_LFG_LIST_GET_STATUS                           = 0x440039,
    CMSG_LFG_LIST_INVITE_APPLICANT                     = 0x44003E,
    CMSG_LFG_LIST_INVITE_RESPONSE                      = 0x44003F,
    CMSG_LFG_LIST_JOIN                                 = 0x3E01BB,
    CMSG_LFG_LIST_LEAVE                                = 0x440038,
    CMSG_LFG_LIST_SEARCH                               = 0x44003A,
    CMSG_LFG_LIST_SET_ROLES                            = 0x3E01CE,
    CMSG_LFG_LIST_UPDATE_REQUEST                       = 0x3E01BC,
    CMSG_LIST_INVENTORY                                = 0x3F002D,
    CMSG_LIVE_REGION_ACCOUNT_RESTORE                   = 0x4400F3,
    CMSG_LIVE_REGION_CHARACTER_COPY                    = 0x4400F2,
    CMSG_LIVE_REGION_GET_ACCOUNT_CHARACTER_LIST        = 0x4400F1,
    CMSG_LOADING_SCREEN_NOTIFY                         = 0x440024,
    CMSG_LOBBY_MATCHMAKER_ENTER_QUEUE                  = 0x44017C,
    CMSG_LOGOUT_CANCEL                                 = 0x3F006D,
    CMSG_LOGOUT_INSTANT                                = 0x3F006E,
    CMSG_LOGOUT_REQUEST                                = 0x3F006C,
    CMSG_LOG_DISCONNECT                                = 0x450007,
    CMSG_LOG_STREAMING_ERROR                           = 0x45000B,
    CMSG_LOOT_ITEM                                     = 0x3E00C8,
    CMSG_LOOT_MONEY                                    = 0x3E00C7,
    CMSG_LOOT_RELEASE                                  = 0x3E00CA,
    CMSG_LOOT_ROLL                                     = 0x3E00CB,
    CMSG_LOOT_UNIT                                     = 0x3E00C6,
    CMSG_LOW_LEVEL_RAID1                               = 0x4400D1,
    CMSG_LOW_LEVEL_RAID2                               = 0x3F00A8,
    CMSG_MAIL_CREATE_TEXT_ITEM                         = 0x3F00D4,
    CMSG_MAIL_DELETE                                   = 0x3E00DF,
    CMSG_MAIL_GET_LIST                                 = 0x3F00CF,
    CMSG_MAIL_MARK_AS_READ                             = 0x3F00D3,
    CMSG_MAIL_RETURN_TO_SENDER                         = 0x440083,
    CMSG_MAIL_TAKE_ITEM                                = 0x3F00D1,
    CMSG_MAIL_TAKE_MONEY                               = 0x3F00D0,
    CMSG_MAKE_CONTITIONAL_APPEARANCE_PERMANENT         = 0x3E00E1,
    CMSG_MASTER_LOOT_ITEM                              = 0x3E00C9,
    CMSG_MERGE_GUILD_BANK_ITEM_WITH_GUILD_BANK_ITEM    = 0x3F004C,
    CMSG_MERGE_GUILD_BANK_ITEM_WITH_ITEM               = 0x3F0049,
    CMSG_MERGE_ITEM_WITH_GUILD_BANK_ITEM               = 0x3F0047,
    CMSG_MINIMAP_PING                                  = 0x440079,
    CMSG_MISSILE_TRAJECTORY_COLLISION                  = 0x3E0038,
    CMSG_MOUNT_CLEAR_FANFARE                           = 0x2D0003,
    CMSG_MOUNT_SET_FAVORITE                            = 0x44005C,
    CMSG_MOUNT_SPECIAL_ANIM                            = 0x3E0142,
    CMSG_MOVE_ADD_IMPULSE_ACK                          = 0x42006F,
    CMSG_MOVE_APPLY_INERTIA_ACK                        = 0x42006D,
    CMSG_MOVE_APPLY_MOVEMENT_FORCE_ACK                 = 0x420033,
    CMSG_MOVE_CHANGE_TRANSPORT                         = 0x42004E,
    CMSG_MOVE_CHANGE_VEHICLE_SEATS                     = 0x420053,
    CMSG_MOVE_COLLISION_DISABLE_ACK                    = 0x420058,
    CMSG_MOVE_COLLISION_ENABLE_ACK                     = 0x420059,
    CMSG_MOVE_DISMISS_VEHICLE                          = 0x420052,
    CMSG_MOVE_DOUBLE_JUMP                              = 0x420007,
    CMSG_MOVE_ENABLE_DOUBLE_JUMP_ACK                   = 0x42003C,
    CMSG_MOVE_ENABLE_FULL_SPEED_TURNING_ACK            = 0x420087,
    CMSG_MOVE_ENABLE_SWIM_TO_FLY_TRANS_ACK             = 0x420042,
    CMSG_MOVE_FALL_LAND                                = 0x420017,
    CMSG_MOVE_FALL_RESET                               = 0x420037,
    CMSG_MOVE_FEATHER_FALL_ACK                         = 0x42003A,
    CMSG_MOVE_FORCE_FLIGHT_BACK_SPEED_CHANGE_ACK       = 0x42004D,
    CMSG_MOVE_FORCE_FLIGHT_SPEED_CHANGE_ACK            = 0x42004C,
    CMSG_MOVE_FORCE_PITCH_RATE_CHANGE_ACK              = 0x420051,
    CMSG_MOVE_FORCE_ROOT_ACK                           = 0x42002C,
    CMSG_MOVE_FORCE_RUN_BACK_SPEED_CHANGE_ACK          = 0x42002A,
    CMSG_MOVE_FORCE_RUN_SPEED_CHANGE_ACK               = 0x420029,
    CMSG_MOVE_FORCE_SWIM_BACK_SPEED_CHANGE_ACK         = 0x420040,
    CMSG_MOVE_FORCE_SWIM_SPEED_CHANGE_ACK              = 0x42002B,
    CMSG_MOVE_FORCE_TURN_RATE_CHANGE_ACK               = 0x420041,
    CMSG_MOVE_FORCE_UNROOT_ACK                         = 0x42002D,
    CMSG_MOVE_FORCE_WALK_SPEED_CHANGE_ACK              = 0x42003F,
    CMSG_MOVE_GRAVITY_DISABLE_ACK                      = 0x420054,
    CMSG_MOVE_GRAVITY_ENABLE_ACK                       = 0x420055,
    CMSG_MOVE_GUILD_BANK_ITEM                          = 0x3F0046,
    CMSG_MOVE_HEARTBEAT                                = 0x42002E,
    CMSG_MOVE_HOVER_ACK                                = 0x420031,
    CMSG_MOVE_INERTIA_DISABLE_ACK                      = 0x420056,
    CMSG_MOVE_INERTIA_ENABLE_ACK                       = 0x420057,
    CMSG_MOVE_INIT_ACTIVE_MOVER_COMPLETE               = 0x420065, // TODO(verify): low-confidence match
    CMSG_MOVE_JUMP                                     = 0x420006,
    CMSG_MOVE_KNOCK_BACK_ACK                           = 0x420030,
    CMSG_MOVE_REMOVE_INERTIA_ACK                       = 0x42006E,
    CMSG_MOVE_REMOVE_MOVEMENT_FORCES                   = 0x420035,
    CMSG_MOVE_REMOVE_MOVEMENT_FORCE_ACK                = 0x420034,
    CMSG_MOVE_SET_ADV_FLY                              = 0x420071,
    CMSG_MOVE_SET_ADV_FLYING_ADD_IMPULSE_MAX_SPEED_ACK = 0x420079,
    CMSG_MOVE_SET_ADV_FLYING_AIR_FRICTION_ACK          = 0x420074,
    CMSG_MOVE_SET_ADV_FLYING_BANKING_RATE_ACK          = 0x42007A,
    CMSG_MOVE_SET_ADV_FLYING_DOUBLE_JUMP_VEL_MOD_ACK   = 0x420077,
    CMSG_MOVE_SET_ADV_FLYING_GLIDE_START_MIN_HEIGHT_ACK = 0x420078,
    CMSG_MOVE_SET_ADV_FLYING_LAUNCH_SPEED_COEFFICIENT_ACK = 0x420083,
    CMSG_MOVE_SET_ADV_FLYING_LIFT_COEFFICIENT_ACK      = 0x420076,
    CMSG_MOVE_SET_ADV_FLYING_MAX_VEL_ACK               = 0x420075,
    CMSG_MOVE_SET_ADV_FLYING_OVER_MAX_DECELERATION_ACK = 0x42007F,
    CMSG_MOVE_SET_ADV_FLYING_PITCHING_RATE_DOWN_ACK    = 0x42007B,
    CMSG_MOVE_SET_ADV_FLYING_PITCHING_RATE_UP_ACK      = 0x42007C,
    CMSG_MOVE_SET_ADV_FLYING_SURFACE_FRICTION_ACK      = 0x42007E,
    CMSG_MOVE_SET_ADV_FLYING_TURN_VELOCITY_THRESHOLD_ACK = 0x42007D,
    CMSG_MOVE_SET_CAN_ADV_FLY_ACK                      = 0x420070,
    CMSG_MOVE_SET_CAN_DRIVE_ACK                        = 0x420072,
    CMSG_MOVE_SET_CAN_FLY_ACK                          = 0x420045,
    CMSG_MOVE_SET_CAN_TURN_WHILE_FALLING_ACK           = 0x420043,
    CMSG_MOVE_SET_COLLISION_HEIGHT_ACK                 = 0x42005A,
    CMSG_MOVE_SET_FACING                               = 0x420027,
    CMSG_MOVE_SET_FACING_HEARTBEAT                     = 0x420080,
    CMSG_MOVE_SET_FLY                                  = 0x420047,
    CMSG_MOVE_SET_IGNORE_MOVEMENT_FORCES_ACK           = 0x420044,
    CMSG_MOVE_SET_MOD_MOVEMENT_FORCE_MAGNITUDE_ACK     = 0x420061,
    CMSG_MOVE_SET_PITCH                                = 0x420028,
    CMSG_MOVE_SET_RUN_MODE                             = 0x42000E,
    CMSG_MOVE_SET_TURN_RATE_CHEAT                      = 0x420024,
    CMSG_MOVE_SET_VEHICLE_REC_ID_ACK                   = 0x420032,
    CMSG_MOVE_SET_WALK_MODE                            = 0x42000F,
    CMSG_MOVE_SPLINE_DONE                              = 0x420036,
    CMSG_MOVE_START_ASCEND                             = 0x420048,
    CMSG_MOVE_START_BACKWARD                           = 0x420001,
    CMSG_MOVE_START_DESCEND                            = 0x42004F,
    CMSG_MOVE_START_DRIVE_FORWARD                      = 0x420073,
    CMSG_MOVE_START_FORWARD                            = 0x420000,
    CMSG_MOVE_START_PITCH_DOWN                         = 0x42000C,
    CMSG_MOVE_START_PITCH_UP                           = 0x42000B,
    CMSG_MOVE_START_STRAFE_LEFT                        = 0x420003,
    CMSG_MOVE_START_STRAFE_RIGHT                       = 0x420004,
    CMSG_MOVE_START_SWIM                               = 0x420018,
    CMSG_MOVE_START_TURN_LEFT                          = 0x420008,
    CMSG_MOVE_START_TURN_RIGHT                         = 0x420009,
    CMSG_MOVE_STOP                                     = 0x420002,
    CMSG_MOVE_STOP_ASCEND                              = 0x420049,
    CMSG_MOVE_STOP_PITCH                               = 0x42000D,
    CMSG_MOVE_STOP_STRAFE                              = 0x420005,
    CMSG_MOVE_STOP_SWIM                                = 0x420019,
    CMSG_MOVE_STOP_TURN                                = 0x42000A,
    CMSG_MOVE_TELEPORT_ACK                             = 0x420016,
    CMSG_MOVE_TIME_SKIPPED                             = 0x420039,
    CMSG_MOVE_UPDATE_FALL_SPEED                        = 0x420038,
    CMSG_MOVE_WATER_WALK_ACK                           = 0x42003B,
    CMSG_MYTHIC_PLUS_REQUEST_MAP_STATS                 = 0x300000,
    CMSG_NEUTRAL_PLAYER_SELECT_FACTION                 = 0x3E0085,
    CMSG_NEXT_CINEMATIC_CAMERA                         = 0x3F00DD,
    CMSG_OBJECT_UPDATE_FAILED                          = 0x3E002E,
    CMSG_OBJECT_UPDATE_RESCUED                         = 0x3E002F,
    CMSG_OFFER_PETITION                                = 0x3E01C9,
    CMSG_OPENING_CINEMATIC                             = 0x3F00DC,
    CMSG_OPEN_ITEM                                     = 0x3E018F,
    CMSG_OPT_OUT_OF_LOOT                               = 0x3F008B,
    CMSG_OVERRIDE_SCREEN_FLASH                         = 0x3F00B4,
    CMSG_PARTY_INVITE                                  = 0x440030,
    CMSG_PARTY_INVITE_RESPONSE                         = 0x440032,
    CMSG_PARTY_UNINVITE                                = 0x440075,
    CMSG_PETITION_BUY                                  = 0x3F0054,
    CMSG_PETITION_RENAME_GUILD                         = 0x440104,
    CMSG_PETITION_SHOW_LIST                            = 0x3F0053,
    CMSG_PETITION_SHOW_SIGNATURES                      = 0x3F0055,
    CMSG_PET_ABANDON                                   = 0x3F0019,
    CMSG_PET_ACTION                                    = 0x3F0017,
    CMSG_PET_BATTLE_FINAL_NOTIFY                       = 0x3E0094,
    CMSG_PET_BATTLE_INPUT                              = 0x44006D,
    CMSG_PET_BATTLE_QUEUE_PROPOSE_MATCH_RESULT         = 0x3E00DE,
    CMSG_PET_BATTLE_QUIT_NOTIFY                        = 0x3E0093,
    CMSG_PET_BATTLE_REPLACE_FRONT_PET                  = 0x44006E,
    CMSG_PET_BATTLE_REQUEST_PVP                        = 0x3E008D,
    CMSG_PET_BATTLE_REQUEST_UPDATE                     = 0x3E008E,
    CMSG_PET_BATTLE_REQUEST_WILD                       = 0x3E008B,
    CMSG_PET_BATTLE_SCRIPT_ERROR_NOTIFY                = 0x3E0095,
    CMSG_PET_CANCEL_AURA                               = 0x3F001A,
    CMSG_PET_CAST_SPELL                                = 0x3E015F,
    CMSG_PET_LEARN_TALENT                              = 0x3F00F0,
    CMSG_PET_RENAME                                    = 0x4400B2,
    CMSG_PET_SET_ACTION                                = 0x3F0016,
    CMSG_PET_SPELL_AUTOCAST                            = 0x3F001B,
    CMSG_PET_STOP_ATTACK                               = 0x3F0018,
    CMSG_PING                                          = 0x450006,
    CMSG_PLAYER_LOGIN                                  = 0x440016,
    CMSG_PUSH_QUEST_TO_PARTY                           = 0x3F002B,
    CMSG_PVP_LOG_DATA                                  = 0x3E002A,
    CMSG_QUERY_ARENA_TEAM                              = 0x4400D4,
    CMSG_QUERY_BATTLE_PET_NAME                         = 0x3E0138,
    CMSG_QUERY_CORPSE_LOCATION_FROM_CLIENT             = 0x44008E,
    CMSG_QUERY_CORPSE_TRANSPORT                        = 0x44008F,
    CMSG_QUERY_COUNTDOWN_TIMER                         = 0x3E0059,
    CMSG_QUERY_CREATURE                                = 0x3E0132,
    CMSG_QUERY_GAME_OBJECT                             = 0x3E0133,
    CMSG_QUERY_GUILD_INFO                              = 0x4400B9,
    CMSG_QUERY_INSPECT_ACHIEVEMENTS                    = 0x3F0095,
    CMSG_QUERY_NEXT_MAIL_TIME                          = 0x3F00D2,
    CMSG_QUERY_NPC_TEXT                                = 0x3E0134,
    CMSG_QUERY_PAGE_TEXT                               = 0x3E0136,
    CMSG_QUERY_PETITION                                = 0x3E0139,
    CMSG_QUERY_PET_NAME                                = 0x3E0137,
    CMSG_QUERY_PLAYER_NAMES                            = 0x450010,
    CMSG_QUERY_PLAYER_NAMES_FOR_COMMUNITY              = 0x45000E,
    CMSG_QUERY_PLAYER_NAME_BY_COMMUNITY_ID             = 0x45000D,
    CMSG_QUERY_QUEST_COMPLETION_NPCS                   = 0x3E0022,
    CMSG_QUERY_QUEST_INFO                              = 0x3E0135,
    CMSG_QUERY_QUEST_ITEM_USABILITY                    = 0x3E0023,
    CMSG_QUERY_REALM_NAME                              = 0x4400B8,
    CMSG_QUERY_SCENARIO_POI                            = 0x440084,
    CMSG_QUERY_TIME                                    = 0x3F006B,
    CMSG_QUERY_TREASURE_PICKER                         = 0x3E01A6,
    CMSG_QUERY_VOID_STORAGE                            = UNKNOWN_OPCODE,
    CMSG_QUEST_CONFIRM_ACCEPT                          = 0x3F002A,
    CMSG_QUEST_GIVER_ACCEPT_QUEST                      = 0x3F0024,
    CMSG_QUEST_GIVER_CHOOSE_REWARD                     = 0x3F0026,
    CMSG_QUEST_GIVER_CLOSE_QUEST                       = 0x3F00E2,
    CMSG_QUEST_GIVER_COMPLETE_QUEST                    = 0x3F0025,
    CMSG_QUEST_GIVER_HELLO                             = 0x3F0022,
    CMSG_QUEST_GIVER_QUERY_QUEST                       = 0x3F0023,
    CMSG_QUEST_GIVER_REQUEST_REWARD                    = 0x3F0027,
    CMSG_QUEST_GIVER_STATUS_MULTIPLE_QUERY             = 0x3F0029,
    CMSG_QUEST_GIVER_STATUS_QUERY                      = 0x3F0028,
    CMSG_QUEST_GIVER_STATUS_TRACKED_QUERY              = 0x3F010E,
    CMSG_QUEST_LOG_REMOVE_QUEST                        = 0x3F00C7,
    CMSG_QUEST_POI_QUERY                               = 0x4400E3,
    CMSG_QUEST_PUSH_RESULT                             = 0x3F002C,
    CMSG_QUEUED_MESSAGES_END                           = 0x45000A,
    CMSG_QUICK_JOIN_AUTO_ACCEPT_REQUESTS               = 0x44013D,
    CMSG_QUICK_JOIN_REQUEST_INVITE                     = 0x44013C,
    CMSG_QUICK_JOIN_RESPOND_TO_INVITE                  = 0x44013B,
    CMSG_RAF_CLAIM_ACTIVITY_REWARD                     = 0x3F0099,
    CMSG_RAF_CLAIM_NEXT_REWARD                         = 0x44015B,
    CMSG_RAF_GENERATE_RECRUITMENT_LINK                 = 0x44015D,
    CMSG_RAF_UPDATE_RECRUITMENT_INFO                   = 0x44015C,
    CMSG_RANDOM_ROLL                                   = 0x440082,
    CMSG_READY_CHECK_RESPONSE                          = 0x44005F,
    CMSG_READ_ITEM                                     = 0x3E0190,
    CMSG_RECLAIM_CORPSE                                = 0x3F0070,
    CMSG_REFORGE_ITEM                                  = 0x3E0000,
    CMSG_REMOVE_GLYPH                                  = 0x3E01CC,
    CMSG_REMOVE_NEW_ITEM                               = 0x3E01AA,
    CMSG_REMOVE_RAF_RECRUIT                            = 0x44015E,
    CMSG_REORDER_CHARACTERS                            = 0x440015,
    CMSG_REPAIR_ITEM                                   = 0x3F0081,
    CMSG_REPOP_REQUEST                                 = 0x3F00BF,
    CMSG_REPORT_CLIENT_VARIABLES                       = UNKNOWN_OPCODE,
    CMSG_REPORT_ENABLED_ADDONS                         = UNKNOWN_OPCODE,
    CMSG_REPORT_KEYBINDING_EXECUTION_COUNTS            = UNKNOWN_OPCODE,
    CMSG_REPORT_PVP_PLAYER_AFK                         = 0x3F0089,
    CMSG_REPORT_SERVER_LAG                             = 0x3E01C7,
    CMSG_REQUEST_ACCOUNT_DATA                          = 0x4400C4,
    CMSG_REQUEST_AREA_POI_UPDATE                       = 0x3E01A8,
    CMSG_REQUEST_BATTLEFIELD_STATUS                    = 0x440008,
    CMSG_REQUEST_CEMETERY_LIST                         = 0x3E0024,
    CMSG_REQUEST_CROWD_CONTROL_SPELL                   = 0x3F00C3,
    CMSG_REQUEST_GUILD_PARTY_STATE                     = 0x3E0058,
    CMSG_REQUEST_GUILD_REWARDS_LIST                    = 0x3E0057,
    CMSG_REQUEST_HONOR_STATS                           = 0x3E0029,
    CMSG_REQUEST_LFG_LIST_BLACKLIST                    = 0x3E0169,
    CMSG_REQUEST_MYTHIC_PLUS_AFFIXES                   = 0x3E00B7,
    CMSG_REQUEST_MYTHIC_PLUS_SEASON_DATA               = 0x3E00B8,
    CMSG_REQUEST_PARTY_JOIN_UPDATES                    = 0x440023,
    CMSG_REQUEST_PARTY_MEMBER_STATS                    = 0x440081,
    CMSG_REQUEST_PET_INFO                              = 0x3F001C,
    CMSG_REQUEST_PLAYED_TIME                           = 0x3E013C,
    CMSG_REQUEST_PVP_REWARDS                           = 0x3E0045,
    CMSG_REQUEST_RAID_INFO                             = 0x440105,
    CMSG_REQUEST_RATED_PVP_INFO                        = 0x44000F,
    CMSG_REQUEST_SCHEDULED_PVP_INFO                    = 0x3E0046,
    CMSG_REQUEST_STABLED_PETS                          = 0x3F001D,
    CMSG_REQUEST_STORE_FRONT_INFO_UPDATE               = 0x2D0023,
    CMSG_REQUEST_VEHICLE_EXIT                          = 0x3E00F6,
    CMSG_REQUEST_VEHICLE_NEXT_SEAT                     = 0x3E00F8,
    CMSG_REQUEST_VEHICLE_PREV_SEAT                     = 0x3E00F7,
    CMSG_REQUEST_VEHICLE_SWITCH_SEAT                   = 0x3E00F9,
    CMSG_REQUEST_WORLD_QUEST_UPDATE                    = 0x3E01A7,
    CMSG_RESET_CHALLENGE_MODE                          = 0x3E00B6,
    CMSG_RESET_INSTANCES                               = 0x440096,
    CMSG_RESURRECT_RESPONSE                            = 0x4400B1,
    CMSG_RIDE_VEHICLE_INTERACT                         = 0x3E00FA,
    CMSG_SAVE_ACCOUNT_DATA_EXPORT                      = 0x440184,
    CMSG_SAVE_CUF_PROFILES                             = 0x3E0039,
    CMSG_SAVE_EQUIPMENT_SET                            = 0x3F009F,
    CMSG_SAVE_GUILD_EMBLEM                             = 0x3E016E,
    CMSG_SCENE_PLAYBACK_CANCELED                       = 0x3E00DA,
    CMSG_SCENE_PLAYBACK_COMPLETE                       = 0x3E00D9,
    CMSG_SCENE_TRIGGER_EVENT                           = 0x3E00DB,
    CMSG_SEAMLESS_TRANSFER_COMPLETE                    = 0x3E01DE,
    CMSG_SELF_RES                                      = 0x3F00CA,
    CMSG_SELL_ITEM                                     = 0x3F002E,
    CMSG_SEND_CONTACT_LIST                             = 0x44010A,
    CMSG_SEND_MAIL                                     = 0x440026,
    CMSG_SEND_TEXT_EMOTE                               = 0x3F0014,
    CMSG_SERVER_TIME_OFFSET_REQUEST                    = 0x4400CC,
    CMSG_SET_ACTION_BAR_TOGGLES                        = 0x3F00CB,
    CMSG_SET_ACTION_BUTTON                             = 0x3F00FA,
    CMSG_SET_ACTIVE_MOVER                              = 0x42005B,
    CMSG_SET_ADVANCED_COMBAT_LOGGING                   = 0x3E017A,
    CMSG_SET_AMMO                                      = 0x3F00FB,
    CMSG_SET_ASSISTANT_LEADER                          = 0x44007D,
    CMSG_SET_CONTACT_NOTES                             = 0x44010D,
    CMSG_SET_CURRENCY_FLAGS                            = 0x3E0017,
    CMSG_SET_DIFFICULTY_ID                             = 0x3E00DC,
    CMSG_SET_DUNGEON_DIFFICULTY                        = 0x4400B0,
    CMSG_SET_EVERYONE_IS_ASSISTANT                     = 0x440046,
    CMSG_SET_FACTION_AT_WAR                            = 0x3F0073,
    CMSG_SET_FACTION_INACTIVE                          = 0x3F0075,
    CMSG_SET_FACTION_NOT_AT_WAR                        = 0x3F0074,
    CMSG_SET_GAME_EVENT_DEBUG_VIEW_STATE               = 0x3E0068, // TODO(verify): low-confidence match
    CMSG_SET_INSERT_ITEMS_LEFT_TO_RIGHT                = 0x3E0193,
    CMSG_SET_LOOT_METHOD                               = 0x440076,
    CMSG_SET_LOOT_SPECIALIZATION                       = 0x3F00D8,
    CMSG_SET_PARTY_ASSIGNMENT                          = 0x44007F,
    CMSG_SET_PARTY_LEADER                              = 0x440078,
    CMSG_SET_PET_SLOT                                  = 0x3E0014,
    CMSG_SET_PET_SPECIALIZATION                        = 0x3E0015,
    CMSG_SET_PLAYER_DECLINED_NAMES                     = 0x4400B7,
    CMSG_SET_PREFERRED_CEMETERY                        = 0x3E0025,
    CMSG_SET_PRIMARY_TALENT_TREE                       = 0x3F00F3,
    CMSG_SET_PVP                                       = 0x3E0172,
    CMSG_SET_RAID_DIFFICULTY                           = 0x440116,
    CMSG_SET_ROLE                                      = 0x440005,
    CMSG_SET_SAVED_INSTANCE_EXTEND                     = 0x4400B4,
    CMSG_SET_SELECTION                                 = 0x3F00C1,
    CMSG_SET_SHEATHED                                  = 0x3F0015,
    CMSG_SET_TAXI_BENCHMARK_MODE                       = 0x3F0088,
    CMSG_SET_TITLE                                     = 0x3E0140,
    CMSG_SET_TRADE_GOLD                                = 0x3E000A,
    CMSG_SET_TRADE_ITEM                                = 0x3E0008,
    CMSG_SET_WATCHED_FACTION                           = 0x3F0076,
    CMSG_SHOWING_CLOAK                                 = 0x3F010A,
    CMSG_SHOWING_HELM                                  = 0x3F0109,
    CMSG_SHOW_TRADE_SKILL                              = 0x4400FC,
    CMSG_SIGN_PETITION                                 = 0x3F00CC,
    CMSG_SILENCE_PARTY_TALKER                          = 0x440080,
    CMSG_SOCIAL_CONTRACT_REQUEST                       = 0x44017F,
    CMSG_SOCKET_GEMS                                   = 0x3F0080,
    CMSG_SPAWN_TRACKING_UPDATE                         = 0x3E0154,
    CMSG_SPELL_CLICK                                   = 0x3F0021,
    CMSG_SPIRIT_HEALER_ACTIVATE                        = 0x3F003B,
    CMSG_SPLIT_GUILD_BANK_ITEM                         = 0x3F004D,
    CMSG_SPLIT_GUILD_BANK_ITEM_TO_INVENTORY            = 0x3F004A,
    CMSG_SPLIT_ITEM                                    = 0x410008,
    CMSG_SPLIT_ITEM_TO_GUILD_BANK                      = 0x3F0048,
    CMSG_STABLE_PET                                    = UNKNOWN_OPCODE,
    CMSG_STAND_STATE_CHANGE                            = 0x3E0037,
    CMSG_START_SPECTATOR_WAR_GAME                      = 0x44000B,
    CMSG_START_WAR_GAME                                = 0x44000A,
    CMSG_STORE_GUILD_BANK_ITEM                         = 0x3F0043,
    CMSG_SUBMIT_USER_FEEDBACK                          = 0x4400C3,
    CMSG_SUMMON_RESPONSE                               = 0x440098,
    CMSG_SUPPORT_TICKET_SUBMIT_BUG                     = 0x440073,
    CMSG_SUPPORT_TICKET_SUBMIT_COMPLAINT               = 0x440072,
    CMSG_SUPPORT_TICKET_SUBMIT_SUGGESTION              = 0x440074,
    CMSG_SUSPEND_COMMS_ACK                             = 0x450000,
    CMSG_SUSPEND_TOKEN_RESPONSE                        = 0x450008,
    CMSG_SWAP_GUILD_BANK_ITEM_WITH_GUILD_BANK_ITEM     = 0x3F0045,
    CMSG_SWAP_INV_ITEM                                 = 0x410007,
    CMSG_SWAP_ITEM                                     = 0x410006,
    CMSG_SWAP_ITEM_WITH_GUILD_BANK_ITEM                = 0x3F0044,
    CMSG_SWAP_SUB_GROUPS                               = 0x44007B,
    CMSG_SWAP_VOID_ITEM                                = UNKNOWN_OPCODE,
    CMSG_TABARD_VENDOR_ACTIVATE                        = 0x3E016F,
    CMSG_TALK_TO_GOSSIP                                = 0x3F001E,
    CMSG_TAXI_NODE_STATUS_QUERY                        = 0x3F0034,
    CMSG_TAXI_QUERY_AVAILABLE_NODES                    = 0x3F0036,
    CMSG_TAXI_REQUEST_EARLY_LANDING                    = 0x3F0038,
    CMSG_TIME_ADJUSTMENT_RESPONSE                      = 0x42005F,
    CMSG_TIME_SYNC_RESPONSE                            = 0x42005C,
    CMSG_TIME_SYNC_RESPONSE_DROPPED                    = 0x42005E,
    CMSG_TIME_SYNC_RESPONSE_FAILED                     = 0x42005D,
    CMSG_TOGGLE_DIFFICULTY                             = 0x440085,
    CMSG_TOGGLE_PVP                                    = 0x3E0171,
    CMSG_TOTEM_DESTROYED                               = 0x3F008D,
    CMSG_TOY_CLEAR_FANFARE                             = 0x2D0004,
    CMSG_TRAINER_BUY_SPELL                             = 0x3F003A,
    CMSG_TRAINER_LIST                                  = 0x3F0039,
    CMSG_TRAITS_COMMIT_CONFIG                          = 0x3E01CF,
    CMSG_TRANSMOGRIFY_ITEMS                            = 0x3E0047,
    CMSG_TURN_IN_PETITION                              = 0x3F00CE,
    CMSG_TUTORIAL                                      = 0x440117,
    CMSG_UNACCEPT_TRADE                                = 0x3E0006,
    CMSG_UNDELETE_CHARACTER                            = 0x440119,
    CMSG_UNLEARN_SKILL                                 = 0x3F007A,
    CMSG_UNLEARN_SPECIALIZATION                        = 0x3E0055, // TODO(verify): low-confidence match
    CMSG_UNLOCK_VOID_STORAGE                           = UNKNOWN_OPCODE,
    CMSG_UPDATE_AADC_STATUS                            = 0x440170,
    CMSG_UPDATE_ACCOUNT_DATA                           = 0x4400C5,
    CMSG_UPDATE_AREA_TRIGGER_VISUAL                    = 0x3E0162,
    CMSG_UPDATE_CLIENT_SETTINGS                        = 0x440092, // TODO(verify): low-confidence match
    CMSG_UPDATE_MISSILE_TRAJECTORY                     = 0x420062,
    CMSG_UPDATE_RAID_TARGET                            = 0x44007E,
    CMSG_UPDATE_SPELL_VISUAL                           = 0x3E0161,
    CMSG_UPDATE_VAS_PURCHASE_STATES                    = 0x44012E,
    CMSG_UPGRADE_ITEM                                  = 0x3E00E0,
    CMSG_USED_FOLLOW                                   = 0x3E0034,
    CMSG_USE_CRITTER_ITEM                              = 0x3E0100,
    CMSG_USE_EQUIPMENT_SET                             = 0x410001,
    CMSG_USE_ITEM                                      = 0x3E015C,
    CMSG_USE_TOY                                       = 0x3E015E,
    CMSG_VAS_CHECK_TRANSFER_OK                         = 0x440143,
    CMSG_VAS_GET_QUEUE_MINUTES                         = 0x440142,
    CMSG_VAS_GET_SERVICE_STATUS                        = 0x440141,
    CMSG_VIOLENCE_LEVEL                                = 0x3E0032,
    CMSG_VOICE_CHANNEL_STT_TOKEN_REQUEST               = 0x440147,
    CMSG_VOICE_CHAT_JOIN_CHANNEL                       = 0x440148,
    CMSG_VOICE_CHAT_LOGIN                              = 0x440146,
    CMSG_VOID_STORAGE_TRANSFER                         = UNKNOWN_OPCODE,
    CMSG_WARDEN3_DATA                                  = 0x440018,
    CMSG_WHO                                           = 0x4400AF,
    CMSG_WHO_IS                                        = 0x4400AE,
    CMSG_WORLD_PORT_RESPONSE                           = 0x440025,
    CMSG_WRAP_ITEM                                     = 0x410000,
};

inline constexpr std::size_t NUM_CMSG_OPCODES = 1664;

inline constexpr std::ptrdiff_t GetOpcodeArrayIndex(OpcodeClient opcode)
{
    uint32 idInGroup = opcode & 0xFFFF;
    switch (opcode >> 16)
    {
        case 0x2D: return idInGroup < 55 ? idInGroup + 0 : -1;
        case 0x2F: return idInGroup < 44 ? idInGroup + 55 : -1;
        case 0x30: return idInGroup < 2 ? idInGroup + 99 : -1;
        case 0x31: return idInGroup < 39 ? idInGroup + 101 : -1;
        case 0x32: return idInGroup < 2 ? idInGroup + 140 : -1;
        case 0x33: return idInGroup < 2 ? idInGroup + 142 : -1;
        case 0x34: return idInGroup < 18 ? idInGroup + 144 : -1;
        case 0x35: return idInGroup < 8 ? idInGroup + 162 : -1;
        case 0x36: return idInGroup < 9 ? idInGroup + 170 : -1;
        case 0x37: return idInGroup < 38 ? idInGroup + 179 : -1;
        case 0x39: return idInGroup < 8 ? idInGroup + 217 : -1;
        case 0x3B: return idInGroup < 8 ? idInGroup + 225 : -1;
        case 0x3C: return idInGroup < 16 ? idInGroup + 233 : -1;
        case 0x3D: return idInGroup < 16 ? idInGroup + 249 : -1;
        case 0x3E: return idInGroup < 515 ? idInGroup + 265 : -1;
        case 0x3F: return idInGroup < 284 ? idInGroup + 780 : -1;
        case 0x40: return idInGroup < 1 ? idInGroup + 1064 : -1;
        case 0x41: return idInGroup < 10 ? idInGroup + 1065 : -1;
        case 0x42: return idInGroup < 137 ? idInGroup + 1075 : -1;
        case 0x44: return idInGroup < 435 ? idInGroup + 1212 : -1;
        case 0x45: return idInGroup < 17 ? idInGroup + 1647 : -1;
        default: return -1;
    }
}

enum OpcodeServer : uint32
{
    SMSG_ABORT_NEW_WORLD                               = 0x46003B, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_CHARACTER_CURRENCY_LISTS              = 0x46034B, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_CONVERSION_STATE_UPDATE               = 0x460350, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_COSMETIC_ADDED                        = 0x46031A, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_CRITERIA_UPDATE                       = 0x4602FF, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_DATA_TIMES                            = 0x4601B9,
    SMSG_ACCOUNT_EXPORT_RESPONSE                       = 0x46033C, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_HEIRLOOM_UPDATE                       = UNKNOWN_OPCODE,
    SMSG_ACCOUNT_ITEM_COLLECTION_DATA                  = 0x460351, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_MOUNT_REMOVED                         = 0x460052, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_MOUNT_UPDATE                          = 0x460051, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_NOTIFICATIONS_RESPONSE                = 0x460319, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_TOY_UPDATE                            = 0x460053, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_TRANSMOG_SET_FAVORITES_UPDATE         = 0x460057, // TODO(verify): low-confidence match
    SMSG_ACCOUNT_TRANSMOG_UPDATE                       = 0x460056, // TODO(verify): low-confidence match
    SMSG_ACHIEVEMENT_DELETED                           = 0x460196, // TODO(verify): low-confidence match
    SMSG_ACHIEVEMENT_EARNED                            = 0x4600ED, // TODO(verify): low-confidence match
    SMSG_ACTIVATE_ESSENCE_FAILED                       = UNKNOWN_OPCODE,
    SMSG_ACTIVATE_SOULBIND_FAILED                      = UNKNOWN_OPCODE,
    SMSG_ACTIVATE_TAXI_REPLY                           = 0x46012B, // TODO(verify): low-confidence match
    SMSG_ACTIVE_GLYPHS                                 = 0x500041, // TODO(verify): low-confidence match
    SMSG_ACTIVE_SCHEDULED_WORLD_STATE_INFO             = UNKNOWN_OPCODE,
    SMSG_ADDON_LIST_REQUEST                            = 0x4600EC, // TODO(verify): low-confidence match
    SMSG_ADD_BATTLENET_FRIEND_RESPONSE                 = 0x4600E7, // TODO(verify): low-confidence match
    SMSG_ADD_ITEM_PASSIVE                              = 0x46004D, // TODO(verify): low-confidence match
    SMSG_ADD_LOSS_OF_CONTROL                           = 0x46011D, // TODO(verify): low-confidence match
    SMSG_ADD_RUNE_POWER                                = 0x460166, // TODO(verify): low-confidence match
    SMSG_ADJUST_SPLINE_DURATION                        = 0x460074, // TODO(verify): low-confidence match
    SMSG_ADVANCED_COMBAT_LOG                           = UNKNOWN_OPCODE,
    SMSG_AE_LOOT_TARGETS                               = 0x4600C2, // TODO(verify): low-confidence match
    SMSG_AE_LOOT_TARGET_ACK                            = 0x4600C3, // TODO(verify): low-confidence match
    SMSG_AI_REACTION                                   = 0x460163, // TODO(verify): low-confidence match
    SMSG_ALLIED_RACE_DETAILS                           = 0x4602A8, // TODO(verify): low-confidence match
    SMSG_ALL_ACCOUNT_CRITERIA                          = 0x460005, // TODO(verify): low-confidence match
    SMSG_ALL_ACHIEVEMENT_DATA                          = 0x460004, // TODO(verify): low-confidence match
    SMSG_ALL_GUILD_ACHIEVEMENTS                        = UNKNOWN_OPCODE,
    SMSG_APPLY_MOUNT_EQUIPMENT_RESULT                  = UNKNOWN_OPCODE,
    SMSG_ARCHAEOLOGY_SURVERY_CAST                      = 0x460027, // TODO(verify): low-confidence match
    SMSG_AREA_POI_UPDATE_RESPONSE                      = UNKNOWN_OPCODE,
    SMSG_AREA_SPIRIT_HEALER_TIME                       = 0x4601EE, // TODO(verify): low-confidence match
    SMSG_AREA_TRIGGER_DENIED                           = UNKNOWN_OPCODE,
    SMSG_AREA_TRIGGER_FORCE_SET_POSITION_AND_FACING    = UNKNOWN_OPCODE,
    SMSG_AREA_TRIGGER_MESSAGE                          = 0x460317, // TODO(verify): low-confidence match
    SMSG_AREA_TRIGGER_NO_CORPSE                        = 0x4601C5, // TODO(verify): low-confidence match
    SMSG_AREA_TRIGGER_PLAY_SPELL_VISUAL                = UNKNOWN_OPCODE,
    SMSG_AREA_TRIGGER_RE_PATH                          = UNKNOWN_OPCODE,
    SMSG_AREA_TRIGGER_RE_SHAPE                         = UNKNOWN_OPCODE,
    SMSG_AREA_TRIGGER_UNATTACH                         = UNKNOWN_OPCODE,
    SMSG_AREA_TRIGGER_UPDATE_DECAL_PROPERTIES          = UNKNOWN_OPCODE,
    SMSG_ARENA_CLEAR_OPPONENTS                         = UNKNOWN_OPCODE,
    SMSG_ARENA_CROWD_CONTROL_SPELL_RESULT              = 0x4600DC, // TODO(verify): low-confidence match
    SMSG_ARENA_PREP_OPPONENT_SPECIALIZATIONS           = UNKNOWN_OPCODE,
    SMSG_ARENA_TEAM_COMMAND_RESULT                     = 0x460211, // TODO(verify): low-confidence match
    SMSG_ARENA_TEAM_EVENT                              = 0x460210, // TODO(verify): low-confidence match
    SMSG_ARENA_TEAM_INVITE                             = 0x46020F, // TODO(verify): low-confidence match
    SMSG_ARENA_TEAM_ROSTER                             = 0x46020E, // TODO(verify): low-confidence match
    SMSG_ARENA_TEAM_STATS                              = 0x460212, // TODO(verify): low-confidence match
    SMSG_ATTACKER_STATE_UPDATE                         = 0x4C0030, // TODO(verify): low-confidence match
    SMSG_ATTACK_START                                  = 0x4C001B, // TODO(verify): low-confidence match
    SMSG_ATTACK_STOP                                   = 0x4C001C, // TODO(verify): low-confidence match
    SMSG_ATTACK_SWING_ERROR                            = 0x4C002A, // TODO(verify): low-confidence match
    SMSG_ATTACK_SWING_LANDED_LOG                       = 0x4C002B, // TODO(verify): low-confidence match
    SMSG_AUCTIONABLE_TOKEN_AUCTION_SOLD                = 0x460284, // TODO(verify): low-confidence match
    SMSG_AUCTIONABLE_TOKEN_SELL_AT_MARKET_PRICE_RESPONSE = 0x460283, // TODO(verify): low-confidence match
    SMSG_AUCTIONABLE_TOKEN_SELL_CONFIRM_REQUIRED       = 0x460282, // TODO(verify): low-confidence match
    SMSG_AUCTION_CLOSED_NOTIFICATION                   = 0x4601A1, // TODO(verify): low-confidence match
    SMSG_AUCTION_COMMAND_RESULT                        = 0x46019E, // TODO(verify): low-confidence match
    SMSG_AUCTION_DISABLE_NEW_POSTINGS                  = 0x460337, // TODO(verify): low-confidence match
    SMSG_AUCTION_FAVORITE_LIST                         = 0x460306, // TODO(verify): low-confidence match
    SMSG_AUCTION_GET_COMMODITY_QUOTE_RESULT            = 0x4602FE, // TODO(verify): low-confidence match
    SMSG_AUCTION_HELLO_RESPONSE                        = 0x46019C, // TODO(verify): low-confidence match
    SMSG_AUCTION_LIST_BIDDED_ITEMS_RESULT              = 0x4602FD, // TODO(verify): low-confidence match
    SMSG_AUCTION_LIST_BIDDER_ITEMS_RESULT              = UNKNOWN_OPCODE,
    SMSG_AUCTION_LIST_BUCKETS_RESULT                   = 0x4602F9, // TODO(verify): low-confidence match
    SMSG_AUCTION_LIST_ITEMS_RESULT                     = 0x4602FA, // TODO(verify): low-confidence match
    SMSG_AUCTION_LIST_OWNED_ITEMS_RESULT               = 0x4602FC, // TODO(verify): low-confidence match
    SMSG_AUCTION_LIST_OWNER_ITEMS_RESULT               = UNKNOWN_OPCODE,
    SMSG_AUCTION_LIST_PENDING_SALES_RESULT             = UNKNOWN_OPCODE,
    SMSG_AUCTION_OUTBID_NOTIFICATION                   = 0x4601A0, // TODO(verify): low-confidence match
    SMSG_AUCTION_OWNER_BID_NOTIFICATION                = 0x4601A2, // TODO(verify): low-confidence match
    SMSG_AUCTION_REPLICATE_RESPONSE                    = 0x46019D, // TODO(verify): low-confidence match
    SMSG_AUCTION_WON_NOTIFICATION                      = 0x46019F, // TODO(verify): low-confidence match
    SMSG_AURA_POINTS_DEPLETED                          = 0x500010, // TODO(verify): low-confidence match
    SMSG_AURA_UPDATE                                   = 0x50000F, // TODO(verify): low-confidence match
    SMSG_AUTH_CHALLENGE                                = 0x4D0000,
    SMSG_AUTH_FAILED                                   = 0x460000, // TODO(verify): low-confidence match
    SMSG_AUTH_RESPONSE                                 = 0x460001,
    SMSG_AVAILABLE_HOTFIXES                            = 0x4A0001,
    SMSG_BACKPACK_DEFAULT_SIZE_CHANGED                 = UNKNOWN_OPCODE,
    SMSG_BAG_CLEANUP_FINISHED                          = UNKNOWN_OPCODE,
    SMSG_BARBER_SHOP_RESULT                            = 0x46016C, // TODO(verify): low-confidence match
    SMSG_BATCH_PRESENCE_SUBSCRIPTION                   = 0x4602DD, // TODO(verify): low-confidence match
    SMSG_BATTLEFIELD_LIST                              = 0x4C0005, // TODO(verify): low-confidence match
    SMSG_BATTLEFIELD_PORT_DENIED                       = 0x4C000B, // TODO(verify): low-confidence match
    SMSG_BATTLEFIELD_STATUS_ACTIVE                     = 0x4C0001, // TODO(verify): low-confidence match
    SMSG_BATTLEFIELD_STATUS_FAILED                     = 0x4C0004, // TODO(verify): low-confidence match
    SMSG_BATTLEFIELD_STATUS_GROUP_PROPOSAL_FAILED      = 0x4C000E, // TODO(verify): low-confidence match
    SMSG_BATTLEFIELD_STATUS_NEED_CONFIRMATION          = 0x4C0000, // TODO(verify): low-confidence match
    SMSG_BATTLEFIELD_STATUS_NONE                       = 0x4C0003, // TODO(verify): low-confidence match
    SMSG_BATTLEFIELD_STATUS_QUEUED                     = 0x4C0002, // TODO(verify): low-confidence match
    SMSG_BATTLEFIELD_STATUS_WAIT_FOR_GROUPS            = 0x4C000D, // TODO(verify): low-confidence match
    SMSG_BATTLEGROUND_INFO_THROTTLED                   = 0x4C000C, // TODO(verify): low-confidence match
    SMSG_BATTLEGROUND_INIT                             = 0x4C002D, // TODO(verify): low-confidence match
    SMSG_BATTLEGROUND_PLAYER_JOINED                    = 0x4C0009, // TODO(verify): low-confidence match
    SMSG_BATTLEGROUND_PLAYER_LEFT                      = 0x4C000A, // TODO(verify): low-confidence match
    SMSG_BATTLEGROUND_PLAYER_POSITIONS                 = 0x4C0006, // TODO(verify): low-confidence match
    SMSG_BATTLEGROUND_POINTS                           = 0x4C002C, // TODO(verify): low-confidence match
    SMSG_BATTLENET_CHALLENGE_ABORT                     = 0x46023E, // TODO(verify): low-confidence match
    SMSG_BATTLENET_CHALLENGE_START                     = 0x46023D, // TODO(verify): low-confidence match
    SMSG_BATTLENET_NOTIFICATION                        = 0x4602B4, // TODO(verify): low-confidence match
    SMSG_BATTLENET_RESPONSE                            = 0x4602B3, // TODO(verify): low-confidence match
    SMSG_BATTLE_NET_CONNECTION_STATUS                  = 0x4602B5, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_ACK_FAILED                         = 0x460237, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_BATTLE_PET_DELIVERED               = 0x46022C, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_COLLECTION_ITEM_DELIVERED          = 0x46022D, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_CONFIRM_PURCHASE                   = 0x460236, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_DELIVERY_ENDED                     = 0x46022A, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_DELIVERY_STARTED                   = 0x460229, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_DISTRIBUTION_ASSIGN_VAS_RESPONSE   = 0x46031F, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_DISTRIBUTION_UNREVOKED             = 0x460227, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_DISTRIBUTION_UPDATE                = 0x460228, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_GET_DISTRIBUTION_LIST_RESPONSE     = 0x460226, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_GET_PRODUCT_LIST_RESPONSE          = 0x460224, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_GET_PURCHASE_LIST_RESPONSE         = 0x460225, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_MOUNT_DELIVERED                    = 0x46022B, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_PURCHASE_UPDATE                    = 0x460235, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_START_CHECKOUT                     = 0x4602D1, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_START_DISTRIBUTION_ASSIGN_TO_TARGET_RESPONSE = 0x460233, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_START_PURCHASE_RESPONSE            = 0x460232, // TODO(verify): low-confidence match
    SMSG_BATTLE_PAY_VALIDATE_PURCHASE_RESPONSE         = 0x4602C4, // TODO(verify): low-confidence match
    SMSG_BATTLE_PETS_HEALED                            = 0x460097, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_CAGE_DATE_ERROR                    = 0x460126, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_DELETED                            = 0x460094, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_ERROR                              = 0x4600E2, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_JOURNAL                            = 0x460093, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_JOURNAL_LOCK_ACQUIRED              = 0x460091, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_JOURNAL_LOCK_DENIED                = 0x460092, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_RESTORED                           = 0x460096, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_REVOKED                            = 0x460095, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_TRAP_LEVEL                         = 0x46008F, // TODO(verify): low-confidence match
    SMSG_BATTLE_PET_UPDATES                            = 0x46008E, // TODO(verify): low-confidence match
    SMSG_BIND_POINT_UPDATE                             = 0x460011, // TODO(verify): low-confidence match
    SMSG_BLACK_MARKET_BID_ON_ITEM_RESULT               = 0x4600D2, // TODO(verify): low-confidence match
    SMSG_BLACK_MARKET_OUTBID                           = 0x4600D3, // TODO(verify): low-confidence match
    SMSG_BLACK_MARKET_REQUEST_ITEMS_RESULT             = 0x4600D1, // TODO(verify): low-confidence match
    SMSG_BLACK_MARKET_WON                              = 0x4600D4, // TODO(verify): low-confidence match
    SMSG_BONUS_ROLL_EMPTY                              = 0x4600EF, // TODO(verify): low-confidence match
    SMSG_BOSS_KILL                                     = 0x4C002F, // TODO(verify): low-confidence match
    SMSG_BREAK_TARGET                                  = 0x4C001A, // TODO(verify): low-confidence match
    SMSG_BROADCAST_ACHIEVEMENT                         = 0x4B0012, // TODO(verify): low-confidence match
    SMSG_BROADCAST_LEVELUP                             = 0x4B0013, // TODO(verify): low-confidence match
    SMSG_BROADCAST_SUMMON_CAST                         = UNKNOWN_OPCODE,
    SMSG_BROADCAST_SUMMON_RESPONSE                     = UNKNOWN_OPCODE,
    SMSG_BUY_FAILED                                    = 0x460175, // TODO(verify): low-confidence match
    SMSG_BUY_SUCCEEDED                                 = 0x460174, // TODO(verify): low-confidence match
    SMSG_CACHE_INFO                                    = 0x4A000F, // TODO(verify): low-confidence match
    SMSG_CACHE_VERSION                                 = 0x4A000E, // TODO(verify): low-confidence match
    SMSG_CALENDAR_CLEAR_PENDING_ACTION                 = 0x46014B, // TODO(verify): low-confidence match
    SMSG_CALENDAR_COMMAND_RESULT                       = 0x46014C, // TODO(verify): low-confidence match
    SMSG_CALENDAR_COMMUNITY_INVITE                     = 0x46013B, // TODO(verify): low-confidence match
    SMSG_CALENDAR_EVENT_REMOVED_ALERT                  = 0x460143, // TODO(verify): low-confidence match
    SMSG_CALENDAR_EVENT_UPDATED_ALERT                  = 0x460144, // TODO(verify): low-confidence match
    SMSG_CALENDAR_INVITE_ADDED                         = 0x46013C, // TODO(verify): low-confidence match
    SMSG_CALENDAR_INVITE_ALERT                         = 0x460140, // TODO(verify): low-confidence match
    SMSG_CALENDAR_INVITE_NOTES                         = 0x460145, // TODO(verify): low-confidence match
    SMSG_CALENDAR_INVITE_NOTES_ALERT                   = 0x460146, // TODO(verify): low-confidence match
    SMSG_CALENDAR_INVITE_REMOVED                       = 0x46013D, // TODO(verify): low-confidence match
    SMSG_CALENDAR_INVITE_REMOVED_ALERT                 = 0x460142, // TODO(verify): low-confidence match
    SMSG_CALENDAR_INVITE_STATUS                        = 0x46013E, // TODO(verify): low-confidence match
    SMSG_CALENDAR_INVITE_STATUS_ALERT                  = 0x460141, // TODO(verify): low-confidence match
    SMSG_CALENDAR_MODERATOR_STATUS                     = 0x46013F, // TODO(verify): low-confidence match
    SMSG_CALENDAR_RAID_LOCKOUT_ADDED                   = 0x460147, // TODO(verify): low-confidence match
    SMSG_CALENDAR_RAID_LOCKOUT_REMOVED                 = 0x460148, // TODO(verify): low-confidence match
    SMSG_CALENDAR_RAID_LOCKOUT_UPDATED                 = 0x460149, // TODO(verify): low-confidence match
    SMSG_CALENDAR_SEND_CALENDAR                        = 0x460139, // TODO(verify): low-confidence match
    SMSG_CALENDAR_SEND_EVENT                           = 0x46013A, // TODO(verify): low-confidence match
    SMSG_CALENDAR_SEND_NUM_PENDING                     = 0x46014A, // TODO(verify): low-confidence match
    SMSG_CAMERA_EFFECT                                 = 0x4601D4, // TODO(verify): low-confidence match
    SMSG_CANCEL_AUTO_REPEAT                            = 0x46018C, // TODO(verify): low-confidence match
    SMSG_CANCEL_COMBAT                                 = 0x4C0029, // TODO(verify): low-confidence match
    SMSG_CANCEL_ORPHAN_SPELL_VISUAL                    = 0x500033, // TODO(verify): low-confidence match
    SMSG_CANCEL_PING_PIN                               = UNKNOWN_OPCODE,
    SMSG_CANCEL_PRELOAD_WORLD                          = 0x460039, // TODO(verify): low-confidence match
    SMSG_CANCEL_SCENE                                  = 0x4600E1, // TODO(verify): low-confidence match
    SMSG_CANCEL_SPELL_VISUAL                           = 0x500031, // TODO(verify): low-confidence match
    SMSG_CANCEL_SPELL_VISUAL_KIT                       = 0x500035, // TODO(verify): low-confidence match
    SMSG_CAN_DUEL_RESULT                               = 0x4C0025, // TODO(verify): low-confidence match
    SMSG_CAN_REDEEM_TOKEN_FOR_BALANCE_RESPONSE         = 0x4602C3, // TODO(verify): low-confidence match
    SMSG_CAPTURE_POINT_REMOVED                         = 0x4C0008, // TODO(verify): low-confidence match
    SMSG_CAST_FAILED                                   = 0x500044, // TODO(verify): low-confidence match
    SMSG_CAUTIONARY_CHANNEL_MESSAGE                    = 0x4B0009, // TODO(verify): low-confidence match
    SMSG_CAUTIONARY_CHAT_MESSAGE                       = 0x4B0008, // TODO(verify): low-confidence match
    SMSG_CHAIN_MISSILE_BOUNCE                          = UNKNOWN_OPCODE,
    SMSG_CHALLENGE_MODE_COMPLETE                       = 0x4600B2, // TODO(verify): low-confidence match
    SMSG_CHALLENGE_MODE_NEW_PLAYER_RECORD              = 0x4600B3, // TODO(verify): low-confidence match
    SMSG_CHALLENGE_MODE_REQUEST_LEADERS_RESULT         = 0x4600B9, // TODO(verify): low-confidence match
    SMSG_CHALLENGE_MODE_RESET                          = 0x4600B1, // TODO(verify): low-confidence match
    SMSG_CHALLENGE_MODE_START                          = 0x4600AF, // TODO(verify): low-confidence match
    SMSG_CHALLENGE_MODE_UPDATE_DEATH_COUNT             = 0x4600B0, // TODO(verify): low-confidence match
    SMSG_CHANGE_PLAYER_DIFFICULTY_RESULT               = UNKNOWN_OPCODE,
    SMSG_CHANGE_REALM_TICKET_RESPONSE                  = 0x4602B6, // TODO(verify): low-confidence match
    SMSG_CHANNEL_LIST                                  = 0x4B001B, // TODO(verify): low-confidence match
    SMSG_CHANNEL_NOTIFY                                = 0x4B0017, // TODO(verify): low-confidence match
    SMSG_CHANNEL_NOTIFY_JOINED                         = 0x4B0019, // TODO(verify): low-confidence match
    SMSG_CHANNEL_NOTIFY_LEFT                           = 0x4B001A, // TODO(verify): low-confidence match
    SMSG_CHANNEL_NOTIFY_NPE_JOINED_BATCH               = 0x4B0018, // TODO(verify): low-confidence match
    SMSG_CHARACTER_CHECK_UPGRADE_RESULT                = 0x460270, // TODO(verify): low-confidence match
    SMSG_CHARACTER_LOGIN_FAILED                        = 0x4601B3, // TODO(verify): low-confidence match
    SMSG_CHARACTER_OBJECT_TEST_RESPONSE                = 0x46023C, // TODO(verify): low-confidence match
    SMSG_CHARACTER_RENAME_RESULT                       = 0x460215, // TODO(verify): low-confidence match
    SMSG_CHARACTER_UPGRADE_ABORTED                     = 0x46026F, // TODO(verify): low-confidence match
    SMSG_CHARACTER_UPGRADE_COMPLETE                    = 0x46026E, // TODO(verify): low-confidence match
    SMSG_CHARACTER_UPGRADE_MANUAL_UNREVOKE_RESULT      = 0x460271, // TODO(verify): low-confidence match
    SMSG_CHARACTER_UPGRADE_STARTED                     = 0x46026D, // TODO(verify): low-confidence match
    SMSG_CHAR_CUSTOMIZE_FAILURE                        = 0x460190, // TODO(verify): low-confidence match
    SMSG_CHAR_CUSTOMIZE_SUCCESS                        = 0x460191, // TODO(verify): low-confidence match
    SMSG_CHAR_FACTION_CHANGE_RESULT                    = 0x46025A, // TODO(verify): low-confidence match
    SMSG_CHAT                                          = 0x4B0001, // TODO(verify): low-confidence match
    SMSG_CHAT_AUTO_RESPONDED                           = 0x4B000E, // TODO(verify): low-confidence match
    SMSG_CHAT_CAN_LOCAL_WHISPER_TARGET_RESPONSE        = 0x4B0022, // TODO(verify): low-confidence match
    SMSG_CHAT_DOWN                                     = 0x4B0014, // TODO(verify): low-confidence match
    SMSG_CHAT_IGNORED_ACCOUNT_MUTED                    = 0x4B0000, // TODO(verify): low-confidence match
    SMSG_CHAT_IS_DOWN                                  = 0x4B0015, // TODO(verify): low-confidence match
    SMSG_CHAT_NOT_IN_GUILD                             = 0x4B0023, // TODO(verify): low-confidence match
    SMSG_CHAT_NOT_IN_PARTY                             = 0x4B0006, // TODO(verify): low-confidence match
    SMSG_CHAT_PLAYER_AMBIGUOUS                         = 0x4B0004, // TODO(verify): low-confidence match
    SMSG_CHAT_PLAYER_NOTFOUND                          = 0x4B000D, // TODO(verify): low-confidence match
    SMSG_CHAT_RECONNECT                                = 0x4B0016, // TODO(verify): low-confidence match
    SMSG_CHAT_REGIONAL_SERVICE_STATUS                  = 0x4B001D, // TODO(verify): low-confidence match
    SMSG_CHAT_RESTRICTED                               = 0x4B0007, // TODO(verify): low-confidence match
    SMSG_CHAT_SERVER_MESSAGE                           = 0x4B001C, // TODO(verify): low-confidence match
    SMSG_CHEAT_IGNORE_DIMISHING_RETURNS                = 0x500000, // TODO(verify): low-confidence match
    SMSG_CHECK_ABANDON_NPE                             = UNKNOWN_OPCODE,
    SMSG_CHECK_CHARACTER_NAME_AVAILABILITY_RESULT      = UNKNOWN_OPCODE,
    SMSG_CHECK_WARGAME_ENTRY                           = 0x460032, // TODO(verify): low-confidence match
    SMSG_CHROMIE_TIME_SELECT_EXPANSION_SUCCESS         = UNKNOWN_OPCODE,
    SMSG_CLAIM_RAF_REWARD_RESPONSE                     = UNKNOWN_OPCODE,
    SMSG_CLEAR_ALL_SPELL_CHARGES                       = 0x500014, // TODO(verify): low-confidence match
    SMSG_CLEAR_BOSS_EMOTES                             = 0x46005F, // TODO(verify): low-confidence match
    SMSG_CLEAR_COOLDOWN                                = 0x460168, // TODO(verify): low-confidence match
    SMSG_CLEAR_COOLDOWNS                               = 0x500013, // TODO(verify): low-confidence match
    SMSG_CLEAR_RESURRECT                               = UNKNOWN_OPCODE,
    SMSG_CLEAR_SPELL_CHARGES                           = 0x500015, // TODO(verify): low-confidence match
    SMSG_CLEAR_TARGET                                  = 0x4C0026, // TODO(verify): low-confidence match
    SMSG_CLEAR_TREASURE_PICKER_CACHE                   = UNKNOWN_OPCODE,
    SMSG_CLUB_FINDER_ERROR_MESSAGE                     = 0x4602E8, // TODO(verify): low-confidence match
    SMSG_CLUB_FINDER_GET_CLUB_POSTING_IDS_RESPONSE     = 0x4602EB, // TODO(verify): low-confidence match
    SMSG_CLUB_FINDER_LOOKUP_CLUB_POSTINGS_LIST         = 0x4602E9, // TODO(verify): low-confidence match
    SMSG_CLUB_FINDER_RESPONSE_CHARACTER_APPLICATION_LIST = 0x4602E6, // TODO(verify): low-confidence match
    SMSG_CLUB_FINDER_RESPONSE_POST_RECRUITMENT_MESSAGE = 0x4602EA, // TODO(verify): low-confidence match
    SMSG_CLUB_FINDER_UPDATE_APPLICATIONS               = 0x4602E7, // TODO(verify): low-confidence match
    SMSG_CLUB_FINDER_WHISPER_APPLICANT_RESPONSE        = 0x460323, // TODO(verify): low-confidence match
    SMSG_COIN_REMOVED                                  = 0x4600C1, // TODO(verify): low-confidence match
    SMSG_COMBAT_EVENT_FAILED                           = 0x4C001D, // TODO(verify): low-confidence match
    SMSG_COMMENTATOR_MAP_INFO                          = 0x4601B5, // TODO(verify): low-confidence match
    SMSG_COMMENTATOR_PLAYER_INFO                       = 0x4601B6, // TODO(verify): low-confidence match
    SMSG_COMMENTATOR_STATE_CHANGED                     = 0x4601B4, // TODO(verify): low-confidence match
    SMSG_COMMERCE_TOKEN_GET_COUNT_RESPONSE             = 0x46027F, // TODO(verify): low-confidence match
    SMSG_COMMERCE_TOKEN_GET_LOG_RESPONSE               = 0x46028B, // TODO(verify): low-confidence match
    SMSG_COMMERCE_TOKEN_GET_MARKET_PRICE_RESPONSE      = 0x460281, // TODO(verify): low-confidence match
    SMSG_COMMERCE_TOKEN_UPDATE                         = 0x460280, // TODO(verify): low-confidence match
    SMSG_COMPLAINT_RESULT                              = 0x460159, // TODO(verify): low-confidence match
    SMSG_COMPLETE_SHIPMENT_RESPONSE                    = UNKNOWN_OPCODE,
    SMSG_COMPRESSED_PACKET                             = 0x4D000E,
    SMSG_CONFIRM_BARBERS_CHOICE                        = 0x46016B, // TODO(verify): low-confidence match
    SMSG_CONFIRM_PARTY_INVITE                          = 0x4602C2, // TODO(verify): low-confidence match
    SMSG_CONNECT_TO                                    = 0x4D0008,
    SMSG_CONSOLE_WRITE                                 = 0x4600DF, // TODO(verify): low-confidence match
    SMSG_CONSUMABLE_TOKEN_BUY_AT_MARKET_PRICE_RESPONSE = 0x460287, // TODO(verify): low-confidence match
    SMSG_CONSUMABLE_TOKEN_BUY_CHOICE_REQUIRED          = 0x460286, // TODO(verify): low-confidence match
    SMSG_CONSUMABLE_TOKEN_CAN_VETERAN_BUY_RESPONSE     = 0x460285, // TODO(verify): low-confidence match
    SMSG_CONSUMABLE_TOKEN_REDEEM_CONFIRM_REQUIRED      = 0x460289, // TODO(verify): low-confidence match
    SMSG_CONSUMABLE_TOKEN_REDEEM_RESPONSE              = 0x46028A, // TODO(verify): low-confidence match
    SMSG_CONTACT_LIST                                  = 0x46023A, // TODO(verify): low-confidence match
    SMSG_CONTRIBUTION_LAST_UPDATE_RESPONSE             = 0x4602CA, // TODO(verify): low-confidence match
    SMSG_CONTROL_UPDATE                                = 0x4600F1, // TODO(verify): low-confidence match
    SMSG_CONVERT_ITEMS_TO_CURRENCY_VALUE               = UNKNOWN_OPCODE,
    SMSG_CONVERT_RUNE                                  = 0x50004D, // TODO(verify): low-confidence match
    SMSG_COOLDOWN_CHEAT                                = 0x4601E7, // TODO(verify): low-confidence match
    SMSG_COOLDOWN_EVENT                                = 0x460167, // TODO(verify): low-confidence match
    SMSG_CORPSE_LOCATION                               = 0x4600F9, // TODO(verify): low-confidence match
    SMSG_CORPSE_RECLAIM_DELAY                          = 0x4601F8, // TODO(verify): low-confidence match
    SMSG_CORPSE_TRANSPORT_QUERY                        = 0x4601C1, // TODO(verify): low-confidence match
    SMSG_COVENANT_CALLINGS_AVAILABILITY_RESPONSE       = UNKNOWN_OPCODE,
    SMSG_COVENANT_PREVIEW_OPEN_NPC                     = 0x4602AB, // TODO(verify): low-confidence match
    SMSG_COVENANT_RENOWN_SEND_CATCHUP_STATE            = UNKNOWN_OPCODE,
    SMSG_CRAFTING_HOUSE_HELLO_RESPONSE                 = UNKNOWN_OPCODE,
    SMSG_CRAFTING_ORDER_CANCEL_RESULT                  = UNKNOWN_OPCODE,
    SMSG_CRAFTING_ORDER_CLAIM_RESULT                   = UNKNOWN_OPCODE,
    SMSG_CRAFTING_ORDER_CRAFT_RESULT                   = UNKNOWN_OPCODE,
    SMSG_CRAFTING_ORDER_CREATE_RESULT                  = UNKNOWN_OPCODE,
    SMSG_CRAFTING_ORDER_FULFILL_RESULT                 = UNKNOWN_OPCODE,
    SMSG_CRAFTING_ORDER_LIST_ORDERS_RESPONSE           = UNKNOWN_OPCODE,
    SMSG_CRAFTING_ORDER_REJECT_RESULT                  = UNKNOWN_OPCODE,
    SMSG_CRAFTING_ORDER_RELEASE_RESULT                 = UNKNOWN_OPCODE,
    SMSG_CRAFTING_ORDER_UPDATE_STATE                   = UNKNOWN_OPCODE,
    SMSG_CRAFT_ENCHANT_RESULT                          = UNKNOWN_OPCODE,
    SMSG_CREATE_CHAR                                   = 0x4601AF,
    SMSG_CREATE_SHIPMENT_RESPONSE                      = UNKNOWN_OPCODE,
    SMSG_CREATOR_VISUALS_OVERRIDE                      = UNKNOWN_OPCODE,
    SMSG_CRITERIA_DELETED                              = 0x460195, // TODO(verify): low-confidence match
    SMSG_CRITERIA_UPDATE                               = 0x46018F, // TODO(verify): low-confidence match
    SMSG_CROSSED_INEBRIATION_THRESHOLD                 = 0x460170, // TODO(verify): low-confidence match
    SMSG_CURRENCY_TRANSFER_LOG                         = 0x46034D, // TODO(verify): low-confidence match
    SMSG_CUSTOM_LOAD_SCREEN                            = 0x46006F, // TODO(verify): low-confidence match
    SMSG_DAILY_QUESTS_RESET                            = UNKNOWN_OPCODE,
    SMSG_DAMAGE_CALC_LOG                               = 0x50004F, // TODO(verify): low-confidence match
    SMSG_DB_REPLY                                      = 0x4A0000, // TODO(verify): low-confidence match
    SMSG_DEATH_RELEASE_LOC                             = 0x460181, // TODO(verify): low-confidence match
    SMSG_DEBUG_MENU_MANAGER_FULL_UPDATE                = 0x460101, // TODO(verify): low-confidence match
    SMSG_DEFENSE_MESSAGE                               = 0x4B000C, // TODO(verify): low-confidence match
    SMSG_DELETE_CHAR                                   = 0x4601B0,
    SMSG_DELETE_EXPIRED_MISSIONS_RESULT                = UNKNOWN_OPCODE,
    SMSG_DESTROY_ARENA_UNIT                            = 0x4601F0, // TODO(verify): low-confidence match
    SMSG_DESTRUCTIBLE_BUILDING_DAMAGE                  = 0x4601A7, // TODO(verify): low-confidence match
    SMSG_DIFFERENT_INSTANCE_FROM_PARTY                 = 0x46002A, // TODO(verify): low-confidence match
    SMSG_DISENCHANT_CREDIT                             = 0x46004A, // TODO(verify): low-confidence match
    SMSG_DISMOUNT                                      = 0x46015F, // TODO(verify): low-confidence match
    SMSG_DISMOUNT_RESULT                               = 0x460010, // TODO(verify): low-confidence match
    SMSG_DISPEL_FAILED                                 = 0x50001D, // TODO(verify): low-confidence match
    SMSG_DISPLAY_GAME_ERROR                            = 0x460040, // TODO(verify): low-confidence match
    SMSG_DISPLAY_PLAYER_CHOICE                         = UNKNOWN_OPCODE,
    SMSG_DISPLAY_PROMOTION                             = 0x4600F6, // TODO(verify): low-confidence match
    SMSG_DISPLAY_QUEST_POPUP                           = UNKNOWN_OPCODE,
    SMSG_DISPLAY_SOULBIND_UPDATE_MESSAGE               = UNKNOWN_OPCODE,
    SMSG_DISPLAY_TOAST                                 = 0x4600CE, // TODO(verify): low-confidence match
    SMSG_DISPLAY_WORLD_TEXT                            = UNKNOWN_OPCODE,
    SMSG_DISPLAY_WORLD_TEXT_ON_TARGET                  = UNKNOWN_OPCODE,
    SMSG_DONT_AUTO_PUSH_SPELLS_TO_ACTION_BAR           = 0x460085, // TODO(verify): low-confidence match
    SMSG_DROP_NEW_CONNECTION                           = 0x4D0007, // TODO(verify): low-confidence match
    SMSG_DUEL_ARRANGED                                 = 0x4C001F, // TODO(verify): low-confidence match
    SMSG_DUEL_COMPLETE                                 = 0x4C0023, // TODO(verify): low-confidence match
    SMSG_DUEL_COUNTDOWN                                = 0x4C0022, // TODO(verify): low-confidence match
    SMSG_DUEL_IN_BOUNDS                                = 0x4C0021, // TODO(verify): low-confidence match
    SMSG_DUEL_OUT_OF_BOUNDS                            = 0x4C0020, // TODO(verify): low-confidence match
    SMSG_DUEL_REQUESTED                                = 0x4C001E, // TODO(verify): low-confidence match
    SMSG_DUEL_WINNER                                   = 0x4C0024, // TODO(verify): low-confidence match
    SMSG_DURABILITY_DAMAGE_DEATH                       = 0x4601F3, // TODO(verify): low-confidence match
    SMSG_EMOTE                                         = 0x460277, // TODO(verify): low-confidence match
    SMSG_ENABLE_BARBER_SHOP                            = 0x46016A, // TODO(verify): low-confidence match
    SMSG_ENCHANTMENT_LOG                               = 0x4601C2, // TODO(verify): low-confidence match
    SMSG_ENCOUNTER_END                                 = 0x460231, // TODO(verify): low-confidence match
    SMSG_ENCOUNTER_START                               = 0x460230, // TODO(verify): low-confidence match
    SMSG_END_LIGHTNING_STORM                           = 0x460156, // TODO(verify): low-confidence match
    SMSG_ENSURE_WORLD_LOADED                           = UNKNOWN_OPCODE,
    SMSG_ENTER_ENCRYPTED_MODE                          = 0x4D0004,
    SMSG_ENUM_CHARACTERS_RESULT                        = 0x460018,
    SMSG_ENUM_VAS_PURCHASE_STATES_RESPONSE             = 0x4602A1, // TODO(verify): low-confidence match
    SMSG_ENVIRONMENTAL_DAMAGE_LOG                      = 0x50000C, // TODO(verify): low-confidence match
    SMSG_EQUIPMENT_SET_ID                              = 0x460160, // TODO(verify): low-confidence match
    SMSG_EXPECTED_SPAM_RECORDS                         = 0x4B0005, // TODO(verify): low-confidence match
    SMSG_EXPLORATION_EXPERIENCE                        = 0x46020D, // TODO(verify): low-confidence match
    SMSG_EXTERNAL_TRANSACTION_ID_GENERATED             = UNKNOWN_OPCODE,
    SMSG_FACTION_BONUS_INFO                            = 0x4601D3, // TODO(verify): low-confidence match
    SMSG_FAILED_PLAYER_CONDITION                       = UNKNOWN_OPCODE,
    SMSG_FAILED_QUEST_TURN_IN                          = 0x4602BF, // TODO(verify): low-confidence match
    SMSG_FEATURE_SYSTEM_STATUS                         = 0x460063,
    SMSG_FEATURE_SYSTEM_STATUS_GLUE_SCREEN             = 0x460064,
    SMSG_FEIGN_DEATH_RESISTED                          = 0x4601F2, // TODO(verify): low-confidence match
    SMSG_FISH_ESCAPED                                  = 0x46017E, // TODO(verify): low-confidence match
    SMSG_FISH_NOT_HOOKED                               = 0x46017D, // TODO(verify): low-confidence match
    SMSG_FLIGHT_SPLINE_SYNC                            = UNKNOWN_OPCODE,
    SMSG_FLUSH_COMBAT_LOG_FILE                         = 0x50000E, // TODO(verify): low-confidence match
    SMSG_FORCED_DEATH_UPDATE                           = 0x460182, // TODO(verify): low-confidence match
    SMSG_FORCE_ANIM                                    = 0x4601FF, // TODO(verify): low-confidence match
    SMSG_FORCE_ANIMATIONS                              = UNKNOWN_OPCODE,
    SMSG_FORCE_OBJECT_RELINK                           = UNKNOWN_OPCODE,
    SMSG_FORCE_RANDOM_TRANSMOG_TOAST                   = 0x460055, // TODO(verify): low-confidence match
    SMSG_FRIEND_STATUS                                 = 0x46023B, // TODO(verify): low-confidence match
    SMSG_GAIN_MAW_POWER                                = UNKNOWN_OPCODE,
    SMSG_GAME_OBJECT_ACTIVATE_ANIM_KIT                 = 0x460067, // TODO(verify): low-confidence match
    SMSG_GAME_OBJECT_BASE                              = 0x4602D7, // TODO(verify): low-confidence match
    SMSG_GAME_OBJECT_CLOSE_INTERACTION                 = 0x460322, // TODO(verify): low-confidence match
    SMSG_GAME_OBJECT_CUSTOM_ANIM                       = 0x460068, // TODO(verify): low-confidence match
    SMSG_GAME_OBJECT_DESPAWN                           = 0x460069,
    SMSG_GAME_OBJECT_INTERACTION                       = 0x460321, // TODO(verify): low-confidence match
    SMSG_GAME_OBJECT_PLAY_SPELL_VISUAL                 = 0x500038, // TODO(verify): low-confidence match
    SMSG_GAME_OBJECT_PLAY_SPELL_VISUAL_KIT             = 0x500037, // TODO(verify): low-confidence match
    SMSG_GAME_OBJECT_RESET_STATE                       = 0x4601CC, // TODO(verify): low-confidence match
    SMSG_GAME_OBJECT_SET_STATE_LOCAL                   = 0x4602B2, // TODO(verify): low-confidence match
    SMSG_GAME_OBJECT_UI_LINK                           = 0x4601C9, // TODO(verify): low-confidence match
    SMSG_GAME_SPEED_SET                                = 0x46012F, // TODO(verify): low-confidence match
    SMSG_GAME_TIME_SET                                 = 0x4601BB, // TODO(verify): low-confidence match
    SMSG_GAME_TIME_UPDATE                              = 0x4601BA, // TODO(verify): low-confidence match
    SMSG_GENERATE_RANDOM_CHARACTER_NAME_RESULT         = 0x460026, // TODO(verify): low-confidence match
    SMSG_GENERATE_SSO_TOKEN_RESPONSE                   = 0x4602CB, // TODO(verify): low-confidence match
    SMSG_GET_ACCOUNT_CHARACTER_LIST_RESULT             = 0x460213,
    SMSG_GET_LANDING_PAGE_SHIPMENTS_RESPONSE           = UNKNOWN_OPCODE,
    SMSG_GET_REALM_HIDDEN_RESULT                       = 0x460341, // TODO(verify): low-confidence match
    SMSG_GET_REMAINING_GAME_TIME_RESPONSE              = 0x460288, // TODO(verify): low-confidence match
    SMSG_GET_SELECTED_TROPHY_ID_RESPONSE               = UNKNOWN_OPCODE,
    SMSG_GET_SHIPMENTS_OF_TYPE_RESPONSE                = UNKNOWN_OPCODE,
    SMSG_GET_SHIPMENT_INFO_RESPONSE                    = UNKNOWN_OPCODE,
    SMSG_GET_TROPHY_LIST_RESPONSE                      = UNKNOWN_OPCODE,
    SMSG_GET_VAS_ACCOUNT_CHARACTER_LIST_RESULT         = 0x46029D, // TODO(verify): low-confidence match
    SMSG_GET_VAS_TRANSFER_TARGET_REALM_LIST_RESULT     = 0x46029E, // TODO(verify): low-confidence match
    SMSG_GM_PLAYER_INFO                                = UNKNOWN_OPCODE,
    SMSG_GM_REQUEST_PLAYER_INFO                        = UNKNOWN_OPCODE,
    SMSG_GM_TICKET_CASE_STATUS                         = 0x460151, // TODO(verify): low-confidence match
    SMSG_GM_TICKET_SYSTEM_STATUS                       = 0x460150, // TODO(verify): low-confidence match
    SMSG_GOD_MODE                                      = 0x4601AA, // TODO(verify): low-confidence match
    SMSG_GOSSIP_COMPLETE                               = UNKNOWN_OPCODE,
    SMSG_GOSSIP_MESSAGE                                = UNKNOWN_OPCODE,
    SMSG_GOSSIP_OPTION_NPC_INTERACTION                 = UNKNOWN_OPCODE,
    SMSG_GOSSIP_POI                                    = 0x460246, // TODO(verify): low-confidence match
    SMSG_GOSSIP_QUEST_UPDATE                           = UNKNOWN_OPCODE,
    SMSG_GOSSIP_REFRESH_OPTIONS                        = UNKNOWN_OPCODE,
    SMSG_GROUP_ACTION_THROTTLED                        = 0x46002F, // TODO(verify): low-confidence match
    SMSG_GROUP_AUTO_KICK                               = 0x460243, // TODO(verify): low-confidence match
    SMSG_GROUP_DECLINE                                 = 0x46023F, // TODO(verify): low-confidence match
    SMSG_GROUP_DESTROYED                               = 0x460242, // TODO(verify): low-confidence match
    SMSG_GROUP_NEW_LEADER                              = 0x4600D7, // TODO(verify): low-confidence match
    SMSG_GROUP_REQUEST_DECLINE                         = 0x460240, // TODO(verify): low-confidence match
    SMSG_GROUP_UNINVITE                                = 0x460241, // TODO(verify): low-confidence match
    SMSG_GUILD_ACHIEVEMENT_DELETED                     = UNKNOWN_OPCODE,
    SMSG_GUILD_ACHIEVEMENT_EARNED                      = UNKNOWN_OPCODE,
    SMSG_GUILD_ACHIEVEMENT_MEMBERS                     = UNKNOWN_OPCODE,
    SMSG_GUILD_BANK_LOG_QUERY_RESULTS                  = UNKNOWN_OPCODE,
    SMSG_GUILD_BANK_QUERY_RESULTS                      = UNKNOWN_OPCODE,
    SMSG_GUILD_BANK_REMAINING_WITHDRAW_MONEY           = UNKNOWN_OPCODE,
    SMSG_GUILD_BANK_TEXT_QUERY_RESULT                  = UNKNOWN_OPCODE,
    SMSG_GUILD_CHALLENGE_COMPLETED                     = UNKNOWN_OPCODE,
    SMSG_GUILD_CHALLENGE_UPDATE                        = UNKNOWN_OPCODE,
    SMSG_GUILD_CHANGE_NAME_RESULT                      = UNKNOWN_OPCODE,
    SMSG_GUILD_COMMAND_RESULT                          = UNKNOWN_OPCODE,
    SMSG_GUILD_CRITERIA_DELETED                        = UNKNOWN_OPCODE,
    SMSG_GUILD_CRITERIA_UPDATE                         = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_BANK_CONTENTS_CHANGED             = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_BANK_MONEY_CHANGED                = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_DISBANDED                         = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_LOG_QUERY_RESULTS                 = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_MOTD                              = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_NEW_LEADER                        = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_PLAYER_JOINED                     = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_PLAYER_LEFT                       = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_PRESENCE_CHANGE                   = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_RANKS_UPDATED                     = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_RANK_CHANGED                      = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_STATUS_CHANGE                     = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_TAB_ADDED                         = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_TAB_DELETED                       = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_TAB_MODIFIED                      = UNKNOWN_OPCODE,
    SMSG_GUILD_EVENT_TAB_TEXT_CHANGED                  = UNKNOWN_OPCODE,
    SMSG_GUILD_FLAGGED_FOR_RENAME                      = UNKNOWN_OPCODE,
    SMSG_GUILD_HARDCORE_MEMBER_DEATH                   = UNKNOWN_OPCODE,
    SMSG_GUILD_INVITE                                  = UNKNOWN_OPCODE,
    SMSG_GUILD_INVITE_DECLINED                         = UNKNOWN_OPCODE,
    SMSG_GUILD_INVITE_EXPIRED                          = UNKNOWN_OPCODE,
    SMSG_GUILD_ITEM_LOOTED_NOTIFY                      = UNKNOWN_OPCODE,
    SMSG_GUILD_KNOWN_RECIPES                           = UNKNOWN_OPCODE,
    SMSG_GUILD_MEMBERS_WITH_RECIPE                     = UNKNOWN_OPCODE,
    SMSG_GUILD_MEMBER_DAILY_RESET                      = UNKNOWN_OPCODE,
    SMSG_GUILD_MEMBER_RECIPES                          = UNKNOWN_OPCODE,
    SMSG_GUILD_MEMBER_UPDATE_NOTE                      = UNKNOWN_OPCODE,
    SMSG_GUILD_MOVED                                   = UNKNOWN_OPCODE,
    SMSG_GUILD_MOVE_STARTING                           = UNKNOWN_OPCODE,
    SMSG_GUILD_NAME_CHANGED                            = UNKNOWN_OPCODE,
    SMSG_GUILD_NEWS                                    = UNKNOWN_OPCODE,
    SMSG_GUILD_NEWS_DELETED                            = UNKNOWN_OPCODE,
    SMSG_GUILD_PARTY_STATE                             = UNKNOWN_OPCODE,
    SMSG_GUILD_PERMISSIONS_QUERY_RESULTS               = UNKNOWN_OPCODE,
    SMSG_GUILD_RANKS                                   = UNKNOWN_OPCODE,
    SMSG_GUILD_REPUTATION_REACTION_CHANGED             = UNKNOWN_OPCODE,
    SMSG_GUILD_RESET                                   = UNKNOWN_OPCODE,
    SMSG_GUILD_REWARD_LIST                             = UNKNOWN_OPCODE,
    SMSG_GUILD_ROSTER                                  = UNKNOWN_OPCODE,
    SMSG_GUILD_ROSTER_UPDATE                           = UNKNOWN_OPCODE,
    SMSG_GUILD_SEND_RANK_CHANGE                        = UNKNOWN_OPCODE,
    SMSG_HARDCORE_DEATH_ALERT                          = 0x460349, // TODO(verify): low-confidence match
    SMSG_HEALTH_UPDATE                                 = 0x46017F, // TODO(verify): low-confidence match
    SMSG_HIGHEST_THREAT_UPDATE                         = 0x460187, // TODO(verify): low-confidence match
    SMSG_HOTFIX_CONNECT                                = 0x4A0003, // TODO(verify): low-confidence match
    SMSG_HOTFIX_MESSAGE                                = 0x4A0002, // TODO(verify): low-confidence match
    SMSG_INITIALIZE_FACTIONS                           = 0x4601D2, // TODO(verify): low-confidence match
    SMSG_INITIAL_SETUP                                 = 0x460014, // TODO(verify): low-confidence match
    SMSG_INIT_WORLD_STATES                             = 0x4601F4, // TODO(verify): low-confidence match
    SMSG_INSPECT_HONOR_STATS                           = 0x4C0011, // TODO(verify): low-confidence match
    SMSG_INSPECT_PVP                                   = 0x4601D0, // TODO(verify): low-confidence match
    SMSG_INSPECT_RESULT                                = 0x4600DB, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_CHANGE_PRIORITY            = 0x460260, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_DISENGAGE_UNIT             = 0x46025F, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_END                        = 0x460268, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_ENGAGE_UNIT                = 0x46025E, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_GAIN_COMBAT_RESURRECTION_CHARGE = 0x46026A, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_IN_COMBAT_RESURRECTION     = 0x460269, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_OBJECTIVE_COMPLETE         = 0x460263, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_OBJECTIVE_START            = 0x460262, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_OBJECTIVE_UPDATE           = 0x460267, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_PHASE_SHIFT_CHANGED        = 0x46026B, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_START                      = 0x460264, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_TIMER_START                = 0x460261, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_UPDATE_ALLOW_RELEASE_IN_PROGRESS = 0x460266, // TODO(verify): low-confidence match
    SMSG_INSTANCE_ENCOUNTER_UPDATE_SUPPRESS_RELEASE    = 0x460265, // TODO(verify): low-confidence match
    SMSG_INSTANCE_GROUP_SIZE_CHANGED                   = 0x4601A8, // TODO(verify): low-confidence match
    SMSG_INSTANCE_INFO                                 = 0x4600DE, // TODO(verify): low-confidence match
    SMSG_INSTANCE_RESET                                = 0x460134, // TODO(verify): low-confidence match
    SMSG_INSTANCE_RESET_FAILED                         = 0x460135, // TODO(verify): low-confidence match
    SMSG_INSTANCE_SAVE_CREATED                         = 0x46022F, // TODO(verify): low-confidence match
    SMSG_INTERRUPT_POWER_REGEN                         = 0x500046, // TODO(verify): low-confidence match
    SMSG_INVALIDATE_PAGE_TEXT                          = 0x4A000A, // TODO(verify): low-confidence match
    SMSG_INVALIDATE_PLAYER                             = UNKNOWN_OPCODE,
    SMSG_INVALID_PROMOTION_CODE                        = 0x460201, // TODO(verify): low-confidence match
    SMSG_INVENTORY_CHANGE_FAILURE                      = UNKNOWN_OPCODE,
    SMSG_INVENTORY_FIXUP_COMPLETE                      = 0x4602C1, // TODO(verify): low-confidence match
    SMSG_INVENTORY_FULL_OVERFLOW                       = 0x4602D3, // TODO(verify): low-confidence match
    SMSG_ISLAND_AZERITE_GAIN                           = 0x46020A, // TODO(verify): low-confidence match
    SMSG_ISLAND_COMPLETE                               = 0x46020B, // TODO(verify): low-confidence match
    SMSG_IS_QUEST_COMPLETE_RESPONSE                    = UNKNOWN_OPCODE,
    SMSG_ITEM_CHANGED                                  = 0x460199, // TODO(verify): low-confidence match
    SMSG_ITEM_COOLDOWN                                 = 0x460276, // TODO(verify): low-confidence match
    SMSG_ITEM_ENCHANT_TIME_UPDATE                      = 0x460203, // TODO(verify): low-confidence match
    SMSG_ITEM_EXPIRE_PURCHASE_REFUND                   = 0x46003F, // TODO(verify): low-confidence match
    SMSG_ITEM_INTERACTION_COMPLETE                     = UNKNOWN_OPCODE,
    SMSG_ITEM_PURCHASE_REFUND_RESULT                   = 0x46003D, // TODO(verify): low-confidence match
    SMSG_ITEM_PUSH_RESULT                              = 0x4600CD, // TODO(verify): low-confidence match
    SMSG_ITEM_TIME_UPDATE                              = 0x460202, // TODO(verify): low-confidence match
    SMSG_KICK_REASON                                   = 0x460137, // TODO(verify): low-confidence match
    SMSG_LATENCY_REPORT_PING                           = 0x46031B, // TODO(verify): low-confidence match
    SMSG_LEARNED_SPELLS                                = 0x50003A, // TODO(verify): low-confidence match
    SMSG_LEARN_PVP_TALENT_FAILED                       = 0x460078, // TODO(verify): low-confidence match
    SMSG_LEARN_TALENT_FAILED                           = 0x460077, // TODO(verify): low-confidence match
    SMSG_LEGACY_LOOT_RULES                             = 0x4602D8, // TODO(verify): low-confidence match
    SMSG_LEVEL_LINKING_RESULT                          = UNKNOWN_OPCODE,
    SMSG_LEVEL_UP_INFO                                 = 0x460197, // TODO(verify): low-confidence match
    SMSG_LFG_BOOT_PLAYER                               = UNKNOWN_OPCODE,
    SMSG_LFG_DISABLED                                  = UNKNOWN_OPCODE,
    SMSG_LFG_EXPAND_SEARCH_PROMPT                      = UNKNOWN_OPCODE,
    SMSG_LFG_INSTANCE_SHUTDOWN_COUNTDOWN               = UNKNOWN_OPCODE,
    SMSG_LFG_JOIN_RESULT                               = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_APPLICANT_LIST_UPDATE                = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_APPLICATION_STATUS_UPDATE            = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_APPLY_TO_GROUP_RESULT                = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_JOIN_RESULT                          = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_SEARCH_RESULTS                       = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_SEARCH_RESULTS_UPDATE                = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_SEARCH_STATUS                        = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_UPDATE_BLACKLIST                     = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_UPDATE_EXPIRATION                    = UNKNOWN_OPCODE,
    SMSG_LFG_LIST_UPDATE_STATUS                        = UNKNOWN_OPCODE,
    SMSG_LFG_OFFER_CONTINUE                            = UNKNOWN_OPCODE,
    SMSG_LFG_PARTY_INFO                                = UNKNOWN_OPCODE,
    SMSG_LFG_PLAYER_INFO                               = UNKNOWN_OPCODE,
    SMSG_LFG_PLAYER_REWARD                             = UNKNOWN_OPCODE,
    SMSG_LFG_PROPOSAL_UPDATE                           = UNKNOWN_OPCODE,
    SMSG_LFG_QUEUE_STATUS                              = UNKNOWN_OPCODE,
    SMSG_LFG_READY_CHECK_RESULT                        = UNKNOWN_OPCODE,
    SMSG_LFG_READY_CHECK_UPDATE                        = UNKNOWN_OPCODE,
    SMSG_LFG_ROLE_CHECK_UPDATE                         = UNKNOWN_OPCODE,
    SMSG_LFG_SLOT_INVALID                              = UNKNOWN_OPCODE,
    SMSG_LFG_TELEPORT_DENIED                           = UNKNOWN_OPCODE,
    SMSG_LFG_UPDATE_STATUS                             = UNKNOWN_OPCODE,
    SMSG_LIVE_REGION_ACCOUNT_RESTORE_RESULT            = 0x460221, // TODO(verify): low-confidence match
    SMSG_LIVE_REGION_CHARACTER_COPY_RESULT             = 0x460220, // TODO(verify): low-confidence match
    SMSG_LIVE_REGION_GET_ACCOUNT_CHARACTER_LIST_RESULT = 0x460214,
    SMSG_LIVE_REGION_KEY_BINDINGS_COPY_RESULT          = UNKNOWN_OPCODE,
    SMSG_LOAD_CUF_PROFILES                             = 0x460060, // TODO(verify): low-confidence match
    SMSG_LOAD_EQUIPMENT_SET                            = 0x4601BD, // TODO(verify): low-confidence match
    SMSG_LOBBY_MATCHMAKER_LOBBY_ACQUIRED_SERVER        = 0x460324, // TODO(verify): low-confidence match
    SMSG_LOBBY_MATCHMAKER_PARTY_INFO                   = 0x460325, // TODO(verify): low-confidence match
    SMSG_LOBBY_MATCHMAKER_PARTY_INVITE_REJECTED        = 0x460326, // TODO(verify): low-confidence match
    SMSG_LOBBY_MATCHMAKER_QUEUE_PROPOSED               = 0x460328, // TODO(verify): low-confidence match
    SMSG_LOBBY_MATCHMAKER_QUEUE_RESULT                 = 0x460329, // TODO(verify): low-confidence match
    SMSG_LOBBY_MATCHMAKER_RECEIVE_INVITE               = 0x460327, // TODO(verify): low-confidence match
    SMSG_LOGIN_SET_TIME_SPEED                          = 0x4601BC, // TODO(verify): low-confidence match
    SMSG_LOGIN_VERIFY_WORLD                            = 0x46003A, // TODO(verify): low-confidence match
    SMSG_LOGOUT_CANCEL_ACK                             = 0x460133, // TODO(verify): low-confidence match
    SMSG_LOGOUT_COMPLETE                               = 0x460132, // TODO(verify): low-confidence match
    SMSG_LOGOUT_RESPONSE                               = 0x460131, // TODO(verify): low-confidence match
    SMSG_LOG_XP_GAIN                                   = 0x460193, // TODO(verify): low-confidence match
    SMSG_LOOT_ALL_PASSED                               = 0x4600CB, // TODO(verify): low-confidence match
    SMSG_LOOT_LIST                                     = 0x4601EF, // TODO(verify): low-confidence match
    SMSG_LOOT_MONEY_NOTIFY                             = 0x4600C6, // TODO(verify): low-confidence match
    SMSG_LOOT_RELEASE                                  = 0x4600C5, // TODO(verify): low-confidence match
    SMSG_LOOT_RELEASE_ALL                              = 0x4600C4, // TODO(verify): low-confidence match
    SMSG_LOOT_REMOVED                                  = 0x4600BF, // TODO(verify): low-confidence match
    SMSG_LOOT_RESPONSE                                 = 0x4600BE, // TODO(verify): low-confidence match
    SMSG_LOOT_ROLL                                     = 0x4600C8, // TODO(verify): low-confidence match
    SMSG_LOOT_ROLLS_COMPLETE                           = 0x4600CA, // TODO(verify): low-confidence match
    SMSG_LOOT_ROLL_WON                                 = 0x4600CC, // TODO(verify): low-confidence match
    SMSG_LOSS_OF_CONTROL_AURA_UPDATE                   = 0x46011C, // TODO(verify): low-confidence match
    SMSG_MAIL_COMMAND_RESULT                           = 0x4600E5, // TODO(verify): low-confidence match
    SMSG_MAIL_LIST_RESULT                              = 0x460204, // TODO(verify): low-confidence match
    SMSG_MAIL_QUERY_NEXT_TIME_RESULT                   = 0x460205, // TODO(verify): low-confidence match
    SMSG_MAP_OBJECTIVES_INIT                           = 0x4C002E, // TODO(verify): low-confidence match
    SMSG_MAP_OBJ_EVENTS                                = 0x46006A, // TODO(verify): low-confidence match
    SMSG_MASTER_LOOT_CANDIDATE_LIST                    = 0x4600C9, // TODO(verify): low-confidence match
    SMSG_MEETING_STONE_FAILED                          = UNKNOWN_OPCODE,
    SMSG_MESSAGE_BOX                                   = 0x46000A, // TODO(verify): low-confidence match
    SMSG_MINIMAP_PING                                  = 0x46017C, // TODO(verify): low-confidence match
    SMSG_MIRROR_IMAGE_COMPONENTED_DATA                 = 0x500002, // TODO(verify): low-confidence match
    SMSG_MIRROR_IMAGE_CREATURE_DATA                    = 0x500001, // TODO(verify): low-confidence match
    SMSG_MISSILE_CANCEL                                = 0x46006B, // TODO(verify): low-confidence match
    SMSG_MODIFY_COOLDOWN                               = 0x460216, // TODO(verify): low-confidence match
    SMSG_MOTD                                          = 0x4B0003, // TODO(verify): low-confidence match
    SMSG_MOUNT_RESULT                                  = 0x46000F, // TODO(verify): low-confidence match
    SMSG_MOVEMENT_ENFORCEMENT_ALERT                    = 0x4602DE, // TODO(verify): low-confidence match
    SMSG_MOVE_ADD_IMPULSE                              = UNKNOWN_OPCODE,
    SMSG_MOVE_APPLY_INERTIA                            = UNKNOWN_OPCODE,
    SMSG_MOVE_APPLY_MOVEMENT_FORCE                     = UNKNOWN_OPCODE,
    SMSG_MOVE_DISABLE_COLLISION                        = UNKNOWN_OPCODE,
    SMSG_MOVE_DISABLE_DOUBLE_JUMP                      = UNKNOWN_OPCODE,
    SMSG_MOVE_DISABLE_GRAVITY                          = UNKNOWN_OPCODE,
    SMSG_MOVE_DISABLE_INERTIA                          = UNKNOWN_OPCODE,
    SMSG_MOVE_DISABLE_TRANSITION_BETWEEN_SWIM_AND_FLY  = UNKNOWN_OPCODE,
    SMSG_MOVE_ENABLE_COLLISION                         = UNKNOWN_OPCODE,
    SMSG_MOVE_ENABLE_DOUBLE_JUMP                       = UNKNOWN_OPCODE,
    SMSG_MOVE_ENABLE_GRAVITY                           = UNKNOWN_OPCODE,
    SMSG_MOVE_ENABLE_INERTIA                           = UNKNOWN_OPCODE,
    SMSG_MOVE_ENABLE_TRANSITION_BETWEEN_SWIM_AND_FLY   = UNKNOWN_OPCODE,
    SMSG_MOVE_KNOCK_BACK                               = UNKNOWN_OPCODE,
    SMSG_MOVE_REMOVE_INERTIA                           = UNKNOWN_OPCODE,
    SMSG_MOVE_REMOVE_MOVEMENT_FORCE                    = UNKNOWN_OPCODE,
    SMSG_MOVE_ROOT                                     = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ACTIVE_MOVER                         = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_ADD_IMPULSE_MAX_SPEED     = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_AIR_FRICTION              = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_BANKING_RATE              = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_DOUBLE_JUMP_VEL_MOD       = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_GLIDE_START_MIN_HEIGHT    = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_LAUNCH_SPEED_COEFFICIENT  = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_LIFT_COEFFICIENT          = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_MAX_VEL                   = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_OVER_MAX_DECELERATION     = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_PITCHING_RATE_DOWN        = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_PITCHING_RATE_UP          = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_SURFACE_FRICTION          = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_ADV_FLYING_TURN_VELOCITY_THRESHOLD   = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_CAN_ADV_FLY                          = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_CAN_FLY                              = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_CAN_TURN_WHILE_FALLING               = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_COLLISION_HEIGHT                     = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_COMPOUND_STATE                       = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_FEATHER_FALL                         = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_FLIGHT_BACK_SPEED                    = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_FLIGHT_SPEED                         = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_HOVERING                             = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_IGNORE_MOVEMENT_FORCES               = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_LAND_WALK                            = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_MOD_MOVEMENT_FORCE_MAGNITUDE         = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_NORMAL_FALL                          = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_PITCH_RATE                           = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_RUN_BACK_SPEED                       = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_RUN_SPEED                            = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_SWIM_BACK_SPEED                      = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_SWIM_SPEED                           = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_TURN_RATE                            = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_VEHICLE_REC_ID                       = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_WALK_SPEED                           = UNKNOWN_OPCODE,
    SMSG_MOVE_SET_WATER_WALK                           = UNKNOWN_OPCODE,
    SMSG_MOVE_SKIP_TIME                                = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_DISABLE_COLLISION                 = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_DISABLE_GRAVITY                   = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_ENABLE_COLLISION                  = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_ENABLE_GRAVITY                    = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_ROOT                              = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_FEATHER_FALL                  = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_FLIGHT_BACK_SPEED             = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_FLIGHT_SPEED                  = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_FLYING                        = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_HOVER                         = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_LAND_WALK                     = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_NORMAL_FALL                   = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_PITCH_RATE                    = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_RUN_BACK_SPEED                = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_RUN_MODE                      = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_RUN_SPEED                     = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_SWIM_BACK_SPEED               = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_SWIM_SPEED                    = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_TURN_RATE                     = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_WALK_MODE                     = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_WALK_SPEED                    = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_SET_WATER_WALK                    = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_START_SWIM                        = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_STOP_SWIM                         = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_UNROOT                            = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_UNSET_FLYING                      = UNKNOWN_OPCODE,
    SMSG_MOVE_SPLINE_UNSET_HOVER                       = UNKNOWN_OPCODE,
    SMSG_MOVE_TELEPORT                                 = UNKNOWN_OPCODE,
    SMSG_MOVE_UNROOT                                   = UNKNOWN_OPCODE,
    SMSG_MOVE_UNSET_CAN_ADV_FLY                        = UNKNOWN_OPCODE,
    SMSG_MOVE_UNSET_CAN_FLY                            = UNKNOWN_OPCODE,
    SMSG_MOVE_UNSET_CAN_TURN_WHILE_FALLING             = UNKNOWN_OPCODE,
    SMSG_MOVE_UNSET_HOVERING                           = UNKNOWN_OPCODE,
    SMSG_MOVE_UNSET_IGNORE_MOVEMENT_FORCES             = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE                                   = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_ADD_IMPULSE                       = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_APPLY_INERTIA                     = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_APPLY_MOVEMENT_FORCE              = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_COLLISION_HEIGHT                  = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_FLIGHT_BACK_SPEED                 = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_FLIGHT_SPEED                      = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_KNOCK_BACK                        = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_MOD_MOVEMENT_FORCE_MAGNITUDE      = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_PITCH_RATE                        = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_REMOVE_INERTIA                    = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_REMOVE_MOVEMENT_FORCE             = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_RUN_BACK_SPEED                    = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_RUN_SPEED                         = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_SWIM_BACK_SPEED                   = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_SWIM_SPEED                        = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_TELEPORT                          = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_TURN_RATE                         = UNKNOWN_OPCODE,
    SMSG_MOVE_UPDATE_WALK_SPEED                        = UNKNOWN_OPCODE,
    SMSG_MULTIPLE_PACKETS                              = 0x4D000D,
    SMSG_MULTI_FLOOR_LEAVE_FLOOR                       = UNKNOWN_OPCODE,
    SMSG_MULTI_FLOOR_NEW_FLOOR                         = UNKNOWN_OPCODE,
    SMSG_MYTHIC_PLUS_ALL_MAP_STATS                     = 0x4600B5, // TODO(verify): low-confidence match
    SMSG_MYTHIC_PLUS_CURRENT_AFFIXES                   = 0x4600B7, // TODO(verify): low-confidence match
    SMSG_MYTHIC_PLUS_NEW_WEEK_RECORD                   = 0x4600BB, // TODO(verify): low-confidence match
    SMSG_MYTHIC_PLUS_SEASON_DATA                       = 0x4600B6, // TODO(verify): low-confidence match
    SMSG_NEUTRAL_PLAYER_FACTION_SELECT_RESULT          = 0x460080, // TODO(verify): low-confidence match
    SMSG_NEW_DATA_BUILD                                = 0x460340, // TODO(verify): low-confidence match
    SMSG_NEW_TAXI_PATH                                 = 0x46012C, // TODO(verify): low-confidence match
    SMSG_NEW_WORLD                                     = 0x460036, // TODO(verify): low-confidence match
    SMSG_NOTIFY_DEST_LOC_SPELL_CAST                    = 0x500030, // TODO(verify): low-confidence match
    SMSG_NOTIFY_MISSILE_TRAJECTORY_COLLISION           = 0x460158, // TODO(verify): low-confidence match
    SMSG_NOTIFY_MONEY                                  = 0x46003C, // TODO(verify): low-confidence match
    SMSG_NOTIFY_RECEIVED_MAIL                          = 0x4600E6, // TODO(verify): low-confidence match
    SMSG_NPC_INTERACTION_OPEN_RESULT                   = 0x460315,
    SMSG_OFFER_PETITION_ERROR                          = 0x460164, // TODO(verify): low-confidence match
    SMSG_ON_CANCEL_EXPECTED_RIDE_VEHICLE_AURA          = 0x460194, // TODO(verify): low-confidence match
    SMSG_ON_MONSTER_MOVE                               = UNKNOWN_OPCODE,
    SMSG_OPEN_CONTAINER                                = UNKNOWN_OPCODE,
    SMSG_OPEN_LFG_DUNGEON_FINDER                       = UNKNOWN_OPCODE,
    SMSG_OPEN_SHIPMENT_NPC_RESULT                      = UNKNOWN_OPCODE,
    SMSG_OVERRIDE_LIGHT                                = 0x460169, // TODO(verify): low-confidence match
    SMSG_PAGE_TEXT                                     = 0x4601C8, // TODO(verify): low-confidence match
    SMSG_PARTY_COMMAND_RESULT                          = 0x460244, // TODO(verify): low-confidence match
    SMSG_PARTY_INVITE                                  = 0x460061, // TODO(verify): low-confidence match
    SMSG_PARTY_KILL_LOG                                = 0x460208, // TODO(verify): low-confidence match
    SMSG_PARTY_MEMBER_FULL_STATE                       = 0x460207, // TODO(verify): low-confidence match
    SMSG_PARTY_MEMBER_PARTIAL_STATE                    = 0x460206, // TODO(verify): low-confidence match
    SMSG_PARTY_NOTIFY_LFG_LEADER_CHANGE                = 0x46030E, // TODO(verify): low-confidence match
    SMSG_PARTY_UPDATE                                  = 0x460098, // TODO(verify): low-confidence match
    SMSG_PAST_TIME_EVENTS                              = 0x460066, // TODO(verify): low-confidence match
    SMSG_PAUSE_MIRROR_TIMER                            = 0x4601BF, // TODO(verify): low-confidence match
    SMSG_PENDING_RAID_LOCK                             = 0x4601A6, // TODO(verify): low-confidence match
    SMSG_PERKS_PROGRAM_ACTIVITY_COMPLETE               = UNKNOWN_OPCODE,
    SMSG_PERKS_PROGRAM_ACTIVITY_UPDATE                 = UNKNOWN_OPCODE,
    SMSG_PERKS_PROGRAM_DISABLED                        = UNKNOWN_OPCODE,
    SMSG_PERKS_PROGRAM_RESULT                          = UNKNOWN_OPCODE,
    SMSG_PERKS_PROGRAM_VENDOR_UPDATE                   = UNKNOWN_OPCODE,
    SMSG_PETITION_ALREADY_SIGNED                       = 0x460042, // TODO(verify): low-confidence match
    SMSG_PETITION_RENAME_GUILD_RESPONSE                = UNKNOWN_OPCODE,
    SMSG_PETITION_SHOW_LIST                            = 0x46016D, // TODO(verify): low-confidence match
    SMSG_PETITION_SHOW_SIGNATURES                      = 0x46016E, // TODO(verify): low-confidence match
    SMSG_PETITION_SIGN_RESULTS                         = 0x4601FA, // TODO(verify): low-confidence match
    SMSG_PET_ACTION_FEEDBACK                           = 0x4601F7, // TODO(verify): low-confidence match
    SMSG_PET_ACTION_SOUND                              = 0x46014E, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_CHAT_RESTRICTED                    = 0x4600AA, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_DEBUG_QUEUE_DUMP_RESPONSE          = 0x460121, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_FINALIZE_LOCATION                  = 0x4600A3, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_FINAL_ROUND                        = 0x4600A8, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_FINISHED                           = 0x4600A9, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_FIRST_ROUND                        = 0x4600A5, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_INITIAL_UPDATE                     = 0x4600A4, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_MAX_GAME_LENGTH_WARNING            = 0x4600AB, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_PVP_CHALLENGE                      = 0x4600A2, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_QUEUE_PROPOSE_MATCH                = 0x4600E3, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_QUEUE_STATUS                       = 0x4600E4, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_REPLACEMENTS_MADE                  = 0x4600A7, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_REQUEST_FAILED                     = 0x4600A1, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_ROUND_RESULT                       = 0x4600A6, // TODO(verify): low-confidence match
    SMSG_PET_BATTLE_SLOT_UPDATES                       = 0x460090, // TODO(verify): low-confidence match
    SMSG_PET_CAST_FAILED                               = 0x500045, // TODO(verify): low-confidence match
    SMSG_PET_CLEAR_SPELLS                              = 0x500011, // TODO(verify): low-confidence match
    SMSG_PET_DISMISS_SOUND                             = 0x46014F, // TODO(verify): low-confidence match
    SMSG_PET_GOD_MODE                                  = 0x460129, // TODO(verify): low-confidence match
    SMSG_PET_GUIDS                                     = 0x4601B2, // TODO(verify): low-confidence match
    SMSG_PET_LEARNED_SPELLS                            = 0x50003C, // TODO(verify): low-confidence match
    SMSG_PET_MODE                                      = 0x460029, // TODO(verify): low-confidence match
    SMSG_PET_NAME_INVALID                              = 0x460172, // TODO(verify): low-confidence match
    SMSG_PET_NEWLY_TAMED                               = 0x460028, // TODO(verify): low-confidence match
    SMSG_PET_SPELLS_MESSAGE                            = 0x500012, // TODO(verify): low-confidence match
    SMSG_PET_STABLE_RESULT                             = 0x460035, // TODO(verify): low-confidence match
    SMSG_PET_TAME_FAILURE                              = 0x460161, // TODO(verify): low-confidence match
    SMSG_PET_UNLEARNED_SPELLS                          = 0x50003D, // TODO(verify): low-confidence match
    SMSG_PHASE_SHIFT_CHANGE                            = 0x46000C, // TODO(verify): low-confidence match
    SMSG_PLAYED_TIME                                   = 0x460183, // TODO(verify): low-confidence match
    SMSG_PLAYER_ACKNOWLEDGE_ARROW_CALLOUT              = UNKNOWN_OPCODE,
    SMSG_PLAYER_AZERITE_ITEM_EQUIPPED_STATUS_CHANGED   = UNKNOWN_OPCODE,
    SMSG_PLAYER_AZERITE_ITEM_GAINS                     = UNKNOWN_OPCODE,
    SMSG_PLAYER_BATTLEFIELD_AUTO_QUEUE                 = UNKNOWN_OPCODE,
    SMSG_PLAYER_BONUS_ROLL_FAILED                      = UNKNOWN_OPCODE,
    SMSG_PLAYER_BOUND                                  = UNKNOWN_OPCODE,
    SMSG_PLAYER_CHOICE_CLEAR                           = UNKNOWN_OPCODE,
    SMSG_PLAYER_CHOICE_DISPLAY_ERROR                   = UNKNOWN_OPCODE,
    SMSG_PLAYER_CONDITION_RESULT                       = UNKNOWN_OPCODE,
    SMSG_PLAYER_HIDE_ARROW_CALLOUT                     = UNKNOWN_OPCODE,
    SMSG_PLAYER_IS_ADVENTURE_MAP_POI_VALID             = UNKNOWN_OPCODE,
    SMSG_PLAYER_OPEN_SUBSCRIPTION_INTERSTITIAL         = UNKNOWN_OPCODE,
    SMSG_PLAYER_SAVE_GUILD_EMBLEM                      = UNKNOWN_OPCODE,
    SMSG_PLAYER_SAVE_PERSONAL_EMBLEM                   = UNKNOWN_OPCODE,
    SMSG_PLAYER_SHOW_ARROW_CALLOUT                     = UNKNOWN_OPCODE,
    SMSG_PLAYER_SHOW_GENERIC_WIDGET_DISPLAY            = UNKNOWN_OPCODE,
    SMSG_PLAYER_SHOW_PARTY_POSE_UI                     = UNKNOWN_OPCODE,
    SMSG_PLAYER_SHOW_UI_EVENT_TOAST                    = UNKNOWN_OPCODE,
    SMSG_PLAYER_SKINNED                                = UNKNOWN_OPCODE,
    SMSG_PLAYER_TUTORIAL_HIGHLIGHT_SPELL               = UNKNOWN_OPCODE,
    SMSG_PLAYER_TUTORIAL_UNHIGHLIGHT_SPELL             = UNKNOWN_OPCODE,
    SMSG_PLAYER_WORLD_PVP_QUEUE                        = UNKNOWN_OPCODE,
    SMSG_PLAY_MUSIC                                    = 0x46021B, // TODO(verify): low-confidence match
    SMSG_PLAY_OBJECT_SOUND                             = 0x46021D, // TODO(verify): low-confidence match
    SMSG_PLAY_ONE_SHOT_ANIM_KIT                        = 0x4601DF, // TODO(verify): low-confidence match
    SMSG_PLAY_ORPHAN_SPELL_VISUAL                      = 0x500034, // TODO(verify): low-confidence match
    SMSG_PLAY_SCENE                                    = 0x4600E0, // TODO(verify): low-confidence match
    SMSG_PLAY_SOUND                                    = 0x46021A, // TODO(verify): low-confidence match
    SMSG_PLAY_SPEAKERBOT_SOUND                         = 0x46021E, // TODO(verify): low-confidence match
    SMSG_PLAY_SPELL_VISUAL                             = 0x500032, // TODO(verify): low-confidence match
    SMSG_PLAY_SPELL_VISUAL_KIT                         = 0x500036, // TODO(verify): low-confidence match
    SMSG_PLAY_TIME_WARNING                             = UNKNOWN_OPCODE,
    SMSG_PONG                                          = 0x4D000A, // TODO(verify): low-confidence match
    SMSG_POWER_UPDATE                                  = 0x460180, // TODO(verify): low-confidence match
    SMSG_PRELOAD_CHILD_MAP                             = 0x46000D, // TODO(verify): low-confidence match
    SMSG_PRELOAD_WORLD                                 = 0x460037, // TODO(verify): low-confidence match
    SMSG_PREPOPULATE_NAME_CACHE                        = 0x4602E1, // TODO(verify): low-confidence match
    SMSG_PRE_RESSURECT                                 = 0x460219, // TODO(verify): low-confidence match
    SMSG_PRINT_NOTIFICATION                            = 0x46006E, // TODO(verify): low-confidence match
    SMSG_PROC_RESIST                                   = 0x460209, // TODO(verify): low-confidence match
    SMSG_PROFESSION_GOSSIP                             = UNKNOWN_OPCODE,
    SMSG_PROPOSE_LEVEL_GRANT                           = 0x46018B, // TODO(verify): low-confidence match
    SMSG_PUSH_SPELL_TO_ACTION_BAR                      = 0x50003E, // TODO(verify): low-confidence match
    SMSG_PVP_CREDIT                                    = 0x4C0028, // TODO(verify): low-confidence match
    SMSG_PVP_LOG_DATA                                  = 0x4C0012, // TODO(verify): low-confidence match
    SMSG_PVP_MATCH_COMPLETE                            = 0x4C0033, // TODO(verify): low-confidence match
    SMSG_PVP_MATCH_INITIALIZE                          = 0x4C0034, // TODO(verify): low-confidence match
    SMSG_PVP_MATCH_SET_STATE                           = 0x4C0032, // TODO(verify): low-confidence match
    SMSG_PVP_MATCH_START                               = 0x4C0031, // TODO(verify): low-confidence match
    SMSG_PVP_MATCH_STATISTICS                          = 0x4C0010, // TODO(verify): low-confidence match
    SMSG_PVP_OPTIONS_ENABLED                           = 0x4C0016, // TODO(verify): low-confidence match
    SMSG_PVP_SEASON                                    = UNKNOWN_OPCODE,
    SMSG_PVP_TIER_RECORD                               = UNKNOWN_OPCODE,
    SMSG_QUERY_ARENA_TEAM_RESPONSE                     = 0x4A0012, // TODO(verify): low-confidence match
    SMSG_QUERY_BATTLE_PET_NAME_RESPONSE                = 0x4A000C, // TODO(verify): low-confidence match
    SMSG_QUERY_CREATURE_RESPONSE                       = 0x4A0006, // TODO(verify): low-confidence match
    SMSG_QUERY_GAME_OBJECT_RESPONSE                    = 0x4A0007, // TODO(verify): low-confidence match
    SMSG_QUERY_GUILD_FOLLOW_INFO_RESPONSE              = UNKNOWN_OPCODE,
    SMSG_QUERY_GUILD_INFO_RESPONSE                     = UNKNOWN_OPCODE,
    SMSG_QUERY_ITEM_TEXT_RESPONSE                      = 0x4A0010, // TODO(verify): low-confidence match
    SMSG_QUERY_NPC_TEXT_RESPONSE                       = 0x4A0008, // TODO(verify): low-confidence match
    SMSG_QUERY_PAGE_TEXT_RESPONSE                      = 0x4A0009, // TODO(verify): low-confidence match
    SMSG_QUERY_PETITION_RESPONSE                       = 0x4A000D, // TODO(verify): low-confidence match
    SMSG_QUERY_PET_NAME_RESPONSE                       = 0x4A000B, // TODO(verify): low-confidence match
    SMSG_QUERY_PLAYER_NAMES_RESPONSE                   = UNKNOWN_OPCODE,
    SMSG_QUERY_PLAYER_NAME_BY_COMMUNITY_ID_RESPONSE    = UNKNOWN_OPCODE,
    SMSG_QUERY_QUEST_INFO_RESPONSE                     = UNKNOWN_OPCODE,
    SMSG_QUERY_REALM_GUILD_MASTER_INFO_RESPONSE        = UNKNOWN_OPCODE,
    SMSG_QUERY_TIME_RESPONSE                           = 0x460192, // TODO(verify): low-confidence match
    SMSG_QUEST_COMPLETION_NPC_RESPONSE                 = UNKNOWN_OPCODE,
    SMSG_QUEST_CONFIRM_ACCEPT                          = UNKNOWN_OPCODE,
    SMSG_QUEST_FORCE_REMOVED                           = UNKNOWN_OPCODE,
    SMSG_QUEST_GIVER_INVALID_QUEST                     = UNKNOWN_OPCODE,
    SMSG_QUEST_GIVER_OFFER_REWARD_MESSAGE              = UNKNOWN_OPCODE,
    SMSG_QUEST_GIVER_QUEST_COMPLETE                    = UNKNOWN_OPCODE,
    SMSG_QUEST_GIVER_QUEST_DETAILS                     = UNKNOWN_OPCODE,
    SMSG_QUEST_GIVER_QUEST_FAILED                      = UNKNOWN_OPCODE,
    SMSG_QUEST_GIVER_QUEST_LIST_MESSAGE                = UNKNOWN_OPCODE,
    SMSG_QUEST_GIVER_REQUEST_ITEMS                     = UNKNOWN_OPCODE,
    SMSG_QUEST_GIVER_STATUS                            = UNKNOWN_OPCODE,
    SMSG_QUEST_GIVER_STATUS_MULTIPLE                   = UNKNOWN_OPCODE,
    SMSG_QUEST_ITEM_USABILITY_RESPONSE                 = UNKNOWN_OPCODE,
    SMSG_QUEST_LOG_FULL                                = UNKNOWN_OPCODE,
    SMSG_QUEST_NON_LOG_UPDATE_COMPLETE                 = UNKNOWN_OPCODE,
    SMSG_QUEST_POI_QUERY_RESPONSE                      = UNKNOWN_OPCODE,
    SMSG_QUEST_POI_UPDATE_RESPONSE                     = UNKNOWN_OPCODE,
    SMSG_QUEST_PUSH_RESULT                             = UNKNOWN_OPCODE,
    SMSG_QUEST_SESSION_INFO_RESPONSE                   = UNKNOWN_OPCODE,
    SMSG_QUEST_SESSION_READY_CHECK                     = 0x4602F2, // TODO(verify): low-confidence match
    SMSG_QUEST_SESSION_READY_CHECK_RESPONSE            = 0x4602F3, // TODO(verify): low-confidence match
    SMSG_QUEST_SESSION_RESULT                          = 0x4602F1, // TODO(verify): low-confidence match
    SMSG_QUEST_UPDATE_ADD_CREDIT                       = UNKNOWN_OPCODE,
    SMSG_QUEST_UPDATE_ADD_CREDIT_SIMPLE                = UNKNOWN_OPCODE,
    SMSG_QUEST_UPDATE_ADD_PVP_CREDIT                   = UNKNOWN_OPCODE,
    SMSG_QUEST_UPDATE_COMPLETE                         = UNKNOWN_OPCODE,
    SMSG_QUEST_UPDATE_FAILED                           = UNKNOWN_OPCODE,
    SMSG_QUEST_UPDATE_FAILED_TIMER                     = UNKNOWN_OPCODE,
    SMSG_QUEUE_SUMMARY_UPDATE                          = 0x4602C0, // TODO(verify): low-confidence match
    SMSG_RAF_ACCOUNT_INFO                              = UNKNOWN_OPCODE,
    SMSG_RAF_ACTIVITY_STATE_CHANGED                    = UNKNOWN_OPCODE,
    SMSG_RAF_DEBUG_FRIEND_MONTHS                       = UNKNOWN_OPCODE,
    SMSG_RAID_DIFFICULTY_SET                           = 0x46025B, // TODO(verify): low-confidence match
    SMSG_RAID_GROUP_ONLY                               = 0x46025D, // TODO(verify): low-confidence match
    SMSG_RAID_INSTANCE_MESSAGE                         = 0x4B000A, // TODO(verify): low-confidence match
    SMSG_RAID_MARKERS_CHANGED                          = 0x460043, // TODO(verify): low-confidence match
    SMSG_RANDOM_ROLL                                   = 0x4600DA, // TODO(verify): low-confidence match
    SMSG_RATED_PVP_INFO                                = 0x4C000F, // TODO(verify): low-confidence match
    SMSG_READY_CHECK_COMPLETED                         = 0x46009C, // TODO(verify): low-confidence match
    SMSG_READY_CHECK_RESPONSE                          = 0x46009B, // TODO(verify): low-confidence match
    SMSG_READY_CHECK_STARTED                           = 0x46009A, // TODO(verify): low-confidence match
    SMSG_READ_ITEM_RESULT_FAILED                       = 0x460257, // TODO(verify): low-confidence match
    SMSG_READ_ITEM_RESULT_OK                           = 0x46024F, // TODO(verify): low-confidence match
    SMSG_REALM_QUERY_RESPONSE                          = 0x4A0005, // TODO(verify): low-confidence match
    SMSG_REATTACH_RESURRECT                            = 0x4601F9, // TODO(verify): low-confidence match
    SMSG_RECEIVE_PING_UNIT                             = UNKNOWN_OPCODE,
    SMSG_RECEIVE_PING_WORLD_POINT                      = UNKNOWN_OPCODE,
    SMSG_RECRAFT_ITEM_RESULT                           = UNKNOWN_OPCODE,
    SMSG_RECRUIT_A_FRIEND_FAILURE                      = 0x46016F, // TODO(verify): low-confidence match
    SMSG_REFER_A_FRIEND_EXPIRED                        = 0x4601D1, // TODO(verify): low-confidence match
    SMSG_REFORGE_RESULT                                = 0x460015, // TODO(verify): low-confidence match
    SMSG_REFRESH_COMPONENT                             = 0x4600FB, // TODO(verify): low-confidence match
    SMSG_REFRESH_SPELL_HISTORY                         = 0x500019, // TODO(verify): low-confidence match
    SMSG_REMOVE_ITEM_PASSIVE                           = 0x46004E, // TODO(verify): low-confidence match
    SMSG_REMOVE_SPELL_FROM_ACTION_BAR                  = 0x50003F, // TODO(verify): low-confidence match
    SMSG_REPLACE_TROPHY_RESPONSE                       = UNKNOWN_OPCODE,
    SMSG_REPORT_PVP_PLAYER_AFK_RESULT                  = UNKNOWN_OPCODE,
    SMSG_REQUEST_CEMETERY_LIST_RESPONSE                = 0x460030, // TODO(verify): low-confidence match
    SMSG_REQUEST_PVP_BRAWL_INFO_RESPONSE               = 0x4C0018, // TODO(verify): low-confidence match
    SMSG_REQUEST_PVP_REWARDS_RESPONSE                  = 0x4C0017, // TODO(verify): low-confidence match
    SMSG_REQUEST_SCHEDULED_PVP_INFO_RESPONSE           = 0x4C0019, // TODO(verify): low-confidence match
    SMSG_RESET_COMPRESSION_CONTEXT                     = 0x4D000B, // TODO(verify): low-confidence match
    SMSG_RESET_FAILED_NOTIFY                           = 0x460165, // TODO(verify): low-confidence match
    SMSG_RESET_LAST_LOADED_CONFIG_CVARS                = UNKNOWN_OPCODE,
    SMSG_RESET_QUEST_POI                               = UNKNOWN_OPCODE,
    SMSG_RESET_RANGED_COMBAT_TIMER                     = 0x4C0027, // TODO(verify): low-confidence match
    SMSG_RESET_WEEKLY_CURRENCY                         = 0x460009, // TODO(verify): low-confidence match
    SMSG_RESPEC_WIPE_CONFIRM                           = 0x4600BC, // TODO(verify): low-confidence match
    SMSG_RESPOND_INSPECT_ACHIEVEMENTS                  = 0x460006, // TODO(verify): low-confidence match
    SMSG_RESPONSE_PERK_PENDING_REWARDS                 = UNKNOWN_OPCODE,
    SMSG_RESPONSE_PERK_RECENT_PURCHASES                = UNKNOWN_OPCODE,
    SMSG_RESTART_GLOBAL_COOLDOWN                       = 0x50004E, // TODO(verify): low-confidence match
    SMSG_RESTRICTED_ACCOUNT_WARNING                    = UNKNOWN_OPCODE,
    SMSG_RESUME_CAST                                   = 0x500028, // TODO(verify): low-confidence match
    SMSG_RESUME_CAST_BAR                               = 0x50002B, // TODO(verify): low-confidence match
    SMSG_RESUME_COMMS                                  = 0x4D0006, // TODO(verify): low-confidence match
    SMSG_RESUME_TOKEN                                  = 0x46004C, // TODO(verify): low-confidence match
    SMSG_RESURRECT_REQUEST                             = 0x460012, // TODO(verify): low-confidence match
    SMSG_RESYNC_RUNES                                  = 0x50004C, // TODO(verify): low-confidence match
    SMSG_RETURNING_PLAYER_PROMPT                       = UNKNOWN_OPCODE,
    SMSG_RETURN_APPLICANT_LIST                         = 0x4602E5, // TODO(verify): low-confidence match
    SMSG_RETURN_RECRUITING_CLUBS                       = 0x4602E4, // TODO(verify): low-confidence match
    SMSG_ROLE_CHANGED_INFORM                           = 0x46002B, // TODO(verify): low-confidence match
    SMSG_ROLE_CHOSEN                                   = UNKNOWN_OPCODE,
    SMSG_ROLE_POLL_INFORM                              = 0x46002C, // TODO(verify): low-confidence match
    SMSG_RUNEFORGE_LEGENDARY_CRAFTING_OPEN_NPC         = UNKNOWN_OPCODE,
    SMSG_RUNE_REGEN_DEBUG                              = 0x46005A, // TODO(verify): low-confidence match
    SMSG_SCENARIO_COMPLETED                            = 0x46029A, // TODO(verify): low-confidence match
    SMSG_SCENARIO_POIS                                 = 0x4600DD, // TODO(verify): low-confidence match
    SMSG_SCENARIO_PROGRESS_UPDATE                      = 0x4600D6, // TODO(verify): low-confidence match
    SMSG_SCENARIO_SHOW_CRITERIA                        = 0x4602B0, // TODO(verify): low-confidence match
    SMSG_SCENARIO_STATE                                = 0x4600D5, // TODO(verify): low-confidence match
    SMSG_SCENARIO_UI_UPDATE                            = 0x4602AF, // TODO(verify): low-confidence match
    SMSG_SCENARIO_VACATE                               = 0x460258, // TODO(verify): low-confidence match
    SMSG_SCENE_OBJECT_EVENT                            = 0x460086, // TODO(verify): low-confidence match
    SMSG_SCENE_OBJECT_PET_BATTLE_FINAL_ROUND           = 0x46008B, // TODO(verify): low-confidence match
    SMSG_SCENE_OBJECT_PET_BATTLE_FINISHED              = 0x46008C, // TODO(verify): low-confidence match
    SMSG_SCENE_OBJECT_PET_BATTLE_FIRST_ROUND           = 0x460088, // TODO(verify): low-confidence match
    SMSG_SCENE_OBJECT_PET_BATTLE_INITIAL_UPDATE        = 0x460087, // TODO(verify): low-confidence match
    SMSG_SCENE_OBJECT_PET_BATTLE_REPLACEMENTS_MADE     = 0x46008A, // TODO(verify): low-confidence match
    SMSG_SCENE_OBJECT_PET_BATTLE_ROUND_RESULT          = 0x460089, // TODO(verify): low-confidence match
    SMSG_SCRIPT_CAST                                   = 0x500043, // TODO(verify): low-confidence match
    SMSG_SEASON_INFO                                   = 0x460065,
    SMSG_SELL_RESPONSE                                 = 0x460173, // TODO(verify): low-confidence match
    SMSG_SEND_ITEM_PASSIVES                            = 0x46004F, // TODO(verify): low-confidence match
    SMSG_SEND_KNOWN_SPELLS                             = 0x500017, // TODO(verify): low-confidence match
    SMSG_SEND_RAID_TARGET_UPDATE_ALL                   = 0x4600D8, // TODO(verify): low-confidence match
    SMSG_SEND_RAID_TARGET_UPDATE_SINGLE                = 0x4600D9, // TODO(verify): low-confidence match
    SMSG_SEND_SPELL_CHARGES                            = 0x50001A, // TODO(verify): low-confidence match
    SMSG_SEND_SPELL_HISTORY                            = 0x500018, // TODO(verify): low-confidence match
    SMSG_SEND_UNLEARN_SPELLS                           = 0x50001B, // TODO(verify): low-confidence match
    SMSG_SERVER_FIRST_ACHIEVEMENTS                     = 0x4600F8, // TODO(verify): low-confidence match
    SMSG_SERVER_TIME                                   = 0x460130, // TODO(verify): low-confidence match
    SMSG_SERVER_TIME_OFFSET                            = 0x4601C3, // TODO(verify): low-confidence match
    SMSG_SETUP_COMBAT_LOG_FILE_FLUSH                   = 0x50000D, // TODO(verify): low-confidence match
    SMSG_SETUP_CURRENCY                                = 0x460007, // TODO(verify): low-confidence match
    SMSG_SET_AI_ANIM_KIT                               = 0x4601DE, // TODO(verify): low-confidence match
    SMSG_SET_ANIM_TIER                                 = 0x4601E2, // TODO(verify): low-confidence match
    SMSG_SET_CHR_UPGRADE_TIER                          = 0x460083, // TODO(verify): low-confidence match
    SMSG_SET_CURRENCY                                  = 0x460008, // TODO(verify): low-confidence match
    SMSG_SET_DF_FAST_LAUNCH_RESULT                     = UNKNOWN_OPCODE,
    SMSG_SET_DUNGEON_DIFFICULTY                        = 0x460152, // TODO(verify): low-confidence match
    SMSG_SET_FACTION_AT_WAR                            = 0x4601AE, // TODO(verify): low-confidence match
    SMSG_SET_FACTION_NOT_VISIBLE                       = 0x4601D9, // TODO(verify): low-confidence match
    SMSG_SET_FACTION_STANDING                          = 0x4601DA, // TODO(verify): low-confidence match
    SMSG_SET_FACTION_VISIBLE                           = 0x4601D8, // TODO(verify): low-confidence match
    SMSG_SET_FLAT_SPELL_MODIFIER                       = 0x500023, // TODO(verify): low-confidence match
    SMSG_SET_FORCED_REACTIONS                          = UNKNOWN_OPCODE,
    SMSG_SET_FORGE_MASTER                              = 0x460031, // TODO(verify): low-confidence match
    SMSG_SET_ITEM_PURCHASE_DATA                        = 0x46003E, // TODO(verify): low-confidence match
    SMSG_SET_LOOT_METHOD_FAILED                        = 0x46027E, // TODO(verify): low-confidence match
    SMSG_SET_MAX_WEEKLY_QUANTITY                       = 0x460041, // TODO(verify): low-confidence match
    SMSG_SET_MELEE_ANIM_KIT                            = 0x4601E1, // TODO(verify): low-confidence match
    SMSG_SET_MOVEMENT_ANIM_KIT                         = 0x4601E0, // TODO(verify): low-confidence match
    SMSG_SET_PCT_SPELL_MODIFIER                        = 0x500024, // TODO(verify): low-confidence match
    SMSG_SET_PET_SPECIALIZATION                        = 0x4600CF, // TODO(verify): low-confidence match
    SMSG_SET_PLAYER_DECLINED_NAMES_RESULT              = UNKNOWN_OPCODE,
    SMSG_SET_PLAY_HOVER_ANIM                           = 0x46005E, // TODO(verify): low-confidence match
    SMSG_SET_PROFICIENCY                               = 0x4601E3, // TODO(verify): low-confidence match
    SMSG_SET_QUEST_REPLAY_COOLDOWN_OVERRIDE            = UNKNOWN_OPCODE,
    SMSG_SET_SHIPMENT_READY_RESPONSE                   = UNKNOWN_OPCODE,
    SMSG_SET_SPELL_CHARGES                             = 0x500016, // TODO(verify): low-confidence match
    SMSG_SET_TIME_ZONE_INFORMATION                     = 0x460124,
    SMSG_SET_VEHICLE_REC_ID                            = 0x4601A5, // TODO(verify): low-confidence match
    SMSG_SHADOWLANDS_CAPACITANCE_UPDATE                = UNKNOWN_OPCODE,
    SMSG_SHIPMENT_FACTION_UPDATE_RESULT                = UNKNOWN_OPCODE,
    SMSG_SHOW_NEUTRAL_PLAYER_FACTION_SELECT_UI         = 0x46007F, // TODO(verify): low-confidence match
    SMSG_SHOW_QUEST_COMPLETION_TEXT                    = UNKNOWN_OPCODE,
    SMSG_SHOW_TAXI_NODES                               = 0x46017B, // TODO(verify): low-confidence match
    SMSG_SHOW_TRADE_SKILL_RESPONSE                     = 0x460223, // TODO(verify): low-confidence match
    SMSG_SOCIAL_CONTRACT_REQUEST_RESPONSE              = 0x460320,
    SMSG_SOCKET_GEMS_FAILURE                           = 0x4601D6, // TODO(verify): low-confidence match
    SMSG_SOCKET_GEMS_SUCCESS                           = 0x4601D5, // TODO(verify): low-confidence match
    SMSG_SOR_START_EXPERIENCE_INCOMPLETE               = 0x460081, // TODO(verify): low-confidence match
    SMSG_SPECIAL_MOUNT_ANIM                            = 0x46014D, // TODO(verify): low-confidence match
    SMSG_SPECTATE_END                                  = 0x46033F, // TODO(verify): low-confidence match
    SMSG_SPECTATE_PLAYER                               = 0x46033E, // TODO(verify): low-confidence match
    SMSG_SPEC_INVOLUNTARILY_CHANGED                    = 0x4601C7, // TODO(verify): low-confidence match
    SMSG_SPELL_ABSORB_LOG                              = 0x50000A, // TODO(verify): low-confidence match
    SMSG_SPELL_CATEGORY_COOLDOWN                       = 0x500004, // TODO(verify): low-confidence match
    SMSG_SPELL_CHANNEL_START                           = 0x500021, // TODO(verify): low-confidence match
    SMSG_SPELL_CHANNEL_UPDATE                          = 0x500022, // TODO(verify): low-confidence match
    SMSG_SPELL_COOLDOWN                                = 0x500003, // TODO(verify): low-confidence match
    SMSG_SPELL_DAMAGE_SHIELD                           = 0x50001E, // TODO(verify): low-confidence match
    SMSG_SPELL_DELAYED                                 = 0x50002C, // TODO(verify): low-confidence match
    SMSG_SPELL_DISPELL_LOG                             = 0x500005, // TODO(verify): low-confidence match
    SMSG_SPELL_EMPOWER_SET_STAGE                       = UNKNOWN_OPCODE,
    SMSG_SPELL_EMPOWER_START                           = UNKNOWN_OPCODE,
    SMSG_SPELL_EMPOWER_UPDATE                          = UNKNOWN_OPCODE,
    SMSG_SPELL_ENERGIZE_LOG                            = 0x500007, // TODO(verify): low-confidence match
    SMSG_SPELL_EXECUTE_LOG                             = 0x50002D, // TODO(verify): low-confidence match
    SMSG_SPELL_FAILED_OTHER                            = 0x500042, // TODO(verify): low-confidence match
    SMSG_SPELL_FAILURE                                 = 0x500040, // TODO(verify): low-confidence match
    SMSG_SPELL_FAILURE_MESSAGE                         = 0x500047, // TODO(verify): low-confidence match
    SMSG_SPELL_GO                                      = 0x500026, // TODO(verify): low-confidence match
    SMSG_SPELL_HEAL_ABSORB_LOG                         = 0x500009, // TODO(verify): low-confidence match
    SMSG_SPELL_HEAL_LOG                                = 0x500008, // TODO(verify): low-confidence match
    SMSG_SPELL_INSTAKILL_LOG                           = 0x500020, // TODO(verify): low-confidence match
    SMSG_SPELL_INTERRUPT_LOG                           = 0x50000B, // TODO(verify): low-confidence match
    SMSG_SPELL_MISS_LOG                                = 0x50002E, // TODO(verify): low-confidence match
    SMSG_SPELL_NON_MELEE_DAMAGE_LOG                    = 0x50001F, // TODO(verify): low-confidence match
    SMSG_SPELL_OR_DAMAGE_IMMUNE                        = 0x50001C, // TODO(verify): low-confidence match
    SMSG_SPELL_PERIODIC_AURA_LOG                       = 0x500006, // TODO(verify): low-confidence match
    SMSG_SPELL_PREPARE                                 = 0x500025, // TODO(verify): low-confidence match
    SMSG_SPELL_START                                   = 0x500027, // TODO(verify): low-confidence match
    SMSG_SPELL_VISUAL_LOAD_SCREEN                      = 0x460070, // TODO(verify): low-confidence match
    SMSG_SPLASH_SCREEN_SHOW_LATEST                     = UNKNOWN_OPCODE,
    SMSG_STAND_STATE_UPDATE                            = 0x4601CB, // TODO(verify): low-confidence match
    SMSG_STARTER_BUILD_ACTIVATE_FAILED                 = UNKNOWN_OPCODE,
    SMSG_START_ELAPSED_TIMER                           = 0x4600AC, // TODO(verify): low-confidence match
    SMSG_START_ELAPSED_TIMERS                          = 0x4600AE, // TODO(verify): low-confidence match
    SMSG_START_LIGHTNING_STORM                         = 0x460155, // TODO(verify): low-confidence match
    SMSG_START_LOOT_ROLL                               = 0x4600C7, // TODO(verify): low-confidence match
    SMSG_START_MIRROR_TIMER                            = 0x4601BE, // TODO(verify): low-confidence match
    SMSG_START_TIMER                                   = 0x460048, // TODO(verify): low-confidence match
    SMSG_STOP_ELAPSED_TIMER                            = 0x4600AD, // TODO(verify): low-confidence match
    SMSG_STOP_MIRROR_TIMER                             = 0x4601C0, // TODO(verify): low-confidence match
    SMSG_STOP_SPEAKERBOT_SOUND                         = 0x46021F, // TODO(verify): low-confidence match
    SMSG_STOP_TIMER                                    = UNKNOWN_OPCODE,
    SMSG_STREAMING_MOVIES                              = 0x460047, // TODO(verify): low-confidence match
    SMSG_SUGGEST_INVITE_INFORM                         = 0x460245, // TODO(verify): low-confidence match
    SMSG_SUMMON_CANCEL                                 = 0x46015E, // TODO(verify): low-confidence match
    SMSG_SUMMON_RAID_MEMBER_VALIDATE_FAILED            = 0x46002E, // TODO(verify): low-confidence match
    SMSG_SUMMON_REQUEST                                = 0x4601CF, // TODO(verify): low-confidence match
    SMSG_SUPERCEDED_SPELLS                             = 0x500039, // TODO(verify): low-confidence match
    SMSG_SUSPEND_COMMS                                 = 0x4D0005, // TODO(verify): low-confidence match
    SMSG_SUSPEND_TOKEN                                 = 0x46004B, // TODO(verify): low-confidence match
    SMSG_SYNC_WOW_ENTITLEMENTS                         = 0x460302, // TODO(verify): low-confidence match
    SMSG_TALENTS_INVOLUNTARILY_RESET                   = 0x4601C6, // TODO(verify): low-confidence match
    SMSG_TALENT_GROUP_ROLE_CHANGED                     = 0x46002D, // TODO(verify): low-confidence match
    SMSG_TAXI_NODE_STATUS                              = 0x46012A, // TODO(verify): low-confidence match
    SMSG_TEXT_EMOTE                                    = 0x460128, // TODO(verify): low-confidence match
    SMSG_THREAT_CLEAR                                  = 0x46018A, // TODO(verify): low-confidence match
    SMSG_THREAT_REMOVE                                 = 0x460189, // TODO(verify): low-confidence match
    SMSG_THREAT_UPDATE                                 = 0x460188, // TODO(verify): low-confidence match
    SMSG_TIME_ADJUSTMENT                               = UNKNOWN_OPCODE,
    SMSG_TIME_SYNC_REQUEST                             = UNKNOWN_OPCODE,
    SMSG_TITLE_EARNED                                  = 0x460185, // TODO(verify): low-confidence match
    SMSG_TITLE_LOST                                    = 0x460186, // TODO(verify): low-confidence match
    SMSG_TOTEM_CREATED                                 = 0x460176, // TODO(verify): low-confidence match
    SMSG_TOTEM_DURATION_CHANGED                        = UNKNOWN_OPCODE,
    SMSG_TOTEM_MOVED                                   = 0x460178, // TODO(verify): low-confidence match
    SMSG_TOTEM_REMOVED                                 = UNKNOWN_OPCODE,
    SMSG_TRADE_STATUS                                  = 0x460017, // TODO(verify): low-confidence match
    SMSG_TRADE_UPDATED                                 = 0x460016, // TODO(verify): low-confidence match
    SMSG_TRAINER_BUY_FAILED                            = 0x46018E, // TODO(verify): low-confidence match
    SMSG_TRAINER_LIST                                  = 0x46018D, // TODO(verify): low-confidence match
    SMSG_TRAIT_CONFIG_COMMIT_FAILED                    = 0x460075, // TODO(verify): low-confidence match
    SMSG_TRANSFER_ABORTED                              = 0x4601B1, // TODO(verify): low-confidence match
    SMSG_TRANSFER_PENDING                              = 0x460071, // TODO(verify): low-confidence match
    SMSG_TREASURE_PICKER_RESPONSE                      = 0x4A0011, // TODO(verify): low-confidence match
    SMSG_TRIGGER_CINEMATIC                             = 0x460278, // TODO(verify): low-confidence match
    SMSG_TRIGGER_MOVIE                                 = 0x460179, // TODO(verify): low-confidence match
    SMSG_TURN_IN_PETITION_RESULT                       = 0x4601FC, // TODO(verify): low-confidence match
    SMSG_TUTORIAL_FLAGS                                = 0x46026C, // TODO(verify): low-confidence match
    SMSG_UI_ACTION                                     = 0x46021C, // TODO(verify): low-confidence match
    SMSG_UI_MAP_QUEST_LINES_RESPONSE                   = UNKNOWN_OPCODE,
    SMSG_UNDELETE_CHARACTER_RESPONSE                   = 0x460279, // TODO(verify): low-confidence match
    SMSG_UNDELETE_COOLDOWN_STATUS_RESPONSE             = 0x46027A, // TODO(verify): low-confidence match
    SMSG_UNLEARNED_SPELLS                              = 0x50003B, // TODO(verify): low-confidence match
    SMSG_UNLOAD_CHILD_MAP                              = 0x46000E, // TODO(verify): low-confidence match
    SMSG_UPDATE_AADC_STATUS_RESPONSE                   = 0x46031D, // TODO(verify): low-confidence match
    SMSG_UPDATE_ACCOUNT_DATA                           = 0x4601B7, // TODO(verify): low-confidence match
    SMSG_UPDATE_ACCOUNT_DATA_COMPLETE                  = 0x4601B8, // TODO(verify): low-confidence match
    SMSG_UPDATE_ACTION_BUTTONS                         = 0x460084, // TODO(verify): low-confidence match
    SMSG_UPDATE_BNET_SESSION_KEY                       = 0x4602D2, // TODO(verify): low-confidence match
    SMSG_UPDATE_CAPTURE_POINT                          = 0x4C0007, // TODO(verify): low-confidence match
    SMSG_UPDATE_CELESTIAL_BODY                         = 0x4602CE, // TODO(verify): low-confidence match
    SMSG_UPDATE_CHARACTER_FLAGS                        = 0x460272, // TODO(verify): low-confidence match
    SMSG_UPDATE_CHARGE_CATEGORY_COOLDOWN               = 0x460218, // TODO(verify): low-confidence match
    SMSG_UPDATE_CLASSIC_TALENT_DATA                    = 0x46007B, // TODO(verify): low-confidence match
    SMSG_UPDATE_COOLDOWN                               = 0x460217, // TODO(verify): low-confidence match
    SMSG_UPDATE_CRAFTING_NPC_RECIPES                   = UNKNOWN_OPCODE,
    SMSG_UPDATE_DAILY_MISSION_COUNTER                  = UNKNOWN_OPCODE,
    SMSG_UPDATE_EXPANSION_LEVEL                        = 0x4600F0, // TODO(verify): low-confidence match
    SMSG_UPDATE_GAME_TIME_STATE                        = 0x4602D5, // TODO(verify): low-confidence match
    SMSG_UPDATE_INSTANCE_OWNERSHIP                     = 0x460157, // TODO(verify): low-confidence match
    SMSG_UPDATE_LAST_INSTANCE                          = 0x460136, // TODO(verify): low-confidence match
    SMSG_UPDATE_OBJECT                                 = UNKNOWN_OPCODE,
    SMSG_UPDATE_PRIMARY_SPEC                           = 0x46007C, // TODO(verify): low-confidence match
    SMSG_UPDATE_RECENT_PLAYER_GUIDS                    = UNKNOWN_OPCODE,
    SMSG_UPDATE_TALENT_DATA                            = 0x46007A, // TODO(verify): low-confidence match
    SMSG_UPDATE_WORLD_STATE                            = 0x4601F6, // TODO(verify): low-confidence match
    SMSG_USERLIST_ADD                                  = 0x4B000F, // TODO(verify): low-confidence match
    SMSG_USERLIST_REMOVE                               = 0x4B0010, // TODO(verify): low-confidence match
    SMSG_USERLIST_UPDATE                               = 0x4B0011, // TODO(verify): low-confidence match
    SMSG_USE_EQUIPMENT_SET_RESULT                      = 0x4601FD, // TODO(verify): low-confidence match
    SMSG_VAS_CHECK_TRANSFER_OK_RESPONSE                = 0x4602C9, // TODO(verify): low-confidence match
    SMSG_VAS_GET_QUEUE_MINUTES_RESPONSE                = UNKNOWN_OPCODE,
    SMSG_VAS_GET_SERVICE_STATUS_RESPONSE               = UNKNOWN_OPCODE,
    SMSG_VAS_PURCHASE_COMPLETE                         = 0x4602A0, // TODO(verify): low-confidence match
    SMSG_VAS_PURCHASE_STATE_UPDATE                     = 0x46029F, // TODO(verify): low-confidence match
    SMSG_VENDOR_INVENTORY                              = 0x46005C, // TODO(verify): low-confidence match
    SMSG_VIGNETTE_UPDATE                               = UNKNOWN_OPCODE,
    SMSG_VOICE_CHANNEL_INFO_RESPONSE                   = 0x4602CD, // TODO(verify): low-confidence match
    SMSG_VOICE_CHANNEL_STT_TOKEN_RESPONSE              = 0x460318, // TODO(verify): low-confidence match
    SMSG_VOICE_LOGIN_RESPONSE                          = 0x4602CC, // TODO(verify): low-confidence match
    SMSG_VOID_ITEM_SWAP_RESPONSE                       = UNKNOWN_OPCODE,
    SMSG_VOID_STORAGE_CONTENTS                         = UNKNOWN_OPCODE,
    SMSG_VOID_STORAGE_FAILED                           = UNKNOWN_OPCODE,
    SMSG_VOID_STORAGE_TRANSFER_CHANGES                 = UNKNOWN_OPCODE,
    SMSG_VOID_TRANSFER_RESULT                          = UNKNOWN_OPCODE,
    SMSG_WAIT_QUEUE_FINISH                             = 0x460003, // TODO(verify): low-confidence match
    SMSG_WAIT_QUEUE_UPDATE                             = 0x460002,
    SMSG_WARDEN3_DATA                                  = 0x46000B, // TODO(verify): low-confidence match
    SMSG_WARDEN3_DISABLED                              = 0x4602D0, // TODO(verify): low-confidence match
    SMSG_WARDEN3_ENABLED                               = 0x4602CF, // TODO(verify): low-confidence match
    SMSG_WARFRONT_COMPLETE                             = 0x46020C, // TODO(verify): low-confidence match
    SMSG_WARGAME_REQUEST_OPPONENT_RESPONSE             = 0x4C0015, // TODO(verify): low-confidence match
    SMSG_WARGAME_REQUEST_SUCCESSFULLY_SENT_TO_OPPONENT = 0x4C0013, // TODO(verify): low-confidence match
    SMSG_WEATHER                                       = 0x460154, // TODO(verify): low-confidence match
    SMSG_WEEKLY_REWARDS_PROGRESS_RESULT                = UNKNOWN_OPCODE,
    SMSG_WEEKLY_REWARDS_RESULT                         = UNKNOWN_OPCODE,
    SMSG_WEEKLY_REWARD_CLAIM_RESULT                    = UNKNOWN_OPCODE,
    SMSG_WHO                                           = 0x4B0002, // TODO(verify): low-confidence match
    SMSG_WHO_IS                                        = 0x460153, // TODO(verify): low-confidence match
    SMSG_WILL_BE_KICKED_FOR_ADDED_SUBSCRIPTION_TIME    = 0x4602D4, // TODO(verify): low-confidence match
    SMSG_WORLD_QUEST_UPDATE_RESPONSE                   = UNKNOWN_OPCODE,
    SMSG_WORLD_SERVER_INFO                             = 0x460050, // TODO(verify): low-confidence match
    SMSG_WOW_ENTITLEMENT_NOTIFICATION                  = 0x460303, // TODO(verify): low-confidence match
    SMSG_WOW_LABS_NOTIFY_PLAYERS_MATCH_END             = 0x460330, // TODO(verify): low-confidence match
    SMSG_WOW_LABS_NOTIFY_PLAYERS_MATCH_STATE_CHANGED   = 0x460331, // TODO(verify): low-confidence match
    SMSG_WOW_LABS_PARTY_ERROR                          = UNKNOWN_OPCODE,
    SMSG_WOW_LABS_SET_PREDICTION_CIRCLE                = UNKNOWN_OPCODE,
    SMSG_XP_AWARDED_FROM_CURRENCY                      = UNKNOWN_OPCODE,
    SMSG_XP_GAIN_ABORTED                               = 0x46006D, // TODO(verify): low-confidence match
    SMSG_XP_GAIN_ENABLED                               = 0x46025C, // TODO(verify): low-confidence match
    SMSG_ZONE_UNDER_ATTACK                             = 0x4B000B, // TODO(verify): low-confidence match
};

inline constexpr std::size_t NUM_SMSG_OPCODES = 1458;

inline constexpr std::ptrdiff_t GetOpcodeArrayIndex(OpcodeServer opcode)
{
    uint32 idInGroup = opcode & 0xFFFF;
    switch (opcode >> 16)
    {
        case 0x46: return idInGroup < 896 ? idInGroup + 0 : -1;
        case 0x47: return idInGroup < 2 ? idInGroup + 896 : -1;
        case 0x4A: return idInGroup < 21 ? idInGroup + 898 : -1;
        case 0x4B: return idInGroup < 36 ? idInGroup + 919 : -1;
        case 0x4C: return idInGroup < 53 ? idInGroup + 955 : -1;
        case 0x4D: return idInGroup < 15 ? idInGroup + 1008 : -1;
        case 0x4E: return idInGroup < 12 ? idInGroup + 1023 : -1;
        case 0x50: return idInGroup < 82 ? idInGroup + 1035 : -1;
        case 0x52: return idInGroup < 72 ? idInGroup + 1117 : -1;
        case 0x54: return idInGroup < 2 ? idInGroup + 1189 : -1;
        case 0x55: return idInGroup < 12 ? idInGroup + 1191 : -1;
        case 0x56: return idInGroup < 8 ? idInGroup + 1203 : -1;
        case 0x57: return idInGroup < 8 ? idInGroup + 1211 : -1;
        case 0x58: return idInGroup < 36 ? idInGroup + 1219 : -1;
        case 0x59: return idInGroup < 8 ? idInGroup + 1255 : -1;
        case 0x5A: return idInGroup < 34 ? idInGroup + 1263 : -1;
        case 0x5C: return idInGroup < 5 ? idInGroup + 1297 : -1;
        case 0x5E: return idInGroup < 130 ? idInGroup + 1302 : -1;
        case 0x5F: return idInGroup < 6 ? idInGroup + 1432 : -1;
        case 0x60: return idInGroup < 20 ? idInGroup + 1438 : -1;
        default: return -1;
    }
}

constexpr bool IsInstanceOnlyOpcode(uint32 opcode)
{
    switch (opcode)
    {
        case SMSG_QUERY_TIME_RESPONSE: // Client
        case SMSG_MOUNT_RESULT: // Client
        case SMSG_ATTACK_START: // ClientCombat
        case SMSG_ATTACK_STOP: // ClientCombat
        case SMSG_DUEL_REQUESTED: // ClientCombat
        case SMSG_DUEL_ARRANGED: // ClientCombat
        case SMSG_DUEL_OUT_OF_BOUNDS: // ClientCombat
        case SMSG_DUEL_IN_BOUNDS: // ClientCombat
        case SMSG_DUEL_COMPLETE: // ClientCombat
        case SMSG_DUEL_WINNER: // ClientCombat
        case SMSG_QUEST_GIVER_STATUS: // ClientQuest
            return true;
        default:
            return false;
    }
}

/// Player state
enum SessionStatus
{
    STATUS_AUTHED = 0,                                      // Player authenticated (_player == NULL, m_playerRecentlyLogout = false or will be reset before handler call, m_GUID have garbage)
    STATUS_LOGGEDIN,                                        // Player in game (_player != NULL, m_GUID == _player->GetGUID(), inWorld())
    STATUS_TRANSFER,                                        // Player transferring to another map (_player != NULL, m_GUID == _player->GetGUID(), !inWorld())
    STATUS_LOGGEDIN_OR_RECENTLY_LOGGOUT,                    // _player != NULL or _player == NULL && m_playerRecentlyLogout && m_playerLogout, m_GUID store last _player guid)
    STATUS_NEVER,                                           // Opcode not accepted from client (deprecated or server side only)
    STATUS_UNHANDLED,                                       // Opcode not handled yet
    STATUS_IGNORED                                          // Opcode not handled - and no plans to handle it
};

enum PacketProcessing
{
    PROCESS_INPLACE = 0,                                    //process packet whenever we receive it - mostly for non-handled or non-implemented packets
    PROCESS_THREADUNSAFE,                                   //packet is not thread-safe - process it in World::UpdateSessions()
    PROCESS_THREADSAFE                                      //packet is thread-safe - process it in Map::Update()
};

class WorldPacket;
class WorldSession;

struct ClientOpcodeHandler final
{
    using HandlerFunction = void (*)(WorldSession* session, WorldPacket& packet);

    char const* Name;
    SessionStatus Status;
    HandlerFunction Call;
    PacketProcessing ProcessingPlace;
};

struct ServerOpcodeHandler final
{
    char const* Name;
    SessionStatus Status;
    ConnectionType ConnectionIndex;
};

template <typename OpcodeEnum>
struct FormattedOpcodeName
{
    OpcodeEnum Opcode;
};

template <>
struct fmt::formatter<FormattedOpcodeName<OpcodeClient>, char, void> : Trinity::NoArgFormatterBase
{
    template <typename FormatContext>
    typename FormatContext::iterator format(FormattedOpcodeName<OpcodeClient> const& opcode, FormatContext& ctx) const;
};

template <>
struct fmt::formatter<FormattedOpcodeName<OpcodeServer>, char, void> : Trinity::NoArgFormatterBase
{
    template <typename FormatContext>
    typename FormatContext::iterator format(FormattedOpcodeName<OpcodeServer> const& opcode, FormatContext& ctx) const;
};

/// Lookup opcode name for human understandable logging
inline constexpr FormattedOpcodeName<OpcodeClient> GetOpcodeNameForLogging(OpcodeClient opcode) { return { .Opcode = opcode }; }
inline constexpr FormattedOpcodeName<OpcodeServer> GetOpcodeNameForLogging(OpcodeServer opcode) { return { .Opcode = opcode }; }

class OpcodeTable
{
public:
    OpcodeTable();
    ~OpcodeTable();

    void Initialize();

    bool IsValid(OpcodeClient index) const
    {
        std::ptrdiff_t opcodeArrayIndex = GetOpcodeArrayIndex(index);
        return opcodeArrayIndex >= 0 && opcodeArrayIndex < std::ssize(_internalTableClient);
    }

    bool IsValid(OpcodeServer index) const
    {
        std::ptrdiff_t opcodeArrayIndex = GetOpcodeArrayIndex(index);
        return opcodeArrayIndex >= 0 && opcodeArrayIndex < std::ssize(_internalTableServer);
    }

    ClientOpcodeHandler const* operator[](OpcodeClient index) const
    {
        return _internalTableClient[GetOpcodeArrayIndex(index)].get();
    }

    ServerOpcodeHandler const* operator[](OpcodeServer index) const
    {
        return _internalTableServer[GetOpcodeArrayIndex(index)].get();
    }

private:
    bool ValidateClientOpcode(OpcodeClient opcode, char const* name) const;
    void ValidateAndSetClientOpcode(OpcodeClient opcode, char const* name, SessionStatus status, ClientOpcodeHandler::HandlerFunction call, PacketProcessing processing);

    bool ValidateServerOpcode(OpcodeServer opcode, char const* name, ConnectionType conIdx) const;
    void ValidateAndSetServerOpcode(OpcodeServer opcode, char const* name, SessionStatus status, ConnectionType conIdx);

    void InitializeClientOpcodes();
    void InitializeServerOpcodes();

    std::array<std::unique_ptr<ClientOpcodeHandler>, NUM_CMSG_OPCODES> _internalTableClient;
    std::array<std::unique_ptr<ServerOpcodeHandler>, NUM_SMSG_OPCODES> _internalTableServer;

    friend fmt::formatter<FormattedOpcodeName<OpcodeClient>, char, void>;
    friend fmt::formatter<FormattedOpcodeName<OpcodeServer>, char, void>;
};

extern OpcodeTable opcodeTable;

#endif
