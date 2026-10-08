-- MoP Classic client build 5.5.4.70032
DELETE FROM `build_info` WHERE `build` = 70032;
INSERT INTO `build_info` (`build`, `majorVersion`, `minorVersion`, `bugfixVersion`, `hotfixVersion`) VALUES
(70032, 5, 5, 4, NULL);

-- Arctium launcher static auth seed (client started with --staticseed), see docs/mop-port/re-notes.md "Auth seed key"
DELETE FROM `build_auth_key` WHERE `build` = 70032;
INSERT INTO `build_auth_key` (`build`, `platform`, `arch`, `type`, `key`) VALUES
(70032, 'Win', 'x64', 'WoW', 0x179D3DC3235629D07113A9B3867F97A7);

UPDATE `realmlist` SET `gamebuild` = 70032 WHERE `id` = 1;
