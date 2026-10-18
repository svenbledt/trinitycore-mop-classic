// Spot-check specs: login/world-entry and spline packets (TC writers transcribed).
export const specs = {};
export const fixed = {};

// MovementPackets.cpp:310 MovementSpline, :374 MovementMonsterSpline, :599 MonsterMove
export function movementSpline(r) {
  r.u32("Flags"); const face = r.u8("Face"); r.i32("Elapsed"); r.u32("MoveTime"); r.u32("FadeObjectTime"); r.u8("Mode"); r.guid("TransportGUID"); r.i8("VehicleSeat");
  if (face === 1) { r.f32("FaceSpot.X"); r.f32("FaceSpot.Y"); r.f32("FaceSpot.Z"); }
  else if (face === 2) { r.f32("FaceDirection"); r.guid("FaceGUID"); }
  else if (face === 3) r.f32("FaceDirection");
  const np = r.bits(16, "Points"); r.bit("VehicleExitVoluntary"); r.bit("Interpolate"); const nd = r.bits(16, "PackedDeltas");
  const sf = r.bit("HasSplineFilter"), se = r.bit("HasSpellEffectExtra"), je = r.bit("HasJumpExtra"), td = r.bit("HasTurnData"), at = r.bit("HasAnimTier");
  if (sf) { const nk = r.u32("FilterKeys"); r.f32("BaseSpeed"); r.i16("StartOffset"); r.f32("DistToPrev"); r.i16("AddedToStart"); for (let i = 0; i < nk; i++) { r.i16("Idx"); r.u16("Speed"); } r.bits(2, "FilterFlags"); }
  for (let i = 0; i < np; i++) { r.f32("P.X"); r.f32("P.Y"); r.f32("P.Z"); }
  for (let i = 0; i < nd; i++) r.u32("PackedDelta");
  if (se) { r.guid("SE.Target"); r.u32("SE.SpellVisualID"); r.u32("SE.ProgressCurve"); r.u32("SE.ParabolicCurve"); r.f32("SE.JumpGravity"); }
  if (je) { r.f32("JE.JumpGravity"); r.u32("JE.StartTime"); r.u32("JE.Duration"); }
  if (td) { r.f32("TD.StartFacing"); r.f32("TD.TotalTurnRads"); r.f32("TD.RadsPerSec"); }
  if (at) { r.i32("AT.TierTransitionID"); r.u8("AT.AnimTier"); r.u32("AT.StartTime"); r.u32("AT.ExtraDuration"); }
}
specs.SMSG_ON_MONSTER_MOVE = (r) => {
  r.guid("MoverGUID"); r.f32("X"); r.f32("Y"); r.f32("Z");
  r.u32("SplineID"); r.bit("CrzTeleport"); r.bit("StopUseFaceDirection"); r.bits(3, "StopDistanceTolerance");
  movementSpline(r);
};
specs.SMSG_FLIGHT_SPLINE_SYNC = (r) => { r.guid("Guid"); r.f32("SplineDist"); };

// CharacterPackets.cpp:618 / :692, MiscPackets.cpp, WorldStatePackets.cpp
specs.SMSG_LOGIN_VERIFY_WORLD = (r) => { r.i32("MapID"); r.f32("X"); r.f32("Y"); r.f32("Z"); r.f32("O"); r.u32("Reason"); };
specs.SMSG_INITIAL_SETUP = (r) => { r.u8("ServerExpansionLevel"); r.u8("ServerExpansionTier"); };
specs.SMSG_BIND_POINT_UPDATE = (r) => { r.f32("X"); r.f32("Y"); r.f32("Z"); r.u32("MapID"); r.u32("AreaID"); };
specs.SMSG_TUTORIAL_FLAGS = (r) => { for (let i = 0; i < 8; i++) r.u32("Tutorial" + i); };
specs.SMSG_SERVER_TIME_OFFSET = (r) => { r.u64("Time"); };
specs.SMSG_LOGIN_SET_TIME_SPEED = (r) => { r.u32("ServerTime"); r.u32("GameTime"); r.f32("NewSpeed"); r.u32("ServerTimeHolidayOffset"); r.u32("GameTimeHolidayOffset"); };
specs.SMSG_INIT_WORLD_STATES = (r) => { r.i32("MapID"); r.i32("AreaID"); r.i32("SubareaID"); const n = r.u32("Count"); for (let i = 0; i < n; i++) { r.i32("Var"); r.i32("Value"); } };
specs.SMSG_UPDATE_WORLD_STATE = (r) => { r.u32("VariableID"); r.i32("Value"); r.bit("Hidden"); };
specs.SMSG_SET_TIME_ZONE_INFORMATION = (r) => { const a = r.bits(7, "L1"), b = r.bits(7, "L2"), c = r.bits(7, "L3"); r.str(a, "ServerTimeTZ"); r.str(b, "GameTimeTZ"); r.str(c, "ServerRegionalTZ"); };
specs.SMSG_UPDATE_TALENT_DATA = (r) => {
  r.u8("ActiveGroup"); r.i32("PrimarySpecialization"); const n = r.u32("Groups");
  for (let i = 0; i < n; i++) { r.i32("G.PrimarySpec"); const t = r.u32("G.Talents"), p = r.u32("G.PvP"), g = r.u32("G.Glyphs"); for (let k = 0; k < t; k++) r.u16("Talent"); for (let k = 0; k < p; k++) { r.u16("PvPTalent"); r.u8("Slot"); } for (let k = 0; k < g; k++) r.u32("Glyph"); }
};

// AuthenticationPackets.cpp:82 AuthSession::Read, :127 AuthResponse::Write, :385 EnterEncryptedMode::Write
specs.CMSG_AUTH_SESSION = (r) => {
  r.u64("DosResponse"); r.u32("RegionID"); r.u32("BattlegroupID"); r.u32("RealmID"); r.bytes(32, "LocalChallenge"); r.bytes(24, "Digest"); r.bit("UseIPv6");
  const n = r.u32("RealmJoinTicketSize"); r.bytes(n, "RealmJoinTicket");
};
specs.SMSG_AUTH_RESPONSE = (r) => {
  r.u32("Result"); const s = r.bit("HasSuccessInfo"), w = r.bit("HasWaitInfo");
  if (s) {
    r.u32("VirtualRealmAddress"); const nvr = r.u32("VirtualRealms"); r.u32("TimeRested"); r.u8("ActiveExpansionLevel"); r.u8("AccountExpansionLevel"); r.u32("TimeSecondsUntilPCKick");
    const nac = r.u32("AvailableClasses"); const nt = r.u32("Templates"); r.u32("CurrencyID"); r.u64("Time");
    for (let i = 0; i < nac; i++) { r.u8("RaceID"); const c = r.u32("Classes"); for (let k = 0; k < c; k++) { r.u8("ClassID"); r.u8("ActiveExp"); r.u8("AccountExp"); r.u8("MinActiveExp"); } }
    r.bit("IsExpansionTrial"); r.bit("ForceCharacterTemplate"); const h = r.bit("HasNumHorde"), a = r.bit("HasNumAlliance"), e = r.bit("HasTrialExpiration"), k = r.bit("HasNewBuildKeys");
    r.u32("BillingPlan"); r.u32("TimeRemain"); r.u32("Unknown735"); r.bit("IGR1"); r.bit("IGR2"); r.bit("IGR3");
    if (h) r.u16("NumHorde"); if (a) r.u16("NumAlliance"); if (e) r.u64("TrialExpiration"); if (k) r.bytes(32, "NewBuildKeys");
    for (let i = 0; i < nvr; i++) { r.u32("RealmAddress"); r.bit("IsLocal"); r.bit("IsInternal"); const l1 = r.bits(8, "NameLen"), l2 = r.bits(8, "NormLen"); r.str(l1, "Name"); r.str(l2, "Normalized"); }
    for (let i = 0; i < nt; i++) { r.u32("TemplateSetId"); const c = r.u32("Classes"); for (let q = 0; q < c; q++) { r.u8("ClassID"); r.u8("FactionGroup"); } const l1 = r.bits(7, "NameLen"), l2 = r.bits(10, "DescLen"); r.str(l1, "Name"); r.str(l2, "Desc"); }
  }
  if (w) { r.u32("WaitCount"); r.u32("WaitTime"); r.u8("AllowedFactionGroup"); r.bit("HasFCM"); r.bit("CanCreateOnlyIfExisting"); }
};
specs.SMSG_ENTER_ENCRYPTED_MODE = (r) => { r.i32("RegionGroup"); r.bytes(64, "Signature"); r.bit("Enabled"); };
