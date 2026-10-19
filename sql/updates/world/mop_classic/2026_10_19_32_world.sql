-- MoP Classic: Prayer of Mending (5.5.4 dummy layout, jump 351575) and Lifebloom bloom; both heal 1 without a script.
DELETE FROM `spell_script_names` WHERE `ScriptName` IN ('spell_pri_prayer_of_mending','spell_pri_prayer_of_mending_aura',
'spell_pri_prayer_of_mending_jump','spell_dru_lifebloom');
INSERT INTO `spell_script_names` (`spell_id`, `ScriptName`) VALUES
(33076, 'spell_pri_prayer_of_mending'),
(41635, 'spell_pri_prayer_of_mending_aura'),
(351575, 'spell_pri_prayer_of_mending_jump'),
(33763, 'spell_dru_lifebloom'),
(94447, 'spell_dru_lifebloom');
