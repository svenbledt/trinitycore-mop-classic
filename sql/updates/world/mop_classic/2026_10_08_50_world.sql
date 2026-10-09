-- MoP Classic: 5.5.x ChrClasses enables Monk, but TDB 4.4.2 has no player_classlevelstats for class 10.
-- Drop Monk create info until Phase 4 imports sourced Monk stats (rows are reproducible from TDB 4.4.2).
DELETE FROM `playercreateinfo` WHERE `class`=10;
