-- MoP Classic: Flame Spout (59626) timing from retail 5.5.4.70449 sniff (dump 2026-10-18 18-43-54, quests 29420/29421):
-- 114686 every 9.6-22.6 s while the player is near, 114684 (5 x 1 s pulses of 114685) 3.2 s after it. Was 30-50 s / 3-5 s.
UPDATE `smart_scripts` SET `event_param1` = 0, `event_param2` = 10000, `event_param3` = 9600, `event_param4` = 22600
WHERE `entryorguid` = 59626 AND `source_type` = 0 AND `id` = 0;
UPDATE `smart_scripts` SET `event_param1` = 3200, `event_param2` = 3200
WHERE `entryorguid` = 5962600 AND `source_type` = 9 AND `id` = 0;
