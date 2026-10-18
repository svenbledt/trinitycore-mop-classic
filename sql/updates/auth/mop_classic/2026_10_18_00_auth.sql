-- MoP Classic client build 5.5.4.70449
DELETE FROM `build_info` WHERE `build` = 70449;
INSERT INTO `build_info` (`build`, `majorVersion`, `minorVersion`, `bugfixVersion`, `hotfixVersion`) VALUES
(70449, 5, 5, 4, NULL);

UPDATE `realmlist` SET `gamebuild` = 70449 WHERE `id` = 1;

-- Recovered from the 70449 client (docs/mop-port/re-notes.md "Auth key capture")
DELETE FROM `build_auth_key` WHERE `build` = 70449;
INSERT INTO `build_auth_key` (`build`, `platform`, `arch`, `type`, `key`) VALUES
(70449, 'Win', 'x64', 'WoW', 0x9EE19873C7BB34B9AAF127991D5F5755);
