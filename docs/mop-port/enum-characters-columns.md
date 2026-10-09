# EnumCharactersResult::CharacterInfoBasic column legend

Index → column for the `fields[N]` reads in `CharacterInfoBasic(Field const*)`
(`src/server/game/Server/Packets/CharacterPackets.cpp`). The matching `SELECT`
is built in `CharacterHandler.cpp` (`HandleCharEnum`/`LoginQueryHolder`).

| # | column | # | column |
|---|---|---|---|
| 0 | characters.guid | 15 | character_pet.modelid |
| 1 | characters.name | 16 | character_pet.level |
| 2 | characters.race | 17 | characters.equipmentCache |
| 3 | characters.class | 18 | character_banned.guid |
| 4 | characters.gender | 19 | characters.slot |
| 5 | characters.level | 20 | characters.logout_time |
| 6 | characters.zone | 21 | characters.activeTalentGroup |
| 7 | characters.map | 22 | characters.lastLoginBuild |
| 8 | characters.position_x | 23 | characters.personalTabardEmblemStyle |
| 9 | characters.position_y | 24 | characters.personalTabardEmblemColor |
| 10 | characters.position_z | 25 | characters.personalTabardBorderStyle |
| 11 | guild_member.guildid | 26 | characters.personalTabardBorderColor |
| 12 | characters.playerFlags | 27 | characters.personalTabardBackgroundColor |
| 13 | characters.at_login | 28 | character_declinedname.genitive |
| 14 | character_pet.entry | | |
