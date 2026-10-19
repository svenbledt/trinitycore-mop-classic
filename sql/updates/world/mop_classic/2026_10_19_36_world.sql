-- 29705/29706 are SkyFire quest ids that do not exist in 5.5.4; drop the rows 2026_10_19_35 added for them.
DELETE FROM `quest_template_addon` WHERE `ID` IN (29705, 29706);
