// Spot-check specs for frequent opcodes WPP 5.5.3 parses cleanly (TC writers transcribed).
export const specs = {};
export const fixed = {};

// AchievementPackets.cpp:33/:90 (WowTime u32, Duration<Seconds>/Timestamp<> int64)
const criteria = (r) => { r.u32("ID"); r.u64("Quantity"); r.guid("Player"); r.u32("Unused_10_1_5"); r.u32("Flags"); r.u32("Date"); r.u64("TimeFromStart"); r.u64("TimeFromCreate"); if (r.bit("HasRaf")) r.u64("RafAcceptanceID"); };
specs.SMSG_CRITERIA_UPDATE = criteria;
specs.SMSG_ACCOUNT_CRITERIA_UPDATE = criteria;
// ChatPackets.cpp:241
specs.SMSG_EMOTE = (r) => { r.guid("Guid"); r.u32("EmoteID"); const n = r.u32("Kits"); r.i32("SequenceVariation"); for (let i = 0; i < n; i++) r.i32("Kit"); };
// CombatPackets.cpp
specs.SMSG_THREAT_UPDATE = (r) => { r.guid("Unit"); const n = r.i32("Count"); for (let i = 0; i < n; i++) { r.guid("U"); r.u64("Threat"); } };
specs.SMSG_HIGHEST_THREAT_UPDATE = (r) => { r.guid("Unit"); r.guid("Highest"); const n = r.i32("Count"); for (let i = 0; i < n; i++) { r.guid("U"); r.u64("Threat"); } };
specs.SMSG_THREAT_CLEAR = (r) => { r.guid("Unit"); };
specs.SMSG_THREAT_REMOVE = (r) => { r.guid("Unit"); r.guid("About"); };
specs.SMSG_ATTACK_START = (r) => { r.guid("Attacker"); r.guid("Victim"); };
specs.SMSG_ATTACK_STOP = (r) => { r.guid("Attacker"); r.guid("Victim"); r.bit("NowDead"); };
specs.SMSG_CANCEL_AUTO_REPEAT = (r) => { r.guid("Guid"); };
specs.SMSG_POWER_UPDATE = (r) => { r.guid("Guid"); const n = r.u32("Count"); for (let i = 0; i < n; i++) { r.u8("Type"); r.i32("Power"); } };
specs.SMSG_AI_REACTION = (r) => { r.guid("Unit"); r.u32("Reaction"); };
specs.SMSG_PARTY_KILL_LOG = (r) => { r.guid("Player"); r.guid("Victim"); };
// QueryPackets.cpp:64/:69
specs.CMSG_QUERY_CREATURE = (r) => { r.u32("CreatureID"); };
specs.SMSG_QUERY_CREATURE_RESPONSE = (r) => {
  r.u32("CreatureID"); if (!r.bit("Allow")) return; r.flush();
  const tl = r.bits(11, "TitleLen+1"), tal = r.bits(11, "TitleAltLen+1"), cl = r.bits(6, "CursorLen+1"); r.bit("Civilian"); r.bit("Leader");
  const nl = []; for (let i = 0; i < 4; i++) { nl.push(r.bits(11, "NameLen+1")); nl.push(r.bits(11, "NameAltLen+1")); }
  const s = (l, n) => { if (l === 1) r.log("NOTE len1 (TC writes no bytes)", n, r.pos()); if (l > 1) r.str(l, n); };
  nl.forEach((l, i) => s(l, "Name" + i));
  r.u32("Flags0"); r.u32("Flags1"); r.u32("Flags2"); r.u8("CreatureType"); r.i32("Family"); r.i8("Classification"); r.u32("PetSpellDataID"); r.u32("Proxy0"); r.u32("Proxy1");
  const nd = r.u32("Displays"); r.f32("TotalProbability"); for (let i = 0; i < nd; i++) { r.u32("DisplayID"); r.f32("Scale"); r.f32("Prob"); }
  r.f32("HpMulti"); r.f32("EnergyMulti"); const qi = r.u32("QuestItems"), qc = r.u32("QuestCurrencies");
  for (const n of ["MovementInfoID", "HealthScalingExp", "RequiredExp", "VignetteID", "Class", "DifficultyID", "WidgetSetID", "WidgetSetUnitCondID"]) r.i32(n);
  s(tl, "Title"); s(tal, "TitleAlt"); s(cl, "Cursor");
  for (let i = 0; i < qi + qc; i++) r.i32("Q");
};
specs.CMSG_QUERY_GAME_OBJECT = (r) => { r.u32("GameObjectID"); r.guid("Guid"); };
specs.SMSG_QUERY_GAME_OBJECT_RESPONSE = (r) => {
  r.u32("GameObjectID"); r.guid("Guid"); const allow = r.bit("Allow"); const sz = r.u32("StatsSize"); const st = r.pos();
  if (allow) {
    r.i32("Type"); r.i32("DisplayID"); for (let i = 0; i < 4; i++) r.cstr("Name" + i); r.cstr("Icon"); r.cstr("CastBar"); r.cstr("Unk");
    for (let i = 0; i < 35; i++) r.i32("Data"); r.f32("Size"); const q = r.u8("QuestItems"); for (let i = 0; i < q; i++) r.i32("QI"); r.i32("ContentTuningId"); r.i32("Unk550");
  }
  if (r.pos() - st !== sz) r.log("NOTE statsSize mismatch", [sz, r.pos() - st], r.pos());
};
// MiscPackets.cpp
specs.SMSG_TIME_SYNC_REQUEST = (r) => { r.u32("Seq"); };
specs.CMSG_TIME_SYNC_RESPONSE = (r) => { r.u32("Seq"); r.u32("ClientTime"); };
specs.SMSG_INVALIDATE_PLAYER = (r) => { r.guid("Guid"); };
specs.CMSG_SET_SELECTION = (r) => { r.guid("Selection"); };
specs.SMSG_PLAY_OBJECT_SOUND = (r) => { r.i32("SoundKitID"); r.guid("Source"); r.guid("Target"); r.f32("X"); r.f32("Y"); r.f32("Z"); r.i32("BroadcastTextID"); };
specs.SMSG_REQUEST_CEMETERY_LIST_RESPONSE = (r) => { r.bit("IsGossipTriggered"); const n = r.u32("Count"); for (let i = 0; i < n; i++) r.u32("Cemetery"); };
// QuestPackets.cpp
specs.CMSG_QUEST_GIVER_STATUS_QUERY = (r) => { r.guid("QuestGiver"); };
specs.SMSG_QUEST_GIVER_STATUS = (r) => { r.guid("Guid"); r.u64("Status"); };
specs.SMSG_QUEST_GIVER_STATUS_MULTIPLE = (r) => { const n = r.i32("Count"); for (let i = 0; i < n; i++) { r.guid("Guid"); r.u64("Status"); } };
specs.SMSG_QUEST_COMPLETION_NPC_RESPONSE = (r) => { const n = r.u32("Count"); for (let i = 0; i < n; i++) { r.i32("QuestID"); const m = r.u32("NPCs"); for (let k = 0; k < m; k++) r.i32("NPC"); } };
specs.CMSG_QUEST_POI_QUERY = (r) => { r.i32("MissingCount"); for (let i = 0; i < 25; i++) r.i32("Q"); };
specs.SMSG_QUEST_POI_QUERY_RESPONSE = (r) => {
  const n = r.i32("Count"); r.i32("Count2");
  for (let i = 0; i < n; i++) {
    r.i32("QuestID"); const b = r.i32("Blobs");
    for (let j = 0; j < b; j++) { for (let k = 0; k < 12; k++) r.i32("B" + k); const p = r.i32("Points"); for (let k = 0; k < p; k++) { r.i16("X"); r.i16("Y"); r.i16("Z"); } r.bit("AlwaysAllowMerging"); }
  }
};
// ItemPacketsCommon.cpp ItemInstance
export function itemInstance(r) {
  r.i32("ItemID"); r.i32("RandomPropertiesSeed"); r.i32("RandomPropertiesID"); const hb = r.bit("HasBonus"); r.flush();
  const nm = r.bits(7, "Mods"); for (let i = 0; i < nm; i++) { r.u8("Mod.Type"); r.i32("Mod.Value"); }
  if (hb) { r.u8("Bonus.Context"); const n = r.u32("BonusIDs"); for (let i = 0; i < n; i++) r.u32("BonusID"); }
}
specs.SMSG_QUEST_GIVER_QUEST_DETAILS = (r) => {
  r.guid("QuestGiver"); r.guid("InformUnit"); for (const n of ["QuestID", "PackageID", "PortraitGiver", "PortraitGiverMount", "PortraitGiverModelScene", "PortraitTurnIn"]) r.i32(n);
  for (let i = 0; i < 4; i++) r.u32("QuestFlags" + i); r.i32("SuggestedParty"); const ls = r.u32("LearnSpells"), de = r.u32("DescEmotes"), ob = r.u32("Objectives");
  r.i32("StartItem"); r.i32("QuestInfoID"); r.i32("SessionBonus"); r.i32("QuestGiverCreatureID"); const cd = r.u32("CondDesc");
  for (let i = 0; i < ls; i++) r.i32("Spell"); for (let i = 0; i < de; i++) { r.i32("E.Type"); r.u32("E.Delay"); }
  for (let i = 0; i < ob; i++) { r.i32("O.ID"); r.i32("O.Type"); r.i32("O.ObjectID"); r.i32("O.Amount"); }
  const L = [9, 12, 12, 10, 8, 10, 8].map((b, i) => r.bits(b, "Len" + i)); for (let i = 0; i < 6; i++) r.bit("flag" + i);
  // QuestRewards
  for (let i = 0; i < 4; i++) { r.i32("RI.ItemID"); r.i32("RI.Qty"); }
  for (let i = 0; i < 4; i++) { r.i32("RC.ID"); r.i32("RC.Qty"); r.i32("RC.Bonus"); }
  r.i32("ChoiceItemCount"); r.i32("ItemCount"); r.i32("Money"); r.i32("XP"); r.u64("ArtifactXP"); r.i32("ArtifactCat"); r.i32("Honor"); r.i32("Title"); r.i32("FactionFlags");
  for (let i = 0; i < 5; i++) { r.i32("F.ID"); r.i32("F.Value"); r.i32("F.Override"); r.i32("F.CapIn"); }
  for (let i = 0; i < 3; i++) r.i32("SpellCompletionDisplayID"); r.i32("SpellCompletionID"); r.i32("SkillLineID"); r.i32("NumSkillUps");
  const tp = r.u32("TreasurePicker"); for (let i = 0; i < tp; i++) r.i32("TP");
  for (let i = 0; i < 6; i++) { r.bits(2, "LootItemType"); itemInstance(r); r.i32("Quantity"); }
  r.bit("IsBoostSpell");
  L.forEach((l, i) => r.str(l, "Str" + i));
  for (let i = 0; i < cd; i++) { r.i32("C.PC"); r.i32("C.QG"); const l = r.bits(12, "C.Len"); r.str(l, "C.Text"); }
};
// ChatPackets.cpp:200 / :25 / :66 / :79 / :253 / :264
specs.SMSG_CHAT = (r) => {
  r.u8("SlashCmd"); r.u32("Language"); r.guid("Sender"); r.guid("SenderGuild"); r.guid("SenderAccount"); r.guid("Target"); r.u32("TargetVRA"); r.u32("SenderVRA");
  r.i32("AchievementID"); r.u16("ChatFlags"); r.f32("DisplayTime"); r.i32("SpellID");
  const a = r.bits(11, "SenderNameLen"), b = r.bits(11, "TargetNameLen"), c = r.bits(5, "PrefixLen"), d = r.bits(7, "ChannelLen"), e = r.bits(12, "TextLen");
  r.bit("HideChatLog"); r.bit("FakeSenderName"); const u = r.bit("HasUnused801"), cg = r.bit("HasChannelGUID"), t = r.bit("HasUnk554");
  r.str(a, "SenderName"); r.str(b, "TargetName"); r.str(c, "Prefix"); r.str(d, "Channel"); r.str(e, "Text");
  if (u) r.u32("Unused801"); if (cg) r.guid("ChannelGUID"); if (t) r.log("NOTE HasUnk554 trailing u32 not written by TC", 1, r.pos()) , r.u32("Unk554");
};
const chatMsg = (secure) => (r) => { r.i32("Language"); const l = r.bits(11, "Len"); if (secure) r.bit("IsSecure"); r.str(l, "Text"); };
specs.CMSG_CHAT_MESSAGE_SAY = chatMsg(true); specs.CMSG_CHAT_MESSAGE_PARTY = chatMsg(true); specs.CMSG_CHAT_MESSAGE_INSTANCE_CHAT = chatMsg(true);
specs.CMSG_CHAT_MESSAGE_RAID = chatMsg(true); specs.CMSG_CHAT_MESSAGE_GUILD = chatMsg(false); specs.CMSG_CHAT_MESSAGE_YELL = chatMsg(false);
specs.CMSG_CHAT_MESSAGE_CHANNEL = (r) => { r.i32("Language"); r.guid("ChannelGUID"); const tl = r.bits(9, "TargetLen"), xl = r.bits(11, "TextLen"); if (r.bit("HasSecure")) r.bit("IsSecure"); r.str(tl, "Target"); r.str(xl, "Text"); };
specs.CMSG_CHAT_ADDON_MESSAGE = (r) => { const pl = r.bits(5, "PrefixLen"), tl = r.bits(8, "TextLen"); r.bit("IsLogged"); r.i32("Type"); r.str(pl, "Prefix"); r.str(tl, "Text"); };
specs.SMSG_TEXT_EMOTE = (r) => { r.guid("Source"); r.guid("SourceAccount"); r.i32("EmoteID"); r.i32("SoundIndex"); r.guid("Target"); };
specs.CMSG_SEND_TEXT_EMOTE = (r) => { r.guid("Target"); r.i32("EmoteID"); r.i32("SoundIndex"); const n = r.u32("Kits"); r.i32("SequenceVariation"); for (let i = 0; i < n; i++) r.i32("Kit"); };
// ItemPackets.cpp:332 / :145
specs.SMSG_ITEM_ENCHANT_TIME_UPDATE = (r) => { r.guid("Item"); r.u32("DurationLeft"); r.u32("Slot"); r.guid("Owner"); };
specs.SMSG_SET_PROFICIENCY = (r) => { r.u32("Mask"); r.u8("Class"); };
// AuthenticationPackets.cpp:62/:68
specs.CMSG_PING = (r) => { r.u32("Serial"); r.u32("Latency"); };
specs.SMSG_PONG = (r) => { r.u32("Serial"); };
// GuildPackets.cpp:20/:29
specs.CMSG_QUERY_GUILD_INFO = (r) => { r.guid("Guild"); r.guid("Player"); };
specs.SMSG_QUERY_GUILD_INFO_RESPONSE = (r) => {
  r.guid("GuildGuid"); if (!r.bit("HasInfo")) return;
  r.guid("GuildGUID"); r.u32("VRA"); const n = r.u32("Ranks"); for (let i = 0; i < 5; i++) r.u32("Emblem" + i); const gl = r.bits(7, "NameLen");
  for (let i = 0; i < n; i++) { r.u32("RankID"); r.u32("RankOrder"); const l = r.bits(7, "RankNameLen"); r.str(l, "RankName"); }
  r.str(gl, "GuildName");
};
// AreaTriggerPackets.cpp:66, CombatPackets.cpp:114
specs.CMSG_AREA_TRIGGER = (r) => { r.i32("AreaTriggerID"); r.bit("Entered"); r.bit("FromClient"); };
specs.CMSG_SET_SHEATHED = (r) => { r.i32("SheathState"); r.bit("Animate"); };
// QueryPackets.cpp:149/:200/:227/:239/:250/:271
specs.CMSG_QUERY_PLAYER_NAMES = (r) => { const n = r.u32("Count"); for (let i = 0; i < n; i++) r.guid("Player"); };
specs.SMSG_QUERY_PLAYER_NAMES_RESPONSE = (r) => {
  const n = r.u32("Count");
  for (let i = 0; i < n; i++) {
    r.u8("Result"); r.guid("Player"); const d = r.bit("HasData"), u = r.bit("HasUnused920"), k = r.bit("HasUnk554"); r.flush();
    if (d) {
      r.bit("IsDeleted"); const nl = r.bits(6, "NameLen"); const dl = []; for (let j = 0; j < 5; j++) dl.push(r.bits(7, "DeclLen"));
      dl.forEach((l) => r.str(l, "Declined")); r.guid("Account"); r.guid("BnetAccount"); r.guid("GuidActual"); r.u64("ClubMember"); r.u32("VRA");
      r.u8("Race"); r.u8("Sex"); r.u8("Class"); r.u8("Level"); r.u8("Unused915"); r.i32("TimerunningSeasonID"); r.str(nl, "Name");
    }
    if (u) { r.u32("U1"); r.guid("U2"); const l = r.bits(7, "U3Len"); r.str(l, "U3"); }
    if (k) { r.guid("Unk554.Guid"); const l = r.bits(8, "Unk554.TextLen"); r.str(l, "Unk554.Text"); }
  }
};
specs.CMSG_QUERY_PET_NAME = (r) => { r.guid("Unit"); };
specs.SMSG_QUERY_PET_NAME_RESPONSE = (r) => {
  r.guid("Unit"); if (!r.bit("Allow")) return;
  const nl = r.bits(8, "NameLen"); r.bit("HasDeclined"); const dl = []; for (let i = 0; i < 5; i++) dl.push(r.bits(7, "DeclLen"));
  dl.forEach((l) => r.str(l, "Declined")); r.u64("Timestamp"); r.str(nl, "Name");
};
// LootPackets.cpp:22 LootItemData
export function lootItemData(r) { r.bits(2, "Type"); r.bits(3, "UIType"); r.bit("CanTradeToTapList"); itemInstance(r); r.u32("Quantity"); r.u8("LootItemType"); r.u8("LootListID"); }
// GameObjectPackets.cpp:30, LootPackets.cpp:189/:104
specs.SMSG_GAME_OBJECT_DESPAWN = (r) => { r.guid("Object"); };
specs.SMSG_LOOT_ROLL = (r) => { r.guid("LootObj"); r.guid("Player"); r.i32("Roll"); r.u8("RollType"); r.i32("DungeonEncounterID"); lootItemData(r); r.bit("Autopassed"); r.bit("OffSpec"); };
specs.SMSG_LOOT_REMOVED = (r) => { r.guid("Owner"); r.guid("LootObj"); r.u8("LootListID"); };
// PetPackets.cpp:20
specs.SMSG_PET_SPELLS_MESSAGE = (r) => {
  r.guid("Pet"); r.u16("Family"); r.u16("Spec"); r.u32("TimeLimit"); r.u8("CommandState"); r.u8("Flag"); r.u8("ReactState");
  for (let i = 0; i < 10; i++) r.u32("ActionButton"); const a = r.u32("Actions"), c = r.u32("Cooldowns"), h = r.u32("History");
  for (let i = 0; i < a; i++) r.u32("Action");
  for (let i = 0; i < c; i++) { r.i32("CD.SpellID"); r.i32("CD.Duration"); r.i32("CD.CatDuration"); r.f32("CD.ModRate"); r.u16("CD.Category"); }
  for (let i = 0; i < h; i++) { r.i32("H.Cat"); r.i32("H.Recovery"); r.f32("H.ModRate"); r.i8("H.Consumed"); }
};
