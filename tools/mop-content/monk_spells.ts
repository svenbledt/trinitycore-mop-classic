// Lists the Monk class spells a character learns automatically up to a level, and checks the effects spell_monk.cpp relies on.
// usage: bun tools/mop-content/monk_spells.ts <db2 dir> [max level = 10]
import { readDb2, type Row } from "./src/db2.ts";

const [db2Dir, maxLevelArg = "10"] = process.argv.slice(2);
if (!db2Dir) throw new Error("usage: monk_spells.ts <db2 dir> [max level]");
const DBD = new URL("../mop-re/refs/wowdbdefs/definitions/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const db2 = (name: string) => readDb2(`${db2Dir}/${name}.db2`, `${DBD}${name}.dbd`).rows;
const MONK = 10, SKILL_MONK = 829, ACQUIRE_AUTOMATIC_CHAR_LEVEL = 2, maxLevel = Number(maxLevelArg);

const levels = new Map(db2("SpellLevels").filter(r => r.DifficultyID === 0).map(r => [r.SpellID as number, r]));
const effects = new Map<number, Row[]>();
for (const e of db2("SpellEffect").filter(r => r.DifficultyID === 0))
  effects.set(e.SpellID as number, [...(effects.get(e.SpellID as number) ?? []), e]);
const powers = new Map<number, Row[]>();
for (const p of db2("SpellPower")) powers.set(p.SpellID as number, [...(powers.get(p.SpellID as number) ?? []), p]);

// Player::LearnSkillRewardedSpells: AutomaticCharLevel rows of the class skill, level = max(SpellLevel, BaseLevel).
const learned = db2("SkillLineAbility")
  .filter(r => r.SkillLine === SKILL_MONK && r.AcquireMethod === ACQUIRE_AUTOMATIC_CHAR_LEVEL
    && (!r.ClassMask || ((r.ClassMask as number) & (1 << (MONK - 1)))))
  .map(r => { const l = levels.get(r.Spell as number); return { spell: r.Spell as number, level: Math.max(Number(l?.SpellLevel ?? 0), Number(l?.BaseLevel ?? 0)) }; })
  .filter(r => r.level <= maxLevel).sort((a, b) => a.level - b.level || a.spell - b.spell);

const fx = (id: number) => (effects.get(id) ?? []).sort((a, b) => (a.EffectIndex as number) - (b.EffectIndex as number))
  .map(e => `${e.EffectIndex}:E${e.Effect}${e.EffectAura ? `/A${e.EffectAura}` : ""} bp${e.EffectBasePoints}${e.EffectTriggerSpell ? ` ->${e.EffectTriggerSpell}` : ""}`).join(", ");
const cost = (id: number) => (powers.get(id) ?? []).map(p => `pt${p.PowerType} ${p.ManaCost}${p.RequiredAuraSpellID ? ` (aura ${p.RequiredAuraSpellID})` : ""}`).join(", ");
for (const r of learned) console.log(`lvl ${String(r.level).padStart(2)}  ${r.spell}  cost[${cost(r.spell)}]  ${fx(r.spell)}`);

const chi = db2("PowerType").find(r => r.PowerTypeEnum === 12)!;
console.log(`Chi (PowerType.db2 ${chi.ID}): max ${chi.MaxBasePower}, regen peace ${new Float32Array(new Uint32Array([chi.RegenPeace as number]).buffer)[0]}/s after ${chi.RegenInterruptTimeMS} ms, flags 0x${(chi.Flags as number).toString(16)}`);
console.log(`Monk powers (ChrClassesXPowerTypes): ${db2("ChrClassesXPowerTypes").filter(r => r.ClassID === MONK).map(r => r.PowerType).sort((a, b) => (a as number) - (b as number)).join(", ")}`);

// The effect shapes spell_monk.cpp scripts; a mismatch means the client data changed under the script.
const expect: [number, number, number][] = [[100780, 1, 3], [109132, 0, 3], [115546, 0, 3], [107427, 4, 6], [109131, 4, 6]];
for (const [id, idx, effect] of expect) {
  const e = (effects.get(id) ?? []).find(x => x.EffectIndex === idx);
  if (e?.Effect !== effect) throw new Error(`spell ${id} effect ${idx}: expected effect ${effect}, got ${e?.Effect}`);
}
console.log("script effect checks: ok");
