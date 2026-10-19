-- Monk Blackout Kick: damage from the 5.5.4 tooltip formula (DB2 effect has only BasePoints 1)
DELETE FROM `spell_script_names` WHERE `spell_id` = 100784 AND `ScriptName` = 'spell_monk_blackout_kick';
INSERT INTO `spell_script_names` (`spell_id`, `ScriptName`) VALUES (100784, 'spell_monk_blackout_kick');
