// Spot-check specs: enter-world / account-data packets (TC writers transcribed).
export const specs = {};
export const fixed = {};

// HotfixPackets.cpp
specs.SMSG_DB_REPLY = (r) => { r.u32("TableHash"); r.u32("RecordID"); r.u32("Timestamp"); r.bits(3, "Status"); const n = r.u32("DataSize"); r.bytes(n, "Data"); };
specs.CMSG_DB_QUERY_BULK = (r) => { r.u32("TableHash"); const n = r.bits(13, "Count"); for (let i = 0; i < n; i++) r.u32("RecordID"); };
specs.SMSG_AVAILABLE_HOTFIXES = (r) => { r.i32("VirtualRealmAddress"); const n = r.u32("Count"); for (let i = 0; i < n; i++) { r.u32("UniqueID"); r.i32("PushID"); } };
specs.CMSG_HOTFIX_REQUEST = (r) => { r.u32("ClientBuild"); r.u32("DataBuild"); const n = r.u32("Count"); for (let i = 0; i < n; i++) r.i32("Hotfix"); };
specs.SMSG_HOTFIX_CONNECT = (r) => {
  const n = r.u32("Count");
  for (let i = 0; i < n; i++) { r.i32("PushID"); r.u32("UniqueID"); r.u32("TableHash"); r.i32("RecordID"); r.u32("Size"); r.bits(3, "Status"); }
  const c = r.u32("ContentSize"); r.bytes(c, "Content");
};

// MiscPackets.cpp:462 PhaseShiftChange
specs.SMSG_PHASE_SHIFT_CHANGE = (r) => {
  r.guid("Client"); r.u32("PhaseShiftFlags"); const np = r.u32("Phases"); r.guid("PersonalGUID"); for (let i = 0; i < np; i++) { r.u32("PhaseFlags"); r.u16("Id"); }
  for (const n of ["VisibleMapIDs", "PreloadMapIDs", "UiMapPhaseIDs"]) { const sz = r.u32(n + "Bytes"); for (let i = 0; i < sz / 2; i++) r.u16(n); }
};

// ClientConfigPackets.cpp
specs.SMSG_UPDATE_ACCOUNT_DATA = (r) => { r.u64("Time"); r.u32("Size"); r.guid("Player"); r.i32("DataType"); const n = r.u32("CompressedSize"); r.bytes(n, "Data"); };
specs.CMSG_UPDATE_ACCOUNT_DATA = specs.SMSG_UPDATE_ACCOUNT_DATA;
specs.CMSG_REQUEST_ACCOUNT_DATA = (r) => { r.guid("Player"); r.i32("DataType"); };
specs.SMSG_CACHE_VERSION = (r) => { r.u32("CacheVersion"); };

// MiscPackets / CharacterPackets / InstancePackets / QueryPackets
specs.SMSG_WEATHER = (r) => { r.u32("WeatherID"); r.f32("Intensity"); r.bit("Abrupt"); };
specs.SMSG_INSTANCE_INFO = (r) => { const n = r.i32("Locks"); for (let i = 0; i < n; i++) { r.u32("MapID"); r.u16("DifficultyID"); r.u64("InstanceID"); r.u32("TimeRemaining"); r.u32("CompletedMask"); r.bit("Locked"); r.bit("Extended"); } };
specs.CMSG_REQUEST_PLAYED_TIME = (r) => { r.bit("TriggerScriptEvent"); };
specs.SMSG_PLAYED_TIME = (r) => { r.i32("TotalTime"); r.i32("LevelTime"); r.bit("TriggerEvent"); };
specs.SMSG_QUERY_TIME_RESPONSE = (r) => { r.u64("CurrentTime"); };
specs.SMSG_UNDELETE_COOLDOWN_STATUS_RESPONSE = (r) => { r.u32("MaxCooldown"); r.u32("CurrentCooldown"); r.bit("OnCooldown"); };
specs.SMSG_CORPSE_RECLAIM_DELAY = (r) => { r.u32("Remaining"); };
specs.CMSG_LOGOUT_REQUEST = (r) => { r.bit("IdleLogout"); };
specs.SMSG_LOGOUT_RESPONSE = (r) => { r.i32("LogoutResult"); r.bit("Instant"); };
const gameMode = (r, n) => { r.i32(n + ".U0"); r.guid(n + ".Guid"); r.u8(n + ".GameMode"); r.i32(n + ".MapID"); r.u8(n + ".U1"); r.u8(n + ".U2"); r.u8(n + ".U3"); const a = r.u32(n + ".Cust"), b = r.u32(n + ".U4"); for (let i = 0; i < a + b; i++) { r.u32("Opt"); r.u32("Choice"); } };
specs.SMSG_LOGOUT_COMPLETE = (r) => { if (r.bit("HasSwitchGameMode")) { r.bit("IsFastLogin"); gameMode(r, "Cur"); gameMode(r, "New"); } };
specs.SMSG_UPDATE_ACTION_BUTTONS = (r) => { for (let i = 0; i < 180; i++) r.u64("Button"); r.u8("Reason"); };

// SocialPackets.cpp
specs.CMSG_SEND_CONTACT_LIST = (r) => { r.u32("Flags"); };
specs.SMSG_CONTACT_LIST = (r) => {
  r.u32("Flags"); const n = r.bits(8, "Count");
  for (let i = 0; i < n; i++) { r.guid("Guid"); r.guid("WowAccount"); r.u32("VRA"); r.u32("NRA"); r.u32("TypeFlags"); r.u8("Status"); r.u32("AreaID"); r.u32("Level"); r.u8("ClassID"); const l = r.bits(10, "NotesLen"); r.str(l, "Notes"); }
};

// ReputationPackets.cpp:42
specs.SMSG_INITIALIZE_FACTIONS = (r) => {
  const n = r.u32("Factions"), b = r.u32("Bonuses");
  for (let i = 0; i < n; i++) { r.i32("FactionID"); r.u16("Flags"); r.i32("Standing"); }
  for (let i = 0; i < b; i++) { r.i32("FactionID"); r.bit("HasBonus"); }
};

// EquipmentSetPackets.cpp:29
specs.SMSG_LOAD_EQUIPMENT_SET = (r) => {
  const n = r.u32("Sets");
  for (let i = 0; i < n; i++) {
    r.i32("Type"); r.u64("Guid"); r.u32("SetID"); r.u32("IgnoreMask");
    for (let k = 0; k < 19; k++) { r.guid("Piece"); r.i32("Appearance"); }
    r.i32("Enchant0"); r.i32("Enchant1"); r.i32("SecShoulderApp"); r.i32("SecShoulderSlot"); r.i32("SecWeaponApp"); r.i32("SecWeaponSlot");
    const sp = r.bit("HasSpec"), nl = r.bits(8, "NameLen"), il = r.bits(9, "IconLen");
    if (sp) r.i32("AssignedSpecIndex"); r.str(nl, "Name"); r.str(il, "Icon");
  }
};

// AchievementPackets.cpp
specs.SMSG_ALL_ACHIEVEMENT_DATA = (r) => {
  const e = r.u32("Earned"), p = r.u32("Progress");
  for (let i = 0; i < e; i++) { r.u32("Id"); r.u32("Date"); r.guid("Owner"); r.u32("VRA"); r.u32("NRA"); }
  for (let i = 0; i < p; i++) { r.u32("Id"); r.u64("Quantity"); r.guid("Player"); r.u32("Unused"); r.u32("Flags"); r.u32("Date"); r.u64("TimeFromStart"); r.u64("TimeFromCreate"); if (r.bit("HasRaf")) r.u64("RafAcceptanceID"); }
};

// MiscPackets.cpp:746 / :668, ToyPackets.cpp:30
specs.SMSG_ACCOUNT_MOUNT_UPDATE = (r) => { r.bit("IsFullUpdate"); const n = r.u32("Mounts"); for (let i = 0; i < n; i++) { r.i32("SpellID"); r.bits(4, "Flags"); } };
specs.SMSG_ACCOUNT_HEIRLOOM_UPDATE = (r) => { r.bit("IsFullUpdate"); r.u8("Unk"); const a = r.u32("Items"), b = r.u32("Flags"); for (let i = 0; i < a; i++) r.i32("Item"); for (let i = 0; i < b; i++) r.u32("Flags"); };
specs.SMSG_ACCOUNT_TOY_UPDATE = (r) => {
  r.bit("IsFullUpdate"); const a = r.i32("Ids"), b = r.i32("Favorites"), c = r.i32("Fanfare");
  for (let i = 0; i < a; i++) r.u32("Toy"); for (let i = 0; i < b; i++) r.bit("Fav"); for (let i = 0; i < c; i++) r.bit("Fanfare");
};

// MiscPackets.cpp:583
specs.SMSG_LOAD_CUF_PROFILES = (r) => {
  const n = r.u32("Profiles");
  for (let i = 0; i < n; i++) {
    const l = r.bits(7, "NameLen"); for (let k = 0; k < 23; k++) r.bit("Opt" + k);
    r.u16("FrameHeight"); r.u16("FrameWidth"); r.u8("SortBy"); r.u8("HealthText"); r.u8("TopPoint"); r.u8("BottomPoint"); r.u8("LeftPoint");
    r.u16("TopOffset"); r.u16("BottomOffset"); r.u16("LeftOffset"); r.str(l, "Name");
  }
};

// QuestPackets.cpp:443 + ItemPacketsCommon.cpp:205
const itemInstance = (r) => {
  r.i32("ItemID"); r.i32("RandomPropertiesSeed"); r.i32("RandomPropertiesID"); const hb = r.bit("HasBonus"); r.flush();
  const m = r.bits(7, "Mods"); for (let i = 0; i < m; i++) { r.u8("Mod.Type"); r.i32("Mod.Value"); }
  if (hb) { r.u8("Context"); const c = r.u32("BonusLists"); for (let i = 0; i < c; i++) r.u32("Bonus"); }
};
specs.SMSG_QUEST_GIVER_QUEST_COMPLETE = (r) => {
  r.i32("QuestID"); r.i32("XP"); r.u64("Money"); r.i32("SkillLine"); r.i32("SkillUps"); r.bit("UseQuestReward"); r.bit("LaunchGossip"); r.bit("LaunchQuest"); r.bit("HideChat");
  itemInstance(r);
};

// BattlePetPackets.cpp:63
specs.SMSG_BATTLE_PET_JOURNAL = (r) => {
  r.u16("Trap"); const s = r.u32("Slots"), p = r.u32("Pets"); r.bit("HasJournalLock");
  for (let i = 0; i < s; i++) { r.guid("Slot.Pet"); r.u32("CollarID"); r.u8("Index"); r.bit("Locked"); }
  for (let i = 0; i < p; i++) {
    r.guid("Guid"); r.u32("Species"); r.u32("CreatureID"); r.u32("DisplayID"); r.u16("Breed"); r.u16("Level"); r.u16("Exp"); r.u16("Flags");
    r.u32("Power"); r.u32("Health"); r.u32("MaxHealth"); r.u32("Speed"); r.u8("Quality");
    const nl = r.bits(7, "NameLen"); const own = r.bit("HasOwner"); r.bit("NoRename"); r.str(nl, "Name");
    if (own) { r.guid("Owner"); r.u32("VRA"); r.u32("NRA"); }
  }
};

// LFGPackets.cpp / LFGPacketsCommon.cpp
const rideTicket = (r) => { r.guid("Ticket.Requester"); r.u32("Ticket.Id"); r.u32("Ticket.Type"); r.u64("Ticket.Time"); r.bit("Ticket.Unk925"); };
const questReward = (r) => {
  r.u8("Mask"); r.i32("Money"); r.i32("XP"); const a = r.u32("Items"), b = r.u32("Currency"), c = r.u32("BonusCurrency");
  for (let i = 0; i < a + b + c; i++) { r.i32("ID"); r.i32("Qty"); }
  const sp = r.bit("HasSpell"), u1 = r.bit("HasU1"), u2 = r.bit("HasU2"), h = r.bit("HasHonor");
  if (sp) r.i32("RewardSpellID"); if (u1) r.i32("Unused1"); if (u2) r.u64("Unused2"); if (h) r.i32("Honor");
};
specs.SMSG_LFG_PLAYER_INFO = (r) => {
  const n = r.u32("Dungeons");
  const hg = r.bit("BL.HasPlayer"); const ns = r.u32("BL.Slots"); if (hg) r.guid("BL.Player");
  for (let i = 0; i < ns; i++) { r.u32("Slot"); r.u32("Reason"); r.i32("Sub1"); r.i32("Sub2"); r.u32("SoftLock"); }
  for (let i = 0; i < n; i++) {
    r.u32("Slot"); for (let k = 0; k < 12; k++) r.i32("Q" + k); r.u32("CompletedMask"); r.u32("EncounterMask"); const sr = r.u32("Shortage"); r.bit("FirstReward"); r.bit("ShortageEligible");
    questReward(r); for (let k = 0; k < sr; k++) questReward(r);
  }
};
specs.SMSG_LFG_QUEUE_STATUS = (r) => { rideTicket(r); r.u32("Slot"); r.u32("AvgWaitMe"); r.u32("AvgWait"); for (let i = 0; i < 3; i++) { r.u32("ByRole"); r.u8("LastNeeded"); } r.u32("QueuedTime"); };

// BattlegroundPackets.cpp:157 / :201
specs.SMSG_BATTLEFIELD_STATUS_QUEUED = (r) => {
  rideTicket(r); const n = r.u32("QueueIDs"); r.u8("RangeMin"); r.u8("RangeMax"); r.u8("TeamSize"); r.u32("InstanceID"); for (let i = 0; i < n; i++) r.u64("QueueID");
  r.bit("RegisteredMatch"); r.bit("TournamentRules");
  r.u32("AverageWaitTime"); r.u32("WaitTime"); r.i32("Unused920"); r.bit("AsGroup"); r.bit("EligibleForMatchmaking"); r.bit("SuspendedQueue");
};

specs.CMSG_ENUM_CHARACTERS = (r) => {};

// MiscPackets.cpp:48 SetCurrency::Write
specs.SMSG_SET_CURRENCY = (r) => {
  r.i32("Type"); r.i32("Quantity"); r.u32("Flags"); const t = r.u32("Toasts"); for (let i = 0; i < t; i++) { r.i32("ToastID"); r.i32("Asset"); }
  const h = []; for (let k = 0; k < 12; k++) h.push(r.bit("Has" + k));
  // bit 4 = SuppressChatLog (no payload)
  const sz = [4, 4, 4, 4, 0, 4, 4, 4, 4, 8, 8, 4];
  h.forEach((v, k) => { if (v && sz[k]) r.bytes(sz[k], "Opt" + k); });
};
specs.CMSG_CHAR_DELETE = (r) => { r.guid("Guid"); };
