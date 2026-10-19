-- SpecializationSpells.db2, layout FA4367B5 (WoWDBDefs 5.5.4; matches the 70449 client file header).
-- Schema as dropped by cata_classic 2024_07_27_00_hotfixes.sql.

DROP TABLE IF EXISTS `specialization_spells`;
DROP TABLE IF EXISTS `specialization_spells_locale`;
CREATE TABLE `specialization_spells` (
  `Description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ID` int unsigned NOT NULL DEFAULT '0',
  `SpecID` smallint unsigned NOT NULL DEFAULT '0',
  `SpellID` int NOT NULL DEFAULT '0',
  `OverridesSpellID` int NOT NULL DEFAULT '0',
  `DisplayOrder` tinyint unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`VerifiedBuild`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `specialization_spells_locale` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `Description_lang` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`locale`,`VerifiedBuild`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
/*!50500 PARTITION BY LIST  COLUMNS(locale)
(PARTITION deDE VALUES IN ('deDE') ENGINE = InnoDB,
 PARTITION esES VALUES IN ('esES') ENGINE = InnoDB,
 PARTITION esMX VALUES IN ('esMX') ENGINE = InnoDB,
 PARTITION frFR VALUES IN ('frFR') ENGINE = InnoDB,
 PARTITION itIT VALUES IN ('itIT') ENGINE = InnoDB,
 PARTITION koKR VALUES IN ('koKR') ENGINE = InnoDB,
 PARTITION ptBR VALUES IN ('ptBR') ENGINE = InnoDB,
 PARTITION ruRU VALUES IN ('ruRU') ENGINE = InnoDB,
 PARTITION zhCN VALUES IN ('zhCN') ENGINE = InnoDB,
 PARTITION zhTW VALUES IN ('zhTW') ENGINE = InnoDB) */;
