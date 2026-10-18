// TC layouts from SpellPackets.cpp / CombatLogPackets.cpp / CombatLogPacketsCommon.cpp.
import { movementInfo } from "./specs_movement.mjs";

export const V = { // variant knobs to test hypotheses without editing specs
  tlocExtraU32: false,  // u32 between transport guid and position in TargetLocation
};

const vec3 = (r, n) => { r.f32(n + ".X"); r.f32(n + ".Y"); r.f32(n + ".Z"); };
export function targetLocation(r, n = "Loc") { r.guid(n + ".Transport"); if (V.tlocExtraU32) r.u32(n + ".Unk554"); vec3(r, n); }

// SpellPackets.cpp:315 operator<<(SpellTargetData) (reader at :165 is identical)
export function spellTargetData(r) {
  r.flush();
  r.u32("Target.Flags"); r.guid("Target.Unit"); r.guid("Target.Item"); r.guid("Target.Unk28");
  r.bit("Target.Unk38");
  const src = r.bit("HasSrc"), dst = r.bit("HasDst"), ori = r.bit("HasOrientation"), map = r.bit("HasMapID");
  const nl = r.bits(7, "NameLen");
  if (src) targetLocation(r, "Src");
  if (dst) targetLocation(r, "Dst");
  if (ori) r.f32("Orientation");
  if (map) r.i32("MapID");
  r.str(nl, "Name");
}

// CombatLogPacketsCommon.cpp:91
export function spellCastLogData(r) {
  r.u64("Log.Health"); r.i32("Log.AP"); r.i32("Log.SP"); r.i32("Log.Armor"); r.i32("Log.U1105_1"); r.i32("Log.U1105_2");
  const n = r.bits(9, "Log.PowerCount");
  for (let i = 0; i < n; i++) { r.i8("Pow.Type"); r.i32("Pow.Amount"); r.i32("Pow.Cost"); }
}
export function contentTuning(r) {
  r.u16("CT.PlayerItemLevel"); r.i16("CT.PlayerLevelDelta"); r.u32("CT.TargetItemLevel"); r.u8("CT.TargetLevel"); r.u8("CT.Expansion");
  r.u8("CT.MinScaling"); r.u8("CT.MaxScaling"); r.i8("CT.ScalingDelta"); r.bits(4, "CT.Type"); r.bits(1, "CT.ScalesWithItemLevel");
}

// SpellPackets.cpp:395
export function spellCastData(r) {
  r.guid("CasterGUID"); r.guid("CasterUnit"); r.guid("CastID"); r.guid("OriginalCastID");
  r.i32("SpellID"); r.i32("SpellXSpellVisualID");
  r.u32("CastFlags"); r.u32("CastFlagsEx"); r.u32("CastFlagsEx2"); r.u32("CastTime");
  r.u32("Missile.TravelTime"); r.f32("Missile.Pitch");
  r.u8("DestLocSpellCastIndex");
  r.i32("Immunities.School"); r.i32("Immunities.Value");
  r.i32("Predict.Points"); r.u32("Predict.Type"); r.guid("Predict.Beacon");
  const hit = r.bits(16, "HitCount"), miss = r.bits(16, "MissCount"), ms = r.bits(16, "MissStatusCount");
  const pw = r.bits(9, "PowerCount"), runes = r.bit("HasRunes"), tp = r.bits(16, "TargetPoints");
  const ammo = r.bit("HasAmmoDisplay"), ammoInv = r.bit("HasAmmoInvType");
  spellTargetData(r);
  for (let i = 0; i < hit; i++) r.guid("Hit");
  for (let i = 0; i < miss; i++) r.guid("Miss");
  for (let i = 0; i < ms; i++) { if (r.u8("MissReason") === 11) r.u8("ReflectStatus"); }
  for (let i = 0; i < pw; i++) { r.i8("Power.Type"); r.i32("Power.Cost"); }
  if (runes) { r.u8("Runes.Start"); r.u8("Runes.Count"); const c = r.u32("Runes.CdCount"); r.bytes(c, "Runes.Cd"); }
  for (let i = 0; i < tp; i++) targetLocation(r, "TP");
  if (ammo) r.i32("AmmoDisplayID");
  if (ammoInv) r.i32("AmmoInventoryType");
}

export const specs = {};
specs.SMSG_SPELL_START = (r) => spellCastData(r);
specs.SMSG_SPELL_GO = (r) => { spellCastData(r); if (r.bit("HasLog")) spellCastLogData(r); };

// CombatLogPackets.cpp:39
specs.SMSG_SPELL_NON_MELEE_DAMAGE_LOG = (r) => {
  r.guid("Me"); r.guid("Caster"); r.guid("CastID"); r.i32("SpellID"); r.i32("Visual");
  r.i32("Damage"); r.i32("OriginalDamage"); r.i32("Overkill"); r.u8("SchoolMask"); r.i32("Absorbed"); r.i32("Resisted"); r.i32("ShieldBlock");
  r.bit("Periodic"); r.bits(7, "Flags"); r.bit("Debug"); const log = r.bit("HasLog"); const ct = r.bit("HasContentTuning");
  if (log) spellCastLogData(r);
  if (ct) contentTuning(r);
};

// SpellPackets.cpp:281 CastSpell::Read -> SpellCastRequest (:229)
export function spellCastRequest(r) {
  r.guid("CastID"); r.u8("SendCastFlags"); r.i32("Misc0"); r.i32("Misc1"); r.i32("Misc3"); r.i32("SpellID"); r.i32("Visual");
  r.f32("Missile.Pitch"); r.f32("Missile.Speed"); r.guid("CraftingNPC");
  const cur = r.u32("OptCurrencies"), reag = r.u32("OptReagents"), rem = r.u32("RemovedMods"); r.u8("CraftingFlags");
  for (let i = 0; i < cur; i++) { r.i32("Cur.ID"); r.i32("Cur.Count"); }
  r.flush();
  const u18 = r.bit("HasUnk18"), mv = r.bit("HasMoveUpdate"), w = r.bits(2, "WeightCount"), co = r.bit("HasCraftingOrderID");
  spellTargetData(r);
  if (u18) r.i32("Unk18");
  if (co) r.u64("CraftingOrderID");
  const reagent = () => { r.i32("R.ItemID"); r.i32("R.Slot"); const q = r.bit("R.HasQty"), u = r.bit("R.HasUnk12"); r.flush(); if (q) r.i32("R.Qty"); if (u) r.i32("R.Unk12"); if (r.bit("R.HasU1000")) r.u8("R.U1000"); };
  for (let i = 0; i < reag; i++) reagent();
  for (let i = 0; i < rem; i++) reagent();
  if (mv) movementInfo(r);
  for (let i = 0; i < w; i++) { r.flush(); r.bits(2, "W.Type"); r.i32("W.ID"); r.u32("W.Qty"); }
}
specs.CMSG_CAST_SPELL = spellCastRequest;
specs.CMSG_USE_ITEM = (r) => { r.u8("PackSlot"); r.u8("Slot"); r.guid("CastItem"); spellCastRequest(r); };
specs.CMSG_PET_CAST_SPELL = (r) => { r.guid("Pet"); spellCastRequest(r); };

specs.SMSG_SPELL_FAILED_OTHER = (r) => { r.guid("CasterUnit"); r.guid("CastID"); r.u32("SpellID"); r.i32("Visual"); r.u8("Reason"); };
specs.SMSG_SPELL_FAILURE = (r) => { r.guid("CasterUnit"); r.guid("CastID"); r.i32("SpellID"); r.i32("Visual"); r.u16("Reason"); };
specs.SMSG_SPELL_PREPARE = (r) => { r.guid("ClientCastID"); r.guid("ServerCastID"); };

// ---- corrected 5.5.4 hypotheses (named *_554) ----
export const fixed = {};
fixed.SMSG_SPELL_NON_MELEE_DAMAGE_LOG = (r) => {
  r.guid("Me"); r.guid("Caster"); r.guid("CastID"); r.i32("SpellID"); r.i32("Visual");
  r.i32("Damage"); r.i32("OriginalDamage"); r.i32("Overkill"); r.u8("SchoolMask"); r.i32("Absorbed"); r.i32("Resisted"); r.i32("ShieldBlock");
  r.i32("Unk554"); r.i32("Flags");
  r.bit("Periodic"); const dbg = r.bit("HasDebug"); const log = r.bit("HasLog"); const ct = r.bit("HasContentTuning");
  if (log) spellCastLogData(r);
  if (dbg) { r.f32("Dbg.CritRoll"); r.f32("Dbg.CritNeeded"); r.f32("Dbg.HitRoll"); r.f32("Dbg.HitNeeded"); r.f32("Dbg.MissChance"); r.f32("Dbg.DodgeChance"); r.f32("Dbg.ParryChance"); r.f32("Dbg.BlockChance"); r.f32("Dbg.GlanceChance"); r.f32("Dbg.CrushChance"); }
  if (ct) contentTuning(r);
};
