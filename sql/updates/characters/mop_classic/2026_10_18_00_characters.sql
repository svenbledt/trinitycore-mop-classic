-- MoP Classic: transmog outfit tables, copied verbatim from TrinityCore master sql/base/characters_database.sql.
-- character_transmog_outfits already exists unchanged in our base schema; IF NOT EXISTS keeps this file additive.

CREATE TABLE IF NOT EXISTS `character_transmog_outfit` (
  `guid` bigint NOT NULL,
  `transmogOutfitId` int NOT NULL,
  `name` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` int NOT NULL,
  `situationsEnabled` tinyint(1) NOT NULL,
  PRIMARY KEY (`guid`,`transmogOutfitId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `character_transmog_outfit_situation` (
  `guid` bigint NOT NULL,
  `transmogOutfitId` int NOT NULL,
  `situationID` int NOT NULL,
  `specID` int NOT NULL,
  `loadoutID` int NOT NULL,
  `equipmentSetID` int NOT NULL,
  PRIMARY KEY (`guid`,`transmogOutfitId`,`situationID`,`specID`,`loadoutID`,`equipmentSetID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `character_transmog_outfit_slot` (
  `guid` bigint NOT NULL,
  `transmogOutfitId` int NOT NULL,
  `slot` tinyint NOT NULL,
  `slotOption` tinyint NOT NULL,
  `sheatheCategory` tinyint unsigned NOT NULL,
  `itemModifiedAppearanceID` int NOT NULL,
  `appearanceDisplayType` tinyint NOT NULL,
  `spellItemEnchantmentID` int NOT NULL,
  `illusionDisplayType` tinyint NOT NULL,
  `flags` int NOT NULL,
  PRIMARY KEY (`guid`,`transmogOutfitId`,`slot`,`slotOption`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `character_transmog_outfits` (
  `guid` bigint NOT NULL DEFAULT '0',
  `setguid` bigint NOT NULL AUTO_INCREMENT,
  `setindex` tinyint unsigned NOT NULL DEFAULT '0',
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `iconname` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ignore_mask` int NOT NULL DEFAULT '0',
  `appearance0` int NOT NULL DEFAULT '0',
  `appearance1` int NOT NULL DEFAULT '0',
  `appearance2` int NOT NULL DEFAULT '0',
  `appearance3` int NOT NULL DEFAULT '0',
  `appearance4` int NOT NULL DEFAULT '0',
  `appearance5` int NOT NULL DEFAULT '0',
  `appearance6` int NOT NULL DEFAULT '0',
  `appearance7` int NOT NULL DEFAULT '0',
  `appearance8` int NOT NULL DEFAULT '0',
  `appearance9` int NOT NULL DEFAULT '0',
  `appearance10` int NOT NULL DEFAULT '0',
  `appearance11` int NOT NULL DEFAULT '0',
  `appearance12` int NOT NULL DEFAULT '0',
  `appearance13` int NOT NULL DEFAULT '0',
  `appearance14` int NOT NULL DEFAULT '0',
  `appearance15` int NOT NULL DEFAULT '0',
  `appearance16` int NOT NULL DEFAULT '0',
  `appearance17` int NOT NULL DEFAULT '0',
  `appearance18` int NOT NULL DEFAULT '0',
  `mainHandEnchant` int NOT NULL DEFAULT '0',
  `offHandEnchant` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`setguid`),
  UNIQUE KEY `idx_set` (`guid`,`setguid`,`setindex`),
  KEY `Idx_setindex` (`setindex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
