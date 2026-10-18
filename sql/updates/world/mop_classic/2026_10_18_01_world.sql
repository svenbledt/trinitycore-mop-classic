-- MoP Classic: Monk basics (phase3-4-plan.md step 3). Spell IDs and effects: client 5.5.4.70449 DB2s, listed by
-- tools/mop-content/monk_spells.ts; behaviour from SkyFire 5.4.8, script structure from TrinityCore master.

-- Jab (and its weapon-override variants): effect 1 is a DUMMY in 5.5.4 (5.4.8 had ENERGIZE Chi), so the script grants the Chi.
-- Roll: master/SkyFire both trigger 107427 from 109132; 109131 is the backward roll (both exist in SpellName.db2).
-- Provoke: master/SkyFire redirect to 116189, or 118635 on the caster's Black Ox Statue.
DELETE FROM `spell_script_names` WHERE `ScriptName` IN ('spell_monk_jab','spell_monk_roll','spell_monk_roll_aura','spell_monk_provoke');
INSERT INTO `spell_script_names` (`spell_id`,`ScriptName`) VALUES
(100780,'spell_monk_jab'),
(108557,'spell_monk_jab'),
(115687,'spell_monk_jab'),
(115693,'spell_monk_jab'),
(115695,'spell_monk_jab'),
(115698,'spell_monk_jab'),
(109132,'spell_monk_roll'),
(107427,'spell_monk_roll_aura'),
(109131,'spell_monk_roll_aura'),
(115546,'spell_monk_provoke');

-- Stance of the Fierce Tiger on first login: Jab/Tiger Palm/Blackout Kick need a Monk stance (SpellShapeshift.db2 forms 20/23/24)
-- and Jab's Energy cost row requires aura 103985. SkyFire casts it on every Monk login (CharacterHandler.cpp).
-- TODO(verify): retail 5.5.4 sniff of a new Monk's first login (aura 103985 present at enter world).
DELETE FROM `playercreateinfo_cast_spell` WHERE `classMask`=512 AND `spell`=103985;
INSERT INTO `playercreateinfo_cast_spell` (`raceMask`,`classMask`,`createMode`,`spell`,`note`) VALUES
(0,512,0,103985,'Monk - Stance of the Fierce Tiger');
