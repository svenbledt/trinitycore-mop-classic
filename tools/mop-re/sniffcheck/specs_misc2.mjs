// TC layouts: QuestPackets.cpp, PartyPackets.cpp and other misc writers.
export const specs = {};
export const fixed = {};

// QuestPackets.cpp:96 QueryQuestInfoResponse::Write
specs.SMSG_QUERY_QUEST_INFO_RESPONSE = (r) => {
  r.u32("QuestID"); if (!r.bit("Allow")) return;
  for (const n of ["QuestID", "QuestType", "QuestLevel", "ScalingFactionGroup", "MaxScalingLevel", "PackageID", "MinLevel", "SortID", "InfoID",
    "SuggestedGroupNum", "RewardNextQuest", "RewardXPDifficulty"]) r.i32(n);
  r.f32("RewardXPMultiplier"); r.i32("RewardMoney"); r.i32("RewardMoneyDifficulty"); r.f32("RewardMoneyMultiplier"); r.i32("RewardBonusMoney");
  for (let i = 0; i < 3; i++) r.i32("RewardDisplaySpell");
  r.i32("RewardSpell"); r.i32("RewardHonor"); r.f32("RewardKillHonor"); r.i32("ArtifactXPDifficulty"); r.f32("ArtifactXPMult"); r.i32("ArtifactCategory");
  r.i32("StartItem"); r.i32("Unk554"); r.u32("Flags"); r.u32("FlagsEx"); r.u32("FlagsEx2"); r.u32("FlagsEx3");
  for (let i = 0; i < 4; i++) { r.i32("RewardItem"); r.i32("RewardAmount"); r.i32("ItemDrop"); r.i32("ItemDropQty"); }
  for (let i = 0; i < 6; i++) { r.i32("Choice.ItemID"); r.i32("Choice.Qty"); r.i32("Choice.Display"); }
  r.i32("POIContinent"); r.f32("POIx"); r.f32("POIy"); r.i32("POIPriority");
  r.i32("RewardTitle"); r.i32("RewardArenaPoints"); r.i32("RewardSkillLineID"); r.i32("RewardNumSkillUps");
  r.i32("PortraitGiver"); r.i32("PortraitGiverMount"); r.i32("PortraitGiverModelScene"); r.i32("PortraitTurnIn");
  for (let i = 0; i < 5; i++) { r.i32("FactionID"); r.i32("FactionValue"); r.i32("FactionOverride"); r.i32("FactionCapIn"); }
  r.i32("RewardFactionFlags");
  for (let i = 0; i < 4; i++) { r.i32("CurrencyID"); r.i32("CurrencyQty"); }
  r.i32("AcceptedSoundKit"); r.i32("CompleteSoundKit"); r.i32("AreaGroupID"); r.u64("TimeAllowed");
  const no = r.u32("Objectives"); r.u64("AllowableRaces"); const tp1 = r.u32("TreasurePicker"), tp2 = r.u32("TreasurePicker2"); r.i32("Expansion"); r.i32("QuestGiverCreatureID");
  const cd = r.u32("CondDesc"), cl = r.u32("CondLog"), u1 = r.u32("Unk554IDs1"), u2 = r.u32("Unk554IDs2");
  for (let i = 0; i < tp1 + tp2 + u1 + u2; i++) r.i32("ID");
  const L = [9, 12, 12, 9, 10, 8, 10, 8, 11].map((b, i) => r.bits(b, "Len" + i)); r.bit("ReadyForTranslation");
  for (let i = 0; i < no; i++) {
    r.u32("Obj.ID"); r.i32("Obj.Type"); r.i8("Obj.StorageIndex"); r.i32("Obj.ObjectID"); r.i32("Obj.Amount"); r.u32("Obj.Flags"); r.u32("Obj.Flags2"); r.f32("Obj.ProgressBarWeight");
    r.u32("Obj.Unk554_32"); const ve = r.i32("Obj.VisualEffects"); r.u32("Obj.Unk554_320"); for (let k = 0; k < ve; k++) r.i32("VE");
    const dl = r.bits(8, "Obj.DescLen"); r.bit("Obj.Unk554Bit"); r.str(dl, "Obj.Desc");
  }
  L.forEach((l, i) => r.str(l, "Str" + i));
  for (let i = 0; i < cd + cl; i++) { r.i32("Cond.PlayerCondition"); r.i32("Cond.QuestGiver"); const l = r.bits(12, "Cond.Len"); r.str(l, "Cond.Text"); }
};
specs.SMSG_QUEST_UPDATE_ADD_CREDIT = (r) => { r.guid("Victim"); r.i32("QuestID"); r.i32("ObjectID"); r.u16("Count"); r.u16("Required"); r.i32("ObjectiveType"); };
specs.SMSG_QUEST_UPDATE_ADD_CREDIT_SIMPLE = (r) => { r.i32("QuestID"); r.i32("ObjectID"); r.i32("ObjectiveType"); };

// PartyPackets.cpp:213 PartyMemberStats
const aura = (r) => { r.i32("A.SpellID"); r.u16("A.Flags"); r.u32("A.ActiveFlags"); const n = r.i32("A.Points"); for (let i = 0; i < n; i++) r.f32("A.Point"); };
export function partyMemberStats(r) {
  r.u8("PartyType0"); r.u8("PartyType1"); r.u32("Status"); r.u8("PowerType"); r.u16("PowerDisplayID"); r.i32("CurHealth"); r.i32("MaxHealth");
  r.u16("CurPower"); r.u16("MaxPower"); r.u16("Level"); r.u16("SpecID"); r.u16("ZoneID"); r.u16("WmoGroupID"); r.u32("WmoDoodadPlacementID");
  r.i16("X"); r.i16("Y"); r.i16("Z"); r.i32("VehicleSeat"); const na = r.u32("Auras");
  r.u32("PhaseShiftFlags"); const np = r.u32("Phases"); r.guid("PersonalGUID"); for (let i = 0; i < np; i++) { r.u32("Ph.Flags"); r.u16("Ph.Id"); }
  const nc = r.u32("CTR.Conditions"); r.u8("CTR.FactionGroup"); r.u32("CTR.ExpansionMask"); for (let i = 0; i < nc; i++) r.u32("CTR.Cond");
  for (let i = 0; i < na; i++) aura(r);
  if (r.bit("HasPet")) {
    r.guid("Pet.GUID"); r.i32("Pet.Model"); r.i32("Pet.CurHealth"); r.i32("Pet.MaxHealth"); const pa = r.u32("Pet.Auras"); for (let i = 0; i < pa; i++) aura(r);
    const l = r.bits(8, "Pet.NameLen"); r.str(l, "Pet.Name");
  }
}
specs.SMSG_PARTY_MEMBER_FULL_STATE = (r) => { r.bit("ForEnemy"); partyMemberStats(r); r.guid("MemberGuid"); };
specs.CMSG_REQUEST_PARTY_MEMBER_STATS = (r) => { const h = r.bit("HasPartyIndex"); const n = r.u32("Count"); if (h) r.u8("PartyIndex"); for (let i = 0; i < n; i++) r.guid("Target"); };
specs.SMSG_PARTY_UPDATE = (r) => {
  r.u16("PartyFlags"); r.u8("PartyIndex"); r.u8("PartyType"); r.i32("MyIndex"); r.guid("PartyGUID"); r.u32("SequenceNum"); r.guid("LeaderGUID"); r.u8("LeaderFactionGroup"); r.i32("PingRestriction");
  const n = r.u32("Players"); const cm = r.bit("HasChallengeMode"), lfg = r.bit("HasLfg"), loot = r.bit("HasLoot"), diff = r.bit("HasDifficulty"); r.flush();
  for (let i = 0; i < n; i++) {
    const nl = r.bits(6, "NameLen"), vl = r.bits(6, "VoiceLen+1"); r.bit("Connected"); r.bit("VoiceSilenced"); r.bit("FromSocialQueue");
    r.guid("Leaver.Bnet"); r.f32("Leaver.Score"); r.u32("Leaver.Season"); r.u32("Leaver.Total"); r.u32("Leaver.Successes"); r.i32("Leaver.Consecutive"); r.u64("Leaver.LastPenalty"); r.u64("Leaver.Expiration"); r.i32("Leaver.U1120"); r.bit("Leaver.Status");
    r.guid("GUID"); r.u8("Subgroup"); r.u8("Flags"); r.u8("Roles"); r.u8("Class"); r.u8("FactionGroup"); r.str(nl, "Name"); if (vl > 1) r.str(vl, "VoiceStateID+NUL");
  }
  if (loot) { r.u8("Loot.Method"); r.guid("Loot.Master"); r.u8("Loot.Threshold"); }
  if (diff) { r.u16("Dungeon"); r.u16("Raid"); r.u16("LegacyRaid"); }
  if (cm) { r.i32("CM.Map"); r.i32("CM.Initial"); r.u64("CM.Instance"); r.u64("CM.Start"); r.guid("CM.Keystone"); r.guid("CM.Leaver"); r.u64("CM.Unk176"); r.bit("a"); r.bit("b"); r.bit("c"); }
  if (lfg) { r.u32("LFG.Slot"); r.u8("MyFlags"); r.u32("MyRandomSlot"); r.u8("MyPartialClear"); r.f32("MyGearDiff"); r.u8("Stranger"); r.u8("KickVote"); r.u8("BootCount"); r.bit("Aborted"); r.bit("FirstReward"); }
};

// LFGPackets.cpp:145 + LFGPacketsCommon.cpp:32 RideTicket
const rideTicket = (r) => { r.guid("Ticket.Requester"); r.u32("Ticket.Id"); r.u32("Ticket.Type"); r.u64("Ticket.Time"); r.bit("Ticket.Unk925"); };
specs.SMSG_LFG_UPDATE_STATUS = (r) => {
  rideTicket(r); r.u8("SubType"); r.u32("Reason"); const ns = r.u32("Slots"); r.u8("RequestedRoles"); const np = r.u32("Suspended"); r.u32("QueueMapID");
  for (let i = 0; i < ns; i++) r.u32("Slot"); for (let i = 0; i < np; i++) r.guid("SuspendedPlayer");
  r.bit("NotifyUI"); r.bit("IsParty"); r.bit("Joined"); r.bit("LfgJoined"); r.bit("Queued"); r.bit("Unused");
};
// NPCPackets.cpp:172
specs.SMSG_TRAINER_LIST = (r) => {
  r.guid("TrainerGUID"); r.u8("TrainerType"); r.u32("TrainerID"); const n = r.u32("Spells");
  for (let i = 0; i < n; i++) { r.i32("SpellID"); r.u32("MoneyCost"); r.u32("ReqSkillLine"); r.u32("ReqSkillRank"); r.i32("ReqAbility0"); r.i32("ReqAbility1"); r.i32("ReqAbility2"); r.u32("Unk440"); r.u8("Usable"); r.u8("ReqLevel"); }
  const l = r.bits(11, "GreetingLen"); r.str(l, "Greeting");
};
specs.CMSG_QUEST_PUSH_RESULT = (r) => { r.guid("Sender"); r.u32("QuestID"); r.u32("Result"); };
// ChatPackets.cpp:44
specs.CMSG_CHAT_MESSAGE_WHISPER = (r) => {
  r.i32("Language"); r.guid("TargetGUID"); r.u32("TargetVRA"); const tl = r.bits(7, "TargetLen"), xl = r.bits(11, "TextLen");
  if (tl > 1) r.str(tl, "Target+NUL"); if (xl > 1) r.str(xl, "Text+NUL");
};
// 5.5.4: target length is 9 bits (u3.pkt@55973: bits 04 00 40 -> 8 "Shamisa\0", 4 "asd\0")
fixed.CMSG_CHAT_MESSAGE_WHISPER = (r) => {
  r.i32("Language"); r.guid("TargetGUID"); r.u32("TargetVRA"); const tl = r.bits(9, "TargetLen"), xl = r.bits(11, "TextLen");
  if (tl > 1) r.str(tl, "Target+NUL"); if (xl > 1) r.str(xl, "Text+NUL");
};
