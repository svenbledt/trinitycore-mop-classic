-- MoP Classic: Wandering Isle quest prerequisites. The chain (quest_template.RewardNextQuest, SkyFire NextQuestIdChain)
-- had no PrevQuestID, so e.g. 29423 could be taken before 29422 was turned in. Multi-predecessor order from retail
-- sniff 2026-10-18 18-43-54: 29678 after both 29666 and 29677, 29784 after all of 29779-29781 (AND);
-- 29406 follows whichever class version of The Lesson of the Iron Bough the player had (OR).

-- single predecessor
INSERT INTO `quest_template_addon` (`ID`, `PrevQuestID`) VALUES
(29423, 29422), (29769, 29680), (29775, 29774), (29792, 29791), (29796, 29793), (29798, 29665), (29799, 30767),
(30027, 30039), (30033, 30040), (30034, 30041), (30035, 30042), (30036, 30043), (30037, 30044), (30038, 30045),
(30589, 29795), (30590, 30589), (30591, 29792), (30767, 29798), (30818, 30817), (31450, 29800), (29705, 29703),
(29706, 29705)
ON DUPLICATE KEY UPDATE `PrevQuestID` = VALUES(`PrevQuestID`);

-- AND: PrevQuestID holds one, quest-available conditions the others
INSERT INTO `quest_template_addon` (`ID`, `PrevQuestID`) VALUES (29678, 29666), (29784, 29781)
ON DUPLICATE KEY UPDATE `PrevQuestID` = VALUES(`PrevQuestID`);
-- OR: no PrevQuestID, one condition else-group per class version
UPDATE `quest_template_addon` SET `PrevQuestID` = 0 WHERE `ID` = 29406;

DELETE FROM `conditions` WHERE `SourceTypeOrReferenceId` = 19 AND `SourceEntry` IN (29678, 29784, 29406);
INSERT INTO `conditions` (`SourceTypeOrReferenceId`, `SourceGroup`, `SourceEntry`, `SourceId`, `ElseGroup`, `ConditionTypeOrReference`, `ConditionTarget`, `ConditionValue1`, `ConditionValue2`, `ConditionValue3`, `NegativeCondition`, `Comment`) VALUES
(19, 0, 29678, 0, 0, 8, 0, 29677, 0, 0, 0, 'Shu, the Spirit of Water needs 29677 rewarded too'),
(19, 0, 29784, 0, 0, 8, 0, 29779, 0, 0, 0, 'Balanced Perspective needs 29779 rewarded'),
(19, 0, 29784, 0, 0, 8, 0, 29780, 0, 0, 0, 'Balanced Perspective needs 29780 rewarded'),
(19, 0, 29406, 0, 0, 8, 0, 29405, 0, 0, 0, 'The Lesson of the Sandy Fist after The Lesson of the Iron Bough (any class version)'),
(19, 0, 29406, 0, 1, 8, 0, 30027, 0, 0, 0, 'The Lesson of the Sandy Fist after The Lesson of the Iron Bough (any class version)'),
(19, 0, 29406, 0, 2, 8, 0, 30033, 0, 0, 0, 'The Lesson of the Sandy Fist after The Lesson of the Iron Bough (any class version)'),
(19, 0, 29406, 0, 3, 8, 0, 30034, 0, 0, 0, 'The Lesson of the Sandy Fist after The Lesson of the Iron Bough (any class version)'),
(19, 0, 29406, 0, 4, 8, 0, 30035, 0, 0, 0, 'The Lesson of the Sandy Fist after The Lesson of the Iron Bough (any class version)'),
(19, 0, 29406, 0, 5, 8, 0, 30036, 0, 0, 0, 'The Lesson of the Sandy Fist after The Lesson of the Iron Bough (any class version)'),
(19, 0, 29406, 0, 6, 8, 0, 30037, 0, 0, 0, 'The Lesson of the Sandy Fist after The Lesson of the Iron Bough (any class version)'),
(19, 0, 29406, 0, 7, 8, 0, 30038, 0, 0, 0, 'The Lesson of the Sandy Fist after The Lesson of the Iron Bough (any class version)');

-- Flame Spout (59626): retail unit flags 0x02000200 (sniff 18-43-54); the IMMUNE_TO_PC bit kept its flames from hitting players
UPDATE `creature_template` SET `unit_flags` = 33554944 WHERE `entry` = 59626;

-- The Passion of Shen-zin Su (29423): the following Huo (54958) carries Blessing of Huo 102630 (+50% speed to its owner) on
-- retail (sniff 18-43-54); the quest script removes Summon Huo 128700 and Huo himself at turn-in or abandon.
DELETE FROM `creature_template_addon` WHERE `entry` = 54958;
INSERT INTO `creature_template_addon` (`entry`, `auras`) VALUES (54958, '102630');
UPDATE `quest_template_addon` SET `ScriptName` = 'quest_the_passion_of_shen_zin_su' WHERE `ID` = 29423;

-- Retail chain pushes (QUEST_COMPLETE then QUEST_DETAILS within 2 s, all 2026-10-18 ymir sniffs) without a prerequisite here
INSERT INTO `quest_template_addon` (`ID`, `PrevQuestID`) VALUES
(29776, 29775), (29795, 29792), (29793, 30589), (29794, 29796), (29797, 29796), (30987, 31450)
ON DUPLICATE KEY UPDATE `PrevQuestID` = VALUES(`PrevQuestID`);
-- AND sets: 29676 after 29661, 29662 and 29663; 29768 after 29769 and 29770 (PrevQuestID keeps 29662 / 29770)
DELETE FROM `conditions` WHERE `SourceTypeOrReferenceId` = 19 AND `SourceEntry` IN (29676, 29768);
INSERT INTO `conditions` (`SourceTypeOrReferenceId`, `SourceGroup`, `SourceEntry`, `SourceId`, `ElseGroup`, `ConditionTypeOrReference`, `ConditionTarget`, `ConditionValue1`, `ConditionValue2`, `ConditionValue3`, `NegativeCondition`, `Comment`) VALUES
(19, 0, 29676, 0, 0, 8, 0, 29661, 0, 0, 0, '29676 needs 29661 rewarded'),
(19, 0, 29676, 0, 0, 8, 0, 29663, 0, 0, 0, '29676 needs 29663 rewarded'),
(19, 0, 29768, 0, 0, 8, 0, 29769, 0, 0, 0, '29768 needs 29769 rewarded');
