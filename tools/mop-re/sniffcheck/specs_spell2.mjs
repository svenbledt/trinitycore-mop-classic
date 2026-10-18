// Further TC writers (SpellPackets.cpp / CombatLogPackets.cpp) transcribed as reader specs.
import { spellCastLogData, contentTuning } from "./specs_spell.mjs";

export const specs = {};
export const fixed = {};
const logTail = (r) => { if (r.bit("HasLog")) spellCastLogData(r); };
const support = (r) => { r.guid("Sup.Caster"); r.i32("Sup.SpellID"); r.i32("Sup.Amount"); r.f32("Sup.Pct"); };

specs.SMSG_SPELL_HEAL_LOG = (r) => {
  r.guid("Target"); r.guid("Caster"); r.i32("SpellID"); r.i32("Health"); r.i32("OriginalHeal"); r.i32("OverHeal"); r.i32("Absorbed");
  r.bit("Crit"); const a = r.bit("HasCritRollMade"), b = r.bit("HasCritRollNeeded"), log = r.bit("HasLog"), ct = r.bit("HasCT");
  if (log) spellCastLogData(r); if (a) r.f32("CritRollMade"); if (b) r.f32("CritRollNeeded"); if (ct) contentTuning(r);
};
specs.SMSG_SPELL_PERIODIC_AURA_LOG = (r) => {
  r.guid("Target"); r.guid("Caster"); r.i32("SpellID"); const n = r.u32("EffectCount"); const log = r.bit("HasLog");
  for (let i = 0; i < n; i++) {
    r.i32("Effect"); r.i32("Amount"); r.i32("OriginalDamage"); r.i32("OverHealOrKill"); r.i32("SchoolMaskOrPower"); r.i32("AbsorbedOrAmplitude"); r.i32("Resisted");
    const s = r.u32("Supporters"); for (let j = 0; j < s; j++) support(r);
    r.bit("Crit"); const dbg = r.bit("HasDebug"), ct = r.bit("HasCT");
    if (ct) contentTuning(r); if (dbg) { r.f32("CritRollMade"); r.f32("CritRollNeeded"); }
  }
  if (log) spellCastLogData(r);
};
specs.SMSG_SPELL_ENERGIZE_LOG = (r) => { r.guid("Target"); r.guid("Caster"); r.i32("SpellID"); r.i8("Type"); r.i32("Amount"); r.i32("OverEnergize"); logTail(r); };
specs.SMSG_SPELL_INSTAKILL_LOG = (r) => { r.guid("Target"); r.guid("Caster"); r.i32("SpellID"); };
specs.SMSG_SPELL_INTERRUPT_LOG = (r) => { r.guid("Caster"); r.guid("Victim"); r.i32("InterruptedSpellID"); r.i32("SpellID"); r.bit("UnkBit"); };
specs.SMSG_SPELL_OR_DAMAGE_IMMUNE = (r) => { r.guid("Caster"); r.guid("Victim"); r.u32("SpellID"); r.bit("IsPeriodic"); };
specs.SMSG_SPELL_DAMAGE_SHIELD = (r) => { r.guid("Attacker"); r.guid("Defender"); r.i32("SpellID"); r.i32("Total"); r.i32("Orig"); r.i32("OverKill"); r.i32("School"); r.i32("LogAbsorbed"); logTail(r); };
specs.SMSG_SPELL_ABSORB_LOG = (r) => {
  r.guid("Attacker"); r.guid("Victim"); r.i32("AbsorbedSpellID"); r.i32("AbsorbSpellID"); r.guid("Caster"); r.i32("Absorbed"); r.i32("OriginalDamage");
  const n = r.u32("Supporters"); for (let i = 0; i < n; i++) support(r); r.bit("Crit"); logTail(r);
};
specs.SMSG_SPELL_HEAL_ABSORB_LOG = (r) => { r.guid("Target"); r.guid("AbsorbCaster"); r.guid("Healer"); r.i32("AbsorbSpellID"); r.i32("AbsorbedSpellID"); r.i32("Absorbed"); r.i32("OriginalHeal"); r.bit("HasLog"); const ct = r.bit("HasCT"); if (ct) contentTuning(r); };
specs.SMSG_SPELL_MISS_LOG = (r) => { r.i32("SpellID"); r.guid("Caster"); const n = r.u32("Count"); r.bit("Unk554"); for (let i = 0; i < n; i++) { r.guid("Victim"); r.u8("MissReason"); if (r.bit("HasDebug")) { r.f32("HitRoll"); r.f32("HitRollNeeded"); } } };
specs.SMSG_PROC_RESIST = (r) => { r.guid("Caster"); r.guid("Target"); r.i32("SpellID"); const a = r.bit("HasRolled"), b = r.bit("HasNeeded"); if (a) r.f32("Rolled"); if (b) r.f32("Needed"); };
specs.SMSG_SPELL_DISPELL_LOG = (r) => {
  r.bit("IsSteal"); r.bit("IsBreak"); r.guid("Target"); r.guid("Caster"); r.i32("DispelledBySpellID"); const n = r.u32("Count");
  for (let i = 0; i < n; i++) { r.i32("SpellID"); r.bit("Harmful"); const a = r.bit("HasRolled"), b = r.bit("HasNeeded"); if (a) r.i32("Rolled"); if (b) r.i32("Needed"); }
};
specs.SMSG_SPELL_EXECUTE_LOG = (r) => {
  r.guid("Caster"); r.i32("SpellID"); const n = r.u32("Effects");
  for (let i = 0; i < n; i++) {
    r.i32("Effect"); const c = []; for (let k = 0; k < 6; k++) c.push(r.u32("Count" + k));
    for (let j = 0; j < c[0]; j++) { r.guid("PD.Victim"); r.u32("PD.Points"); r.i8("PD.Type"); r.f32("PD.Amplitude"); }
    for (let j = 0; j < c[1]; j++) { r.guid("EA.Victim"); r.u32("EA.Num"); }
    for (let j = 0; j < c[2]; j++) { r.guid("DD.Victim"); r.i32("DD.Item"); r.i32("DD.Amount"); }
    for (let j = 0; j < c[3]; j++) r.guid("GV.Victim");
    for (let j = 0; j < c[4]; j++) r.i32("TS.Item");
    for (let j = 0; j < c[5]; j++) r.i32("FP.Item");
  }
  logTail(r);
};
// HitInfo bits from SharedDefines/UnitDefines: UNK1 0x1, FULL_ABSORB 0x20, PARTIAL_ABSORB 0x40, FULL_RESIST 0x80, PARTIAL_RESIST 0x100, UNK12 0x1000, BLOCK 0x2000, RAGE_GAIN 0x800000
export const HI = { UNK1: 0x1, FA: 0x20, PA: 0x40, FR: 0x80, PR: 0x100, UNK12: 0x1000, BLOCK: 0x2000, RAGE: 0x800000 };
specs.SMSG_ATTACKER_STATE_UPDATE = (r) => {
  logTail(r); const sz = r.u32("AttackRoundInfoSize"); const start = r.pos();
  const hi = r.u32("HitInfo"); r.guid("Attacker"); r.guid("Victim"); r.i32("Damage"); r.i32("OriginalDamage"); r.i32("OverDamage");
  if (r.u8("HasSubDmg")) { r.i32("Sub.School"); r.f32("Sub.FDamage"); r.i32("Sub.Damage"); if (hi & (HI.FA | HI.PA)) r.i32("Sub.Absorbed"); if (hi & (HI.FR | HI.PR)) r.i32("Sub.Resisted"); }
  r.u8("VictimState"); r.u32("AttackerState"); r.u32("MeleeSpellID");
  if (hi & HI.BLOCK) r.i32("BlockAmount"); if (hi & HI.RAGE) r.i32("RageGained");
  if (hi & HI.UNK1) { r.u32("S1"); for (let i = 0; i < 8; i++) r.f32("S"); for (let i = 0; i < 5; i++) { r.f32("S10"); r.f32("S11"); } r.u32("S12"); }
  if (hi & (HI.BLOCK | HI.UNK12)) r.f32("Unk");
  contentTuning(r);
  r.log("RoundInfoConsumed", r.pos() - start, r.pos());
};
specs.SMSG_CAST_FAILED = (r) => { r.guid("CastID"); r.i32("SpellID"); r.i32("Visual"); r.i32("Reason"); r.i32("Arg1"); r.i32("Arg2"); };
specs.SMSG_PET_CAST_FAILED = (r) => { r.guid("CastID"); r.i32("SpellID"); r.i32("Reason"); r.i32("Arg1"); r.i32("Arg2"); };
const spellMods = (r) => { const n = r.u32("Count"); for (let i = 0; i < n; i++) { r.u8("ModIndex"); const m = r.u32("DataCount"); for (let j = 0; j < m; j++) { r.f32("Value"); r.u8("ClassIndex"); } } };
specs.SMSG_SET_FLAT_SPELL_MODIFIER = spellMods; specs.SMSG_SET_PCT_SPELL_MODIFIER = spellMods;
specs.SMSG_PLAY_SPELL_VISUAL = (r) => {
  r.guid("Source"); r.guid("Target"); r.guid("Transport"); r.f32("X"); r.f32("Y"); r.f32("Z"); r.u32("SpellVisualID"); r.f32("TravelSpeed");
  r.u8("HitReason"); r.u8("MissReason"); r.u8("ReflectStatus"); r.f32("LaunchDelay"); r.f32("MinDuration"); r.bit("SpeedAsTime");
};
specs.SMSG_PLAY_SPELL_VISUAL_KIT = (r) => { r.guid("Unit"); r.i32("KitRecID"); r.i32("KitType"); r.u32("Duration"); r.bit("MountedVisual"); };
specs.SMSG_SPELL_CHANNEL_START = (r) => {
  r.guid("Caster"); r.i32("SpellID"); r.i32("Visual"); r.u32("Duration"); const a = r.bit("HasImmunities"), b = r.bit("HasHealPrediction");
  if (a) { r.i32("SchoolImm"); r.i32("Imm"); } if (b) { r.guid("HP.Target"); r.i32("P.Points"); r.u32("P.Type"); r.guid("P.Beacon"); }
};
specs.SMSG_SPELL_CHANNEL_UPDATE = (r) => { r.guid("Caster"); r.i32("TimeRemaining"); };
specs.SMSG_SPELL_DELAYED = (r) => { r.guid("Caster"); r.u32("ActualDelay"); };
specs.SMSG_SEND_KNOWN_SPELLS = (r) => { r.bit("InitialLogin"); const a = r.u32("Known"), b = r.u32("Fav"); for (let i = 0; i < a + b; i++) r.u32("Spell"); };
specs.SMSG_SEND_UNLEARN_SPELLS = (r) => { const n = r.u32("Count"); for (let i = 0; i < n; i++) r.u32("Spell"); };
specs.SMSG_SEND_SPELL_HISTORY = (r) => { const n = r.u32("Count"); for (let i = 0; i < n; i++) { r.u32("SpellID"); r.u32("ItemID"); r.u32("Category"); r.i32("Recovery"); r.i32("CatRecovery"); r.f32("ModRate"); const a = r.bit("HasU1"), b = r.bit("HasU2"); r.bit("OnHold"); if (a) r.u32("U1"); if (b) r.u32("U2"); } };
specs.SMSG_SEND_SPELL_CHARGES = (r) => { const n = r.u32("Count"); for (let i = 0; i < n; i++) { r.u32("Category"); r.u32("NextRecovery"); r.f32("ModRate"); r.u8("Consumed"); } };
specs.SMSG_SPELL_COOLDOWN = (r) => { r.guid("Caster"); r.u8("Flags"); const n = r.u32("Count"); for (let i = 0; i < n; i++) { r.u32("SrecID"); r.u32("Forced"); r.f32("ModRate"); } };
specs.SMSG_COOLDOWN_EVENT = (r) => { r.i32("SpellID"); r.bit("IsPet"); };
specs.SMSG_CLEAR_COOLDOWN = (r) => { r.u32("SpellID"); r.bit("ClearOnHold"); r.bit("IsPet"); };
specs.SMSG_MODIFY_COOLDOWN = (r) => { r.i32("SpellID"); r.i32("Delta"); r.bit("IsPet"); r.bit("WithoutCat"); };
specs.SMSG_SET_SPELL_CHARGES = (r) => { r.i32("Category"); r.u32("NextRecovery"); r.u8("Consumed"); r.f32("ModRate"); r.bit("IsPet"); };
specs.SMSG_UNLEARNED_SPELLS = (r) => { const n = r.u32("Count"); for (let i = 0; i < n; i++) r.u32("Spell"); r.bit("Suppress"); };
const learned = (r) => { r.i32("SpellID"); r.bit("IsFavorite"); const a = r.bit("HasF8"), b = r.bit("HasSuperceded"), c = r.bit("HasTraitDef"); if (a) r.i32("F8"); if (b) r.i32("Superceded"); if (c) r.i32("TraitDef"); };
specs.SMSG_LEARNED_SPELLS = (r) => { const n = r.u32("Count"); r.u32("SpecializationID"); r.u32("Unk8"); r.bit("Suppress"); r.bit("UnkBit"); for (let i = 0; i < n; i++) learned(r); };
specs.SMSG_SUPERCEDED_SPELLS = (r) => { const n = r.u32("Count"); for (let i = 0; i < n; i++) learned(r); };
specs.SMSG_AURA_UPDATE = (r) => {
  r.bit("UpdateAll"); const n = r.bits(9, "AuraCount");
  for (let i = 0; i < n; i++) {
    r.u16("Slot"); if (!r.bit("HasAuraData")) continue;
    r.guid("CastID"); r.i32("SpellID"); r.i32("Visual"); r.u16("Flags"); r.u32("ActiveFlags"); r.u16("CastLevel"); r.u8("Applications"); r.i32("ContentTuningID");
    r.f32("Dst.X"); r.f32("Dst.Y"); r.f32("Dst.Z");
    const cu = r.bit("HasCastUnit"), cu2 = r.bit("HasCastUnit2"), du = r.bit("HasDuration"), re = r.bit("HasRemaining"), tm = r.bit("HasTimeMod");
    const p = r.bits(6, "Points"), ep = r.bits(6, "EstPoints"), ct = r.bit("HasCT"), u268 = r.bit("HasUnk268"); if (u268) r.bits(2, "Unk268");
    if (ct) contentTuning(r); if (cu) r.guid("CastUnit"); if (cu2) r.guid("CastUnit2"); if (du) r.u32("Duration"); if (re) r.u32("Remaining"); if (tm) r.f32("TimeMod");
    for (let j = 0; j < p + ep; j++) r.f32("Point");
  }
  r.guid("UnitGUID");
};
specs.CMSG_CANCEL_CAST = (r) => { r.guid("CastID"); r.i32("SpellID"); };

// 5.5.4: no Supporters count/list (same as WPP 5.5.3 HandleSpellAbsorbLog)
fixed.SMSG_SPELL_ABSORB_LOG = (r) => {
  r.guid("Attacker"); r.guid("Victim"); r.i32("AbsorbedSpellID"); r.i32("AbsorbSpellID"); r.guid("Caster"); r.i32("Absorbed"); r.i32("OriginalDamage");
  r.bit("Crit"); logTail(r);
};
