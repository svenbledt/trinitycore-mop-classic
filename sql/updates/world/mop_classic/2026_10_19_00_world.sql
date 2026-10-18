-- Transmogrifiers Warpweaver Hashom (54442) and Warpweaver Dushar (54473) had no gossip menu, so the transmog UI never opened.
-- Source: TC master TDB 1210 creature_template_gossip (menu 21043); option IDs from master, present in the 5.5.4 GossipNPCOption DB2.
DELETE FROM `creature_template_gossip` WHERE `CreatureID` IN (54442, 54473);
INSERT INTO `creature_template_gossip` (`CreatureID`, `MenuID`, `VerifiedBuild`) VALUES
(54442, 21043, 0),
(54473, 21043, 0);

UPDATE `gossip_menu_option` SET `GossipOptionID` = 46949 WHERE `MenuID` = 21043 AND `OptionID` = 0;
UPDATE `gossip_menu_option` SET `GossipOptionID` = 46950 WHERE `MenuID` = 21043 AND `OptionID` = 1;
