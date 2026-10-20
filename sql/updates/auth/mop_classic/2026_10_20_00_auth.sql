-- MoP Classic client build 5.5.4.70469
DELETE FROM `build_info` WHERE `build` = 70469;
INSERT INTO `build_info` (`build`, `majorVersion`, `minorVersion`, `bugfixVersion`, `hotfixVersion`) VALUES
(70469, 5, 5, 4, NULL);

UPDATE `realmlist` SET `gamebuild` = 70469 WHERE `id` = 1;

-- Recovered from the 70469 client (docs/mop-port/re-notes.md "Auth key capture")
DELETE FROM `build_auth_key` WHERE `build` = 70469;
INSERT INTO `build_auth_key` (`build`, `platform`, `arch`, `type`, `key`) VALUES
(70469, 'Win', 'x64', 'WoW', 0x434E0855EA77C4F37549B0A475059810);
