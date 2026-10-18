# Pandaria (map 870) world import (2026-10-19)

Generators: `tools/mop-content/gen_pandaria.ts` (NPCs, objects, quests) and `tools/mop-content/gen_pandaria_vendors_loot.ts`
(item-side loot, battle pets, mount/pet audit). Shared helpers in `tools/mop-content/src/worlddb.ts`.
Run: `bun tools/mop-content/gen_pandaria.ts <70449 dbc dir>`, then `bun tools/mop-content/gen_pandaria_vendors_loot.ts <70449 dbc dir>`.
Both are deterministic, including re-runs after the worldserver applied their output (they subtract their own previous DELETE keys from `world`).

| File | Content |
|---|---|
| `2026_10_19_20_world.sql` | creature/gameobject templates, difficulty, models, addons, equipment, spells, creature/GO/skinning/pickpocket loot, references |
| `2026_10_19_21_world.sql` | 30,272 creature spawns + addons |
| `2026_10_19_22_world.sql` | 8,340 gameobject spawns + addons |
| `2026_10_19_23_world.sql` | vendors, trainers, gossip, creature_text, SmartAI, waypoints, phase_area, spell_area, conditions, game_tele |
| `2026_10_19_24_world.sql` | 1,594 quests (+ addon, texts, objectives, POIs, starters/enders) |
| `2026_10_19_25_world.sql` | item/milling/prospecting/disenchant/spell/mail loot SkyFire has and world lacks |
| `2026_10_19_26_world.sql` | battle_pet_breeds / battle_pet_quality for 5.5.4 species world lacks |

## Source rules
- **Spawns:** SkyFire (`ref_sfdb`) map 870; master (`ref_master`) adds spawns of entries with no SkyFire spawn within 20 yd (mostly phased scenes).
  SkyFire spawns in game events are skipped (event ids differ between DBs).
- **Creature templates:** master row as the base (modern columns: StaticFlags, CreatureImmunitiesId, flags_extra, KillCredit, DamageModifier),
  SkyFire's MoP values on top (name, faction, npcflag, unit_flags/2, rank, speeds, type, family, vehicle, levels, Health_mod, mana/armor mod,
  gold, type flags). Health: HealthScalingExpansion 4 (MoP curve). Disallowed unit_flags bits (UnitDefines.h) are stripped like the core does.
  npcflag gets GOSSIP when master's gossip menu is used and QUESTGIVER for imported quest givers.
- **Models:** SkyFire modelid1-4 (equal odds, as its ChooseDisplayId) unless master has the same display set (then master's scale/probability).
- **AI:** SkyFire SmartAI, else master SmartAI; ScriptName only if a built script module registers it (Commands, Spells, Pandaria).
- **GO templates:** master (the client reads the data fields); SkyFire for master's type-50 gathering nodes, because 5.5.4/cata nodes are chests (type 3).
  Chest loot: SkyFire rows if it has them, else master's; chests with neither get master's `gameobject_questitem` items (100 %, quest-only).
- **Loot ids:** references renumbered per source (SkyFire 6M + id, master 7M + id); GO loot SkyFire 5.0M + id, master 5.5M + id, quest items 6.5M + entry;
  creature/pickpocket/skinning keep their id unless world uses it (then 5.2M/5.3M/5.4M + id).
- **Gossip:** menu ids are retail ids in both DBs; content from master (GossipOptionIDs, BroadcastText). SkyFire npc_text has no BroadcastText, so SkyFire-only menus are skipped.
- **Quests:** master rows (QuestSortID in the Pandaria zones, or given/ended by imported NPCs/GOs), QuestLevel/MinLevel from SkyFire, givers from master + SkyFire.
- **Battle pets:** breeds SkyFire, else master; qualities master only (TC's table is one default quality per species, SkyFire lists all possible ones).
- Everything already in `world` (cata TDB, Wandering Isle import) is kept as is; map 860 is untouched.

## GUID ranges
Creature and gameobject spawns: SkyFire guid + 30,000,000 (max ~38.2M), master guid + 40,000,000 (max ~49.8M). Deletes use `guid BETWEEN 30000000 AND 49999999`.

## Known gaps (no source)
- Creature loot: only ~157 Pandaria creatures have loot in SkyFire; master TDB has none for map 870. ~1,800 hostile NPCs drop nothing (incl. quest drops).
- Gathering nodes (Ghost Iron, Kyparite, most herbs) and treasure chests: neither DB has loot rows.
- SkyFire-only trainers (64231, 66222, 66980, 66981; npc_trainer has no trainer id/gossip link), 4 SkyFire-only gossip menus.
- Wild battle pets: SkyFire's `battle_pet_wild_pool` has no table in our schema (schema change needed).
- 225 quest ids are not in QuestV2.db2; 57 SkyFire-only quests have no master row to map; ~50 profession quests lack RequiredSkillID in both.
- Mounts/pets the 5.5.4 client teaches through items SkyFire does not have: 56 mount items and 19 pet items, none with a master source
  (`tools/mop-content/data/mop_mount_pet_sources.json`).
