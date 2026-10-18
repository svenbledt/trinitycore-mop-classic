// TC layouts for login / char screen / enter-world packets and misc opcodes.
export const specs = {};
export const fixed = {};

const throttle = (r, n) => { r.u32(n + ".MaxTries"); r.u32(n + ".PerMs"); r.u32(n + ".TryCount"); r.u32(n + ".LastReset"); };
const europa = (r) => { r.bit("Tickets"); r.bit("Bugs"); r.bit("Complaints"); r.bit("Suggestions"); throttle(r, "Thr"); throttle(r, "ExpThr"); };

// AuthenticationPackets.cpp:334 ConnectTo::Write
specs.SMSG_CONNECT_TO = (r) => {
  const n = r.u32("PayloadCount"); r.u32("Serial"); r.u8("Con"); r.u64("Key"); r.u32("NativeRealmAddress"); r.u32("Key3");
  for (let i = 0; i < n; i++) {
    const t = r.u8("Where.Type");
    if (t === 1) r.bytes(4, "V4"); else if (t === 2) r.bytes(16, "V6"); else if (t === 3) r.cstr("Name");
    r.u16("Port");
    const tl = r.bits(5, "TokenLen"), pl = r.bits(24, "ProxyIdLen+1"), al = r.bits(6, "AddressLen");
    r.u64("TokenLifespan"); r.str(tl, "Token"); if (pl > 1) r.str(pl, "ProxyId+NUL"); r.str(al, "Address");
  }
};
specs.CMSG_AUTH_CONTINUED_SESSION = (r) => { r.u64("DosResponse"); r.bytes(32, "LocalChallenge"); r.bytes(24, "Digest"); r.u64("Key"); r.u32("NativeRealmAddress"); r.u32("Key3"); };
specs.SMSG_ACCOUNT_DATA_TIMES = (r) => { r.guid("Player"); r.u64("ServerTime"); for (let i = 0; i < 20; i++) r.u64("Time" + i); };
specs.SMSG_WORLD_SERVER_INFO = (r) => {
  r.u16("DifficultyID"); for (let i = 0; i < 4; i++) r.guid("UnkGuid" + i);
  r.bit("IsTournamentRealm"); r.bit("XRealmPvpAlert"); const a = r.bit("HasRestrictedLevel"), b = r.bit("HasRestrictedMoney"), c = r.bit("HasInstanceGroupSize");
  if (a) r.u32("RestrictedLevel"); if (b) r.u64("RestrictedMoney"); if (c) r.u32("InstanceGroupSize");
};
specs.SMSG_SET_DUNGEON_DIFFICULTY = (r) => { r.u16("DifficultyID"); };
specs.SMSG_RAID_DIFFICULTY_SET = (r) => { r.u32("Legacy"); r.u16("DifficultyID"); };
specs.SMSG_SETUP_CURRENCY = (r) => {
  const n = r.u32("Count");
  for (let i = 0; i < n; i++) {
    r.i32("Type"); r.i32("Quantity");
    const h = []; for (let k = 0; k < 7; k++) h.push(r.bit("Has" + k)); r.bits(5, "Flags");
    if (h[0]) r.u32("Weekly"); if (h[1]) r.u32("MaxWeekly"); if (h[2]) r.u32("Tracked"); if (h[3]) r.i32("Max"); if (h[4]) r.i32("TotalEarned");
    if (h[5]) r.u64("NextRecharge"); if (h[6]) r.u64("RechargeCycleStart");
  }
};
specs.SMSG_CREATE_CHAR = (r) => { r.u32("Code"); r.guid("Guid"); };
specs.SMSG_DELETE_CHAR = (r) => { r.u32("Code"); };
specs.CMSG_PLAYER_LOGIN = (r) => { r.guid("Guid"); r.f32("FarClip"); r.bit("UnkBit"); };
specs.CMSG_CHAR_DELETE = (r) => { r.guid("Guid"); };
specs.CMSG_CREATE_CHARACTER = (r) => {
  const nl = r.bits(6, "NameLen"); const ts = r.bit("HasTemplateSet"); r.bit("IsTrialBoost"); r.bit("UseNPE"); r.bit("HardcoreSelfFound");
  r.u8("Race"); r.u8("Class"); r.u8("Sex"); const n = r.u32("Customizations"); r.i32("TimerunningSeasonID"); r.str(nl, "Name");
  if (ts) r.i32("TemplateSet"); for (let i = 0; i < n; i++) { r.u32("OptionID"); r.u32("ChoiceID"); }
};

// SystemPackets.cpp:64 FeatureSystemStatus::Write
specs.SMSG_FEATURE_SYSTEM_STATUS = (r) => {
  r.u8("ComplaintStatus"); r.u32("CfgRealmID"); r.i32("CfgRealmRecID");
  for (const n of ["MaxRecruits", "MaxRecruitMonths", "MaxRecruitmentUses", "DaysInCycle", "RewardsVersion"]) r.u32("RAF." + n);
  r.u32("CommercePricePoll"); r.u32("KioskSessionMinutes"); r.u64("RedeemForBalance"); r.u32("BpayStorePurchaseTimeout"); r.u32("ClubsPresenceDelay");
  r.i32("ContentSetID"); const unkArr = r.u32("Unk554ArrayCount"); const gr = r.u32("GameRules"); r.i32("ActiveTimerunningSeasonID"); r.i32("RemainingTimerunning");
  r.i16("MaxGuidLookups"); r.i16("NameLookupTelemetry"); r.u32("NotFoundCacheTime"); r.i32("RealmPvpTypeOverride");
  r.i32("AddonThr.MaxTries"); r.i32("AddonThr.Restored"); r.i32("AddonThr.Used");
  for (let i = 0; i < 7; i++) r.u32("Unk554_" + i);
  // retail fills the {u8,i32,i32} array (count at +57, TC sends 0); it precedes GameRules
  for (let i = 0; i < unkArr; i++) { r.u8("A.u8"); r.i32("A.i32"); r.i32("A.i32b"); }
  for (let i = 0; i < gr; i++) { r.i32("Rule"); r.i32("Value"); r.f32("ValueF"); }
  r.bit("VoiceEnabled"); const eu = r.bit("HasEuropa"); r.bits(2, "b"); const sa = r.bit("HasSessionAlert"); r.bits(3, "b"); r.bits(24, "flags");
  r.bits(2, "b"); const rce = r.bit("HasRaceClassExpansionLevels"); r.bits(5, "b"); r.bits(3, "b"); const ul = r.bits(10, "Unknown1027Len"); r.bits(7, "b");
  for (let i = 0; i < 22; i++) r.f32("QuickJoin" + i);
  r.bit("ToastsDisabled");
  if (sa) { r.i32("SA.Delay"); r.i32("SA.Period"); r.i32("SA.DisplayTime"); }
  if (rce) { const n = r.u32("RCE.Count"); r.bytes(n, "RCE"); }
  r.str(ul, "Unknown1027");
  r.bit("IsSquelched"); r.guid("BnetAccountGuid"); r.guid("GuildGuid");
  if (eu) europa(r);
};

// SystemPackets.cpp:180 FeatureSystemStatusGlueScreen::Write
specs.SMSG_FEATURE_SYSTEM_STATUS_GLUE_SCREEN = (r) => {
  for (let i = 0; i < 19; i++) r.bit("b" + i);
  const eu = r.bit("HasEuropa"); r.bit("NameReservationOnly"); const eta = r.bit("HasLaunchETA");
  for (let i = 0; i < 9; i++) r.bit("c" + i);
  const hl = r.bits(11, "RealmHiddenAlertLen+1"); r.bit("Realmless"); r.bit("WowTokenLimitedMode"); for (let i = 0; i < 4; i++) r.bit("Unk554Bit" + i);
  if (eu) europa(r);
  r.u32("TokenPoll"); r.u32("KioskSessionMinutes"); r.u64("TokenBalance"); r.i32("MaxCharactersPerRealm"); const lr = r.u32("LiveRegionSourceCount");
  r.i32("ActiveBoostType"); r.i32("TrialBoostType"); r.i32("MinExp"); r.i32("MaxExp"); r.i32("ContentSetID"); const gr = r.u32("GameRules");
  const u1 = r.u32("Unk554VecA"); const u2 = r.u32("Unk554VecB"); r.i32("ActiveTimerunning"); r.i32("RemainingTimerunning");
  r.i32("Unk554Int0"); r.i32("Unk554Int1"); r.i16("MaxGuidLookups"); r.i16("NameLookupTelemetry"); r.u32("NotFoundCacheTime");
  const dte = r.u32("DebugTimeEvents"); r.i32("MostRecentTimeEventID"); r.u32("EventRealmQueues");
  if (eta) r.i32("LaunchETA");
  r.str(hl, "RealmHiddenAlert"); // TC sends len+1 incl. NUL; retail sends 0 when empty. Both self-consistent.
  for (let i = 0; i < lr; i++) r.u32("LiveRegion");
  for (let i = 0; i < gr; i++) { r.u8("Rule"); r.i32("Value"); r.f32("ValueF"); }
  // TC always sends both 5.5.4 vector counts as 0; retail fills them (sniff: 10 x {u32,u32,u32}, 1 x u32) right after GameRules.
  for (let i = 0; i < u1; i++) { r.u32("VecA.0"); r.u32("VecA.1"); r.u32("VecA.2"); }
  for (let i = 0; i < u2; i++) r.u32("VecB");
  for (let i = 0; i < dte; i++) { r.u32("TimeEvent"); const l = r.bits(7, "TextLen"); r.str(l, "Text"); }
};

// CharacterPackets.cpp:378 EnumCharactersResult::Write
export function charInfoBasic(r) {
  r.guid("Guid"); r.u32("VirtualRealmAddress"); r.u16("ListPosition"); r.u8("Race"); r.u8("Sex"); r.u8("Class"); r.i16("SpecID");
  const nc = r.u32("Customizations"); r.u8("Level"); r.i32("MapID"); r.i32("ZoneID"); r.f32("X"); r.f32("Y"); r.f32("Z");
  r.u64("GuildClubMemberID"); r.guid("GuildGUID"); r.u32("Flags"); r.u32("Flags2"); r.u32("Flags3"); r.u32("Flags4"); r.u8("unkWod61x");
  r.u32("PetDisplay"); r.u32("PetLevel"); r.u32("PetFamily");
  for (let i = 0; i < 19; i++) { r.u32("VI.ItemID"); r.u32("VI.TransmogItemID"); r.u8("VI.Subclass"); r.u8("VI.InvType"); r.u32("VI.DisplayID"); r.u32("VI.Enchant"); r.i32("VI.SecIMA"); r.u8("VI.pad"); }
  r.i32("Unknown703"); r.u64("LastPlayedTime"); r.u64("Unk554"); r.i32("LastLoginVersion");
  for (let i = 0; i < 5; i++) r.i32("Tabard" + i);
  r.u32("Prof0"); r.u32("Prof1"); r.i32("TimerunningSeasonID"); r.u32("OverrideSelectScreen"); r.u32("Unused1110_1");
  for (let i = 0; i < nc; i++) { r.u32("OptionID"); r.u32("ChoiceID"); }
  const nl = r.bits(6, "NameLen"); r.bit("FirstLogin"); r.bit("U2"); r.bit("U3"); r.str(nl, "Name");
}
export function restrictions(r) {
  r.bit("BoostInProgress"); r.bits(2, "EraChoiceState"); r.bit("RpeResetAvailable");
  r.u32("Flags4"); const ms = r.u32("MailSenders"); const mt = r.u32("MailSenderTypes"); r.u32("Unk554");
  for (let i = 0; i < mt; i++) r.u32("MailSenderType");
  const ls = []; for (let i = 0; i < ms; i++) ls.push(r.bits(6, "SenderLen+1"));
  for (const l of ls) r.str(l, "Sender+NUL");
}
specs.SMSG_ENUM_CHARACTERS_RESULT = (r) => {
  for (let i = 0; i < 8; i++) r.bit("hdr" + i);
  const dcm = r.bit("HasDisabledClassesMask"); r.bit("DontCreateCharacterDisplays");
  const nch = r.u32("Characters"), nrw = r.u32("Regionwide"); r.i32("MaxCharacterLevel"); const nru = r.u32("RaceUnlocks"), nuc = r.u32("UnlockedCondApp"), nrl = r.u32("RaceLimitDisables"), nwg = r.u32("WarbandGroups");
  if (dcm) r.u32("DisabledClassesMask");
  for (let i = 0; i < nuc; i++) { r.i32("AchievementID"); r.i32("Unused"); }
  for (let i = 0; i < nrl; i++) { r.u8("RaceID"); r.u8("BlockReason"); }
  for (let i = 0; i < nch; i++) { charInfoBasic(r); restrictions(r); }
  for (let i = 0; i < nrw; i++) { charInfoBasic(r); r.u64("Money"); r.f32("MPlus"); r.f32("Unk324"); r.i32("PvpRating"); r.i8("PvpBracket"); r.i16("PvpSpec"); }
  for (let i = 0; i < nru; i++) { r.u8("RaceID"); const c = r.u32("ClassUnlocks"); if (c) r.log("NOTE JamClassUnlock entries present", c, r.pos()); for (let k = 0; k < c; k++) { r.u8("CU.ClassID"); r.u32("CU.u32"); r.bit("CU.bit"); } r.bit("HasExpansion"); r.bit("HasAchievement"); r.bit("HasHeritageArmor"); r.bit("IsLocked"); r.bit("Unused1027"); }
  for (let i = 0; i < nwg; i++) {
    r.u64("GroupID"); r.u8("U1100"); r.i32("SceneID"); r.i32("Flags"); r.i32("Unk114"); const m = r.u32("Members");
    for (let k = 0; k < m; k++) { r.i32("PlacementID"); const t = r.i32("Type"); r.i32("Unk8"); if (t === 0) r.guid("Guid"); }
    const l = r.bits(9, "NameLen"); r.str(l, "Name");
  }
};

// 5.5.4: u8 Flags after Quantity, then 7 has-bits (no 5-bit Flags) — same as WPP V1_60_1_69876 / V11_2_5 layout
fixed.SMSG_SETUP_CURRENCY = (r) => {
  const n = r.u32("Count");
  for (let i = 0; i < n; i++) {
    r.i32("Type"); r.i32("Quantity"); r.u8("Flags");
    const h = []; for (let k = 0; k < 7; k++) h.push(r.bit("Has" + k));
    if (h[0]) r.u32("Weekly"); if (h[1]) r.u32("MaxWeekly"); if (h[2]) r.u32("Tracked"); if (h[3]) r.i32("Max"); if (h[4]) r.i32("TotalEarned");
    if (h[5]) r.u64("NextRecharge"); if (h[6]) r.u64("RechargeCycleStart");
  }
};
