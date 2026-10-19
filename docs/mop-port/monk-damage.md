# Monk damage and healing from 5.5.4 tooltip formulas

In 5.5.4.70449 many Monk spells have a damage/heal effect with `EffectBasePoints = 1` and no SP/AP coefficient.
The real value lives in `SpellDescriptionVariables` (linked through `SpellXDescriptionVariables`), which the client
evaluates for the tooltip. The server has to evaluate the same formula, otherwise the spell hits for 1-2.
Scripts: `src/server/scripts/Spells/spell_monk.cpp`, bindings `sql/updates/world/mop_classic/2026_10_19_31_world.sql`.

## $<low> / $<high> (weapon + AP)

```
low  = scale * (dw * (mwb/MWS * mist + off*offl) + AP/14 - 1)      high: max damage, +1
dw   = 1 with a 2H override aura (108561 staff, 115697 polearm), else 0.898882275
```

| Variables | Spells (description owner -> damage spell) | multiplier | scale | off-hand term | $mist (Mana Meditation 121278) |
|---|---|---|---|---|---|
| 907 | Blackout Kick 100784 | 7.12 | 1 | off weapon /2/speed only if 124146 known, else 0 | 0.75, 0.5 with 2H |
| 278 | Expel Harm 115072, 147489 (heal) | 7 | 1 | same as 907 | same as 907 |
| 281 | Spinning Crane Kick 101546 -> 107270 | 1.59 | 1.75/1.59 | same as 907 | same as 907 |
| 279 | Rising Sun Kick 107428, Fists of Fury 113656 -> 117418 | 14.4 / 7.5 | 0.89 | 0 with 2H; off weapon if 124146 known, else main weapon | 0.5 |
| 251 | Keg Smash 121253, Spinning Fire Blossom 115073 | 10 / 2.1 | 1 | same as 279 | 0.5 |
| 301 | Rushing Jade Wind 116847 -> 148187 | 1.59 | 1.4/1.59 | same as 279 | 0.5 |

Left out on purpose because the server already applies them as auras: `$stnc` (Fierce Tiger 103985 +10% damage
done, Wise Serpent 115070 +20% healing done), `$bm`/`$tankMult` (Brewmaster hotfix passive 137023, -15% damage done),
`$musc` (Muscle Memory 139597, +150% pct spellmod).

Fists of Fury: "damage is spread evenly over all targets", so each tick divides by the number of targets hit.
Expel Harm: `$115129s2`% (50) of the amount healed is cast as 115129 on the enemy closest to the healed unit.

## $m1 + AP x coefficient

| Variables | Spell | coefficient |
|---|---|---|
| 295 | Chi Wave heal 132463 / damage 132467 | 0.45 |
| 296 | Chi Burst heal 130654 / damage 148135 | 1.00 / 1.21 |
| 266 | Zen Sphere periodic heal 124081 / damage 124098, detonate damage 125033 / heal 124101 | 0.104 / 0.104, 0.423 / 0.269 |

`$healP` is `SP*2.4` under Wise Serpent; that is the 200% SP attack-power override (aura 404) times the stance's
+20% healing aura, so the scripts use AP only.

## Open (TODO(verify) against a retail sniff)
- Spinning Fire Blossom's +50% beyond 10 yards (123408) is not implemented.
- Combat Conditioning (Blackout Kick DoT 128531 / heal) is not implemented.
- Whether Expel Harm's 115129 damage gets caster damage-done mods a second time.
- Swift Reflexes 124335: 124334 says 4.5 x <low>, 124335 says 0.3 x <low>; left unscripted.

## Other classes
`tools/mop-re` scan (2026-10-19): about 100 class spells have a placeholder damage/heal effect with no coefficient
and no script (hunter pet basic attacks, Kill Command, Prayer of Mending 33110, Lifebloom bloom 33778, Deadly Throw,
Spirit Wolves heal, Lacerate, Explosive Shot, ...). Many are proc spells whose amount a trigger script must pass.
Done: Prayer of Mending (33076/41635/351575, spell_priest.cpp) and Lifebloom bloom (33763/94447 -> 33778, spell_druid.cpp).
List and method: scratch scan `SpellEffect` (Effect 2/10 or aura 3/8, BasePoints 0-1, all three coefficients 0)
joined with `spell_script_names`. Not done yet.

### Remaining placeholder spells (scan 2026-10-19, unscripted; id, effects, description start)
```
10444	eff0:DMG:bp1	-	Imbue the Shaman's weapon with fire, increasing total spell 
12654	eff0:DOT:bp0	-	$@spelldesc12846
12723	eff0:DMG:bp1	-	Your next melee weapon swing strikes an additional nearby op
25997	eff0:DMG:bp1	-	All magical attacks against you have a chance to cause a per
30107	eff0:HEAL:bp1	-	
31117	eff0:DMG:bp1	-	$@spelldesc30108
31333	eff1:DMG:bp1	-	Signals Trackers of the Hand to come to your aid.
32952	eff0:HEAL:bp1	-	
33745	eff0:DOT:bp1,eff1:DMG:bp1	-	Lacerates the enemy target, dealing ${$m2+($AP*0.616)} bleed
38274	eff1:DOT:bp1	-	Hurls a fiery ball that causes $s1 Fire damage and an additi
38275	eff1:DOT:bp1	-	
38276	eff1:DOT:bp1	-	
40822	eff0:DMG:bp0	-	Dan's Test Spell.
41360	eff0:DMG:bp1	-	Deals Arcane damage to a single target.
43993	eff1:DOT:bp1	-	
45524	eff2:DMG:bp0	-	Shackles the target with frozen chains, $?s58620[dealing ${(
46968	eff1:DMG:bp0	-	Sends a wave of force in a frontal cone before you, causing 
47307	eff2:DMG:bp0	-	Frost spell of imminent arena doom.
50454	eff0:HEAL:bp1	-	The Bloodworm's melee attacks siphon blood from the target, 
53508	eff0:DMG:bp1	-	A fierce attack causing $<damage> damage, that your pet can 
53652	eff0:HEAL:bp1	-	$@spelldesc53563
58879	eff0:HEAL:bp1	-	$@spelldesc58877
63544	eff0:HEAL:bp0	-	Your Renew will instantly heal the target for a portion of t
64891	eff0:HOT:bp1	-	Your Holy Shock critical heals now also place a periodic hea
64930	eff0:DOT:bp0	-	Your critical strikes from Lightning Bolt cause the target t
69608	eff1:DOT:bp1	-	
70691	eff0:HOT:bp1	-	Heals the target over $d.
70890	eff0:DMG:bp1	-	An unholy strike that deals $55090s2% of weapon damage as Ph
75439	eff1:DOT:bp1	-	Shoots an enemy, inflicting Shadow damage.
81751	eff0:HEAL:bp1	-	$@spelldesc81749
83077	eff0:DMG:bp1	-	$@spelldesc82834
83853	eff0:DOT:bp0	-	$@spelldesc11129
86678	eff0:HEAL:bp1	-	Heals the target of your heals for 30% of the amount healed.
86717	eff1:DOT:bp1	-	Shoots an enemy, inflicting Fire damage.
86961	eff0:HEAL:bp0	-	Heals the target of a successful dispel.
89653	eff0:HEAL:bp1	-	$@spelldesc689
94472	eff0:HEAL:bp1	-	
96172	eff0:DMG:bp1	-	
96714	eff0:DMG:bp1	-	
97831	eff0:HEAL:bp1	-	A deadly attack that deals damage plus and heals the Death K
97862	eff0:HEAL:bp1	-	Heals the caster based on damage dealt.
98021	eff0:DMG:bp0,eff1:HEAL:bp0	-	The Spirit Link Totem reduces damage taken by all party and 
98375	eff0:DMG:bp1	-	A sweeping attack that strikes the target and $?s58366[three
98426	eff0:DMG:bp1	-	
99000	eff0:DMG:bp1	-	Your Obliterate and Scourge Strike abilities instantly deal 
99002	eff0:DOT:bp0	-	Your attacks with Mangle, Maul, and Shred cause your target 
99092	eff0:DOT:bp0	-	Your attacks with Crusader Strike cause your target to burn 
99240	eff0:DOT:bp0	-	Your Shield Slam deals $99239s1% additional damage as Fire d
104731	eff0:DMG:bp1	-	
105874	eff0:DMG:bp1	-	Grants 2 charges of Fingers of Frost
107545	eff0:HEAL:bp0	-	Drains life from the target and restores it to the caster.
108447	eff0:HEAL:bp1,eff1:HEAL:bp1	-	
112092	eff0:DMG:bp1	-	Sends three shadowy bolts at the enemy, causing $686s3 Shado
114083	eff0:HEAL:bp0	-	Healing done is duplicated and distributed evenly among all 
114328	eff0:DMG:bp1	-	$@spelldesc112092
114329	eff0:DMG:bp1	-	
114911	eff0:HEAL:bp0	-	When the Shaman deals direct damage or healing, $108281s1% o
114945	eff0:HEAL:bp1	-	$@spelldesc114944
115080	eff0:DMG:bp1	-	You exploit the enemy target's weakest point, instantly kill
115536	eff0:HEAL:bp0	-	$@spelldesc93466
115611	eff0:HOT:bp1	-	$@spelldesc115610
116783	eff0:HEAL:bp0	-	Tears at a target's soul, healing the Death Knight in propor
117895	eff0:HEAL:bp0	-	When the Monk deals non-autoattack damage, the summoned Jade
118594	eff0:DMG:bp0,eff1:HEAL:bp0	-	$@spelldesc108968
118855	eff0:DOT:bp1	-	
121129	eff1:HEAL:bp1	-	Your next Holy Shock will heal allies within $A2 yards of th
122307	eff0:HEAL:bp1	-	$@22842
123530	eff0:HEAL:bp1	-	Heals a nearby friendly target within $A1 yards of the Palad
123902	eff0:HEAL:bp1	-	Heals the target for $m1, and causes damage equal to the amo
124255	eff0:DOT:bp0	-	You shrug off physical attacks, causing ${100-$115069m8}% of
124280	eff0:DOT:bp1	-	$@spelldesc122470
124988	eff0:HEAL:bp1	-	Healed for $124974s3% of single-target damage done by a near
124991	eff0:DMG:bp1	-	Nature damage taken equal to $124974s3% of single-target hea
126890	eff0:HEAL:bp0	-	When the Monk deals non-autoattack damage, $Ghe:she; will he
128531	eff0:DOT:bp1	-	$@spelldesc100784
128591	eff0:HEAL:bp1	-	
131736	eff0:DMG:bp1	-	$@spelldesc30108
131737	eff0:DMG:bp1	-	$@spelldesc980
131740	eff0:DMG:bp1	-	$@spelldesc172
132566	eff0:DMG:bp1	-	$@spelldesc27243
135031	eff0:DMG:bp0	-	
136063	eff0:DMG:bp0	-	
137808	eff0:HEAL:bp1	-	Heals the Shaman for $55447s1% of the damage dealt by Flame 
140339	eff1:DOT:bp1	-	
140815	eff0:HEAL:bp1	-	
140816	eff0:HEAL:bp1	-	
141612	eff0:DOT:bp0	-	Inflicts elemental hatred upon the target, causing Fire dama
144080	eff0:HOT:bp1	-	
144551	eff0:HEAL:bp1	-	$@spelldesc144503
144581	eff0:HOT:bp1	-	$@spelldesc144580
144888	eff0:HOT:bp1	-	$@spelldesc144887
145056	eff0:HEAL:bp1	-	$@spelldesc145055
145153	eff0:HEAL:bp1	-	The Druid's Wrath spell causes a nearby ally to be healed fo
145392	eff0:HOT:bp1	-	
146361	eff0:DMG:bp1	-	$@spelldesc1464
146585	eff0:DMG:bp1	-	$@spelldesc114916
146586	eff0:HEAL:bp1	-	$@spelldesc114917
147489	eff0:HEAL:bp1	-	Instantly heals a friendly target for ${7*$<low>} to ${7*$<h
148022	eff0:DMG:bp1	-	$@spelldesc76613
413861	eff0:DMG:bp0	-	Your critical Aimed, Steady and Chimera Shots cause the targ
1214948	eff0:DMG:bp1	-	
1250616	eff0:DMG:bp1	-	
```
