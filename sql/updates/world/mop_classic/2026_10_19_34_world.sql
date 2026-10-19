-- MoP Classic: Master Li Fei duel brazier bunnies (54900-54902) only exist in the duel phase 504 on retail
-- (sniff 2026-10-18 18-43-54 #4334); in phase 0 their Blessing of the Red/Purple/Blue Flame auras never went away.
-- gen_wandering_isle_audit.ts now emits PhaseId 504; this fixes databases that applied 2026_10_19_10 before that.
UPDATE `creature` SET `PhaseId` = 504 WHERE `guid` BETWEEN 9520000 AND 9520002 AND `id` IN (54900, 54901, 54902);
