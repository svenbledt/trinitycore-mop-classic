-- MoP Classic client build 5.5.4.70579
DELETE FROM `build_info` WHERE `build` = 70579;
INSERT INTO `build_info` (`build`, `majorVersion`, `minorVersion`, `bugfixVersion`, `hotfixVersion`) VALUES
(70579, 5, 5, 4, NULL);

UPDATE `realmlist` SET `gamebuild` = 70579 WHERE `id` = 1;

-- Recovered from the 70579 client (docs/mop-port/re-notes.md "Auth key capture")
DELETE FROM `build_auth_key` WHERE `build` = 70579;
INSERT INTO `build_auth_key` (`build`, `platform`, `arch`, `type`, `key`) VALUES
(70579, 'Win', 'x64', 'WoW', 0x109C69C0E73A5C0A3DC3BE22C94EE541);
