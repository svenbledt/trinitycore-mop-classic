# Wandering Isle: retail sniffs vs our data, per quest (2026-10-18)

Ground truth: retail 5.5.4.70449 sniffs `m1.pkt` (create, first login, quests 30039-29418) and `m2.pkt` (29420 to the Alliance
choice), local scratchpad only. Facts are extracted by `tools/mop-content/sniff_wandering_isle.ts` into
`tools/mop-content/data/wandering_isle_sniff.json` and applied by `gen_wandering_isle.ts` (sniff > SkyFire > TC master).
Second-half mechanisms and their port: `wandering-isle-second-half.md`.

**Applied from the sniff:** 91 quest_template values (RewardBonusMoney on most quests, Flags/FlagsEx with retail's 0x40000
DISABLE_COMPLETION_TEXT, QuestPackageID 29786, RewardNextQuest), 7 SourceSpellIDs (29423, 29776, 29784, 29786, 29787, 29790,
30589), gossip: real GossipOptionIDs/OptionNpc/SpellID on 18 menus, options added for 13050 (125637), 13140 (125683), 13204
(125709), 13726 (126168), 15125 (130357, 130361), menu texts for 13140, 13204, 13220, 13201, 13249, 13726, creature 65558 → 13220;
the 31450 finale (gossip, spells, movie, teleport point, Aysa's Stormwind spawn and phase 1231).

**Checked and equal:** QuestLevel, MinLevel, QuestSortID, XP/money difficulty of all 67 sniffed quests (SkyFire levels); every
sniffed giver and ender is in the data (✓ below); quest order follows PrevQuestID/NextQuestID/ExclusiveGroup; 1940 objects seen on
map 860, 1536 within 8 yd of an imported spawn (the rest are wandering mobs, summons and vehicles; all 377 seen creature and 163
gameobject entries have templates, except 196534, 211012 and GO 570926, which no source has).

**Not taken from the sniff:** QUERY_QUEST_INFO fields after RewardSpell (WPP's 5.5.4 reader is misaligned there), RewardSpell 81040
(29776; not in the client SpellName.db2), RewardNextQuest 30988/31013 (Stormwind/Orgrimmar follow-ups not imported).

Credit trigger = the last two player or NPC spell/gossip/use events before the first credit of each objective.

| # | Quest | Sniff giver → ender | DB giver → ender | DB prev/next/excl | Objectives (DB) | Credit trigger in the sniff |
|---|---|---|---|---|---|---|
| 1 | 30039 | player → 53566 | - (player push) → 53566 (53566 ✓) | 0/0/0 | - |  |
| 2 | 30027 | 53566 → 53566 | 53566 (53566 ✓) → 53566 (53566 ✓) | 0/29406/0 | 0:54139x1 | obj 54139: SPELL_GO P spell 108561 -> dst  / SPELL_GO P spell 100707 -> dst  |
| 3 | 29524 | 53566 → 53566 | 53566 (53566 ✓) → 53566 (53566 ✓) | 29406/29408/0 | 0:54586x6 | obj 54586: SPELL_GO P spell 108557 -> dst  / SPELL_GO Creature:65470:5565325 spell 109079 -> dst  |
| 4 | 29408 | 53566 → 53566 | 53566 (53566 ✓) → 53566 (53566 ✓) | 29524/29409/0 | 0:59591x1 0:59570x1 | obj 59591: SPELL_GO P spell 100711 -> dst  / SPELL_GO P spell 93425 -> dst ; obj 59570: c:GAME_OBJ_REPORT_USE GameObjectGUID: GameObject/0 Entry: 210986  / SPELL_GO P spell 6247 -> dst  |
| 5 | 29409 | 53566 → 53566 | 53566 (53566 ✓) → 53566 (53566 ✓) | 29408/29410/0 | 0:54611x1 | obj 54611: SPELL_GO P spell 115695 -> dst  / SPELL_GO P spell 93425 -> dst  |
| 6 | 29410 | 53566 → 54943 | 53566 (53566 ✓) → 54943 (54943 ✓) | 29409/29424/0 | - |  |
| 7 | 29424 | 54943 → 54943 | 54943 (54943 ✓) → 54943 (54943 ✓) | 29410/29414/-29424 | 1:72071x6 |  |
| 8 | 29419 | 54943 → 54943 | 54943 (54943 ✓) → 54943 (54943 ✓) | 29410/29414/-29424 | 0:54855x1 | obj 54855: SPELL_GO Creature:54130:5567760 spell 109137 -> dst  / SPELL_GO Creature:54855:5167056 spell 106206 -> dst  |
| 9 | 29414 | 54567 → 54608 | 54567 (54567 ✓) → 54608,54784 (54608 ✓) | 29424/29522/0 | 0:54856x1 | obj 54856: SPELL_GO P spell 102447 -> dst  / SPELL_GO P spell 128598 -> dst  |
| 10 | 29522 | 54608 → 54568 | 54608 (54608 ✓) → 54568 (54568 ✓) | 29414/29417/0 | - |  |
| 11 | 29417 | 54568 → 54568 | 54568 (54568 ✓) → 54568 (54568 ✓) | 29522/0/0 | 0:54131x8 | obj 54131: SPELL_GO P spell 125359 -> dst  / SPELL_GO P spell 100787 -> Full: 0x0,Creature:57205:5567686 dst  |
| 12 | 29418 | 54568 → 54568 | 54568 (54568 ✓) → 54568 (54568 ✓) | 29417/29420/-29418 | 1:72111x5 |  |
| 13 | 29523 | 54568 → 54568 | 54568 (54568 ✓) → 54568 (54568 ✓) | 29417/29420/-29418 | 1:72112x1 |  |
| 14 | 29420 | 54609 → 54135 | 54609 (54609 ✓) → 54135 (54135 ✓) | 29418/0/0 | - |  |
| 15 | 29664 | 54135 → 54135 | 54135 (54135 ✓) → 54135 (54135 ✓) | 29420/0/0 | 0:56048x1 0:56037x1 0:56038x1 0:56040x1 | obj 56048: SPELL_GO Creature:59626:55498704 spell 114685 ->  dst  / SPELL_GO P spell 105151 -> dst ; obj 56040: c:GAME_OBJ_REPORT_USE GameObjectGUID: GameObject/0 Entry: 209803  / SPELL_GO P spell 105158 -> dst ; obj 56037: SPELL_GO Creature:59626:80664528 spell 114686 -> dst  / SPELL_GO P spell 105156 -> dst ; obj 56038: SPELL_GO Creature:59626:55498705 spell 114685 ->  dst  / SPELL_GO Creature:59626:38721489 spell 114685 ->  dst  |
| 16 | 29421 | 54135 → 54135 | 54135 (54135 ✓) → 54135 (54135 ✓) | 29664/0/0 | 0:54734x1 | obj 54734: c:CAST_SPELL (Cast) CastID: Cast/2 Entry: 100787  ; (Cast) [0] Misc: 8 ; (Cast) [1] Misc:  / SPELL_GO P spell 100787 -> dst  |
| 17 | 29422 | 54135 → 54787 | 54135 (54135 ✓) → 54787,57779 (54787 ✓) | 29421/0/0 | 0:54787x1 | obj 54787: SPELL_GO P spell 109107 -> dst  / SPELL_GO P spell 109109 -> dst  |
| 18 | 29423 | 54787 → 54786 | 54787 (54787 ✓) → 54786 (54786 ✓) | 0/0/0 | 0:61128x1 | obj 61128: SPELL_GO P spell 118500 ->  dst  / SPELL_GO P spell 105090 -> Full: 0x0,dst  |
| 19 | 29521 | 54786 → 54975 | 54786 (54786 ✓) → 54975 (54975 ✓) | 29423/0/0 | - |  |
| 20 | 29662 | 55021 → 55021 | 55021 (55021 ✓) → 55021 (55021 ✓) | 0/0/0 | 1:73178x8 |  |
| 21 | 29661 | 54975 → 54975 | 54975 (54975 ✓) → 54975 (54975 ✓) | 29521/0/0 | 0:55077x1 | obj 55077: c:GAME_OBJ_REPORT_USE GameObjectGUID: GameObject/0 Entry: 209608  / SPELL_GO P spell 102843 -> dst  |
| 22 | 29663 | 54975 → 54975 | 54975 (54975 ✓) → 54975 (54975 ✓) | 29521/0/0 | 0:55019x6 | obj 55019: SPELL_GO P spell 115695 -> dst  / SPELL_GO Vehicle:54993:72275926 spell 103031 -> dst  |
| 23 | 29676 | 54975 → 55020 | 54975 (54975 ✓) → 55020 (55020 ✓) | 29662/0/0 | - |  |
| 24 | 29677 | 55020 → 55020 | 55020 (55020 ✓) → 55020 (55020 ✓) | 29676/0/0 | 1:73184x1 |  |
| 25 | 29666 | 55020 → 55020 | 55020 (55020 ✓) → 55020 (55020 ✓) | 29676/0/0 | 0:60411x6 | obj 60411: SPELL_GO P spell 125359 -> dst  / SPELL_GO P spell 100787 -> Full: 0x0,Creature:60411:5566691 dst  |
| 26 | 29678 | 55020 → player | 55020 (55020 ✓) → 54975 (player push) | 0/0/0 | 0:57476x1 0:55205x1 | obj 57476: SPELL_GO P spell 108590 -> dst  / SPELL_GO P spell 116571 -> dst ; obj 55205: c:USE_ITEM PackSlot: 255 ; Slot: 42 ; CastItem: Item/0  ; (Cast) CastID: Cast/2 Entry: 103 / SPELL_GO P spell 103116 -> dst  |
| 27 | 29679 | player → 54975 | 54975 (player push) → 54975 (54975 ✓) | 29678/0/0 | 0:55212x5 | obj 55212: SPELL_GO P spell 128576 -> dst  / SPELL_GO P spell 117054 -> dst  |
| 28 | 29680 | 54975 → 55477 | 54975 (54975 ✓) → 55477 (55477 ✓) | 29679/0/0 | 3:57710x1 |  |
| 29 | 29769 | 55477 → 55477 | 55477 (55477 ✓) → 55477 (55477 ✓) | 0/0/0 | 0:55483x10 | obj 55483: SPELL_GO P spell 121588 -> dst  / SPELL_GO P spell 115695 -> dst  |
| 30 | 29770 | 55479 → 55479 | 55479 (55479 ✓) → 55479 (55479 ✓) | 0/0/0 | 1:74295x3 1:74296x3 1:74297x3 |  |
| 31 | 29768 | 55477 → 55477 | 55477 (55477 ✓) → 55477 (55477 ✓) | 29770/0/0 | 1:74298x1 |  |
| 32 | 29771 | 55478 → 55478 | 55478 (55478 ✓) → 55478 (55478 ✓) | 0/0/0 | 1:74301x12 |  |
| 33 | 29772 | 55477 → 55477 | 55477 (55477 ✓) → 55477 (55477 ✓) | 29768/0/0 | 0:55546x1 | obj 55546: c:GAME_OBJ_REPORT_USE GameObjectGUID: GameObject/0 Entry: 209626  / SPELL_GO P spell 104012 -> Full: 0x0,Full: 0x0,Full: 0xE0000F000000035C0040C3,Full: 0x0,ds |
| 34 | 29774 | 55477 → 55477 | 55477 (55477 ✓) → 55477 (55477 ✓) | 29772/0/0 | 0:55548x1 0:55547x1 | obj 55548: SPELL_GO P spell 118036 -> dst  / SPELL_GO P spell 104017 -> dst ; obj 55547: SPELL_GO Creature:55558:5569507 spell 118034 -> dst  / SPELL_GO Creature:55558:5569507 spell 104023 -> dst  |
| 35 | 29775 | 55477 → 54786 | 55477 (55477 ✓) → 54786 (54786 ✓) | 0/0/0 | 3:59497x1 |  |
| 36 | 29776 | 54786 → 55583 | 54786 (54786 ✓) → 55583 (55583 ✓) | 0/0/0 | - |  |
| 37 | 29778 | 55583 → 55583 | 55583 (55583 ✓) → 55583 (55583 ✓) | 29776/0/0 | 0:55600x5 | obj 55600: c:GAME_OBJ_REPORT_USE GameObjectGUID: GameObject/0 Entry: 209656  / SPELL_GO P spell 6247 -> dst  |
| 38 | 29783 | 55585 → 55585 | 55585 (55585 ✓) → 55585 (55585 ✓) | 29776/0/0 | 1:74624x12 |  |
| 39 | 29777 | 55588 → 55588 | 55588 (55588 ✓) → 55588 (55588 ✓) | 29776/0/0 | 1:74615x8 |  |
| 40 | 29779 | 55583 → 65558 | 55583 (55583 ✓) → 55583,56134,65558 (65558 ✓) | 29778/0/0 | 0:55632x20 | obj 55632: SPELL_GO P spell 100787 -> Full: 0x0,Creature:55632:13956828 dst  / SPELL_GO Creature:65558:5570096 spell 128631 -> dst  |
| 41 | 29780 | 55583 → 65558 | 55583 (55583 ✓) → 55583,56134,65558 (65558 ✓) | 29778/0/0 | 0:55634x1 | obj 55634: c:CAST_SPELL (Cast) CastID: Cast/2 Entry: 100784  ; (Cast) [0] Misc: 8 ; (Cast) [1] Misc:  / SPELL_GO P spell 100784 -> Full: 0x0,Creature:55634:5568317 dst  |
| 42 | 29781 | 55583 → 65558 | 55583 (55583 ✓) → 55583,56134,65558 (65558 ✓) | 29778/0/0 | 1:74631x8 |  |
| 43 | 29782 | go:209673 → 55585 | go:209673 (go:209673 ✓) → 55585 (55585 ✓) | 0/0/0 | - |  |
| 44 | 29784 | 65558 → 55595 | 65558 (65558 ✓) → 55595 (55595 ✓) | 0/0/0 | - |  |
| 45 | 29785 | 55595 → 55592 | 55595 (55595 ✓) → 55592 (55592 ✓) | 29784/0/0 | 0:55666x1 | obj 55666: SPELL_GO P spell 109132 -> dst  / SPELL_GO Creature:55592:5167056 spell 104616 -> dst  |
| 46 | 29786 | 55595 → 55586 | 55595 (55595 ✓) → 55586 (55586 ✓) | 29785/0/0 | 0:55786x1 | obj 55786: SPELL_GO Creature:55786:5568998 spell 128808 -> dst  / SPELL_GO P spell 126040 -> dst  |
| 47 | 29787 | 55586 → 55672 | 55586 (55586 ✓) → 55672 (55672 ✓) | 29786/0/0 | 0:56274x1 | obj 56274: SPELL_GO P spell 100784 -> Full: 0x0,Creature:56274:5569108 dst  / SPELL_GO P spell 109096 -> Full: 0x0,dst  |
| 48 | 29788 | 55672 → 55672 | 55672 (55672 ✓) → 55672 (55672 ✓) | 29787/0/0 | 0:55640x8 | obj 55640: SPELL_GO P spell 100787 -> Full: 0x0,Creature:55640:5566572 dst  / SPELL_GO P spell 120273 -> dst  |
| 49 | 29789 | 55672 → 55672 | 55672 (55672 ✓) → 55672 (55672 ✓) | 29787/0/0 | 1:74634x8 |  |
| 50 | 29790 | 55672 → 56662 | 55672 (55672 ✓) → 56662 (56662 ✓) | 29789/0/0 | 0:56688x1 | obj 56688: SPELL_GO Creature:56686:5570896 spell 109336 -> dst  / SPELL_GO Creature:56686:5570896 spell 106625 -> dst  |
| 51 | 29791 | 56662 → 56012 | 56662 (56662 ✓) → 56012 (56012 ✓) | 29790/0/0 | 0:56378x1 0:55939x1 | obj 56378: SPELL_GO Vehicle:55649:5570999 spell 105895 -> dst  / SPELL_GO Vehicle:55649:5570999 spell 82721 -> dst ; obj 55939: SPELL_GO P spell 118571 -> Full: 0x0,Creature:56676:5167056 dst  / SPELL_GO Vehicle:55649:5570999 spell 105010 -> dst  |
| 52 | 29792 | 56012 → 55943 | 56012 (56012 ✓) → 55943 (55943 ✓) | 0/0/0 | 0:59946x1 0:59947x1 | obj 59946: SPELL_GO P spell 115345 -> Full: 0x0,Full: 0x0,dst  / SPELL_GO Creature:59986:5571280 spell 115442 -> dst ; obj 59947: SPELL_GO Creature:59989:5571280 spell 115443 -> dst  / SPELL_GO Creature:59989:5571280 spell 84034 -> dst  |
| 53 | 30591 | 55943 → 55943 | 55943 (55943 ✓) → 55943 (55943 ✓) | 0/0/0 | 0:55946x9 | obj 55946: SPELL_GO P spell 100787 -> Full: 0x0,Creature:55946:5560011 dst  / SPELL_GO P spell 120273 -> dst  |
| 54 | 29795 | 60042 → 60042 | 60042 (60042 ✓) → 60042 (60042 ✓) | 0/0/0 | 1:80806x10 |  |
| 55 | 30589 | 60042 → 60055 | 60042 (60042 ✓) → 60055 (60055 ✓) | 0/0/0 | - |  |
| 56 | 30590 | 60055 → 60055 | 60055 (60055 ✓) → 60055 (60055 ✓) | 0/0/0 | 1:74955x6 |  |
| 57 | 29793 | 55942 → 55942 | 55942 (55942 ✓) → 55942 (55942 ✓) | 0/0/0 | 0:56007x8 | obj 56007: SPELL_GO P spell 125359 -> dst  / SPELL_GO P spell 100787 -> Full: 0x0,Creature:56007:5570226 dst  |
| 58 | 29796 | 55942 → 55944 | 55942 (55942 ✓) → 55944 (55944 ✓) | 0/0/0 | - |  |
| 59 | 29794 | 55944 → 55944 | 55944 (55944 ✓) → 55944 (55944 ✓) | 0/0/0 | 0:55999x3 | obj 55999: SPELL_GO Creature:56362:21944272 spell 128440 -> dst  / SPELL_GO Creature:56362:13555664 spell 128440 -> dst  |
| 60 | 29797 | 55944 → 55944 | 55944 (55944 ✓) → 55944 (55944 ✓) | 0/0/0 | 1:74958x8 |  |
| 61 | 29665 | 55940 → 55940 | 55940 (55940 ✓) → 55940 (55940 ✓) | 0/0/0 | 0:56360x8 | obj 56360: SPELL_GO P spell 121588 -> dst  / SPELL_GO P spell 115695 -> dst  |
| 62 | 29798 | 55940 → 56416 | 55940 (55940 ✓) → 56416 (56416 ✓) | 0/0/0 | 0:56009x1 | obj 56009: SPELL_GO Creature:56009:5571236 spell 117492 -> dst  / SPELL_GO P spell 117491 -> dst  |
| 63 | 30767 | 56416 → 56418 | 56416 (56416 ✓) → 56418 (56418 ✓) | 0/0/0 | 0:60727x1 | obj 60727: TRIGGER_MOVIE CinematicID: 117 / SPELL_GO P spell 117615 -> dst  |
| 64 | 29799 | 56418 → 56418 | 56418 (56418 ✓) → 56418 (56418 ✓) | 0/0/0 | 0:56011x1 | obj 56011: SPELL_GO Creature:60858:13960429 spell 128538 -> dst  / SPELL_GO P spell 108898 -> dst  |
| 65 | 29800 | 57739 → 56013 | 57739 (57739 ✓) → 56013 (56013 ✓) | 0/0/0 | 3:57741x1 |  |
| 66 | 31450 | 56013 → 60566 | 56013 (56013 ✓) → 60566,60570 (60566 ✓) | 0/0/0 | 0:64594x1 | obj 64594: SPELL_GO P spell 130422 -> dst  / SPELL_GO P spell 113244 -> dst  |
| 67 | 30987 | 60566 → 29611 | 60566 (60566 ✓) → 29611 (29611 ✓) | 0/0/0 | - |  |
