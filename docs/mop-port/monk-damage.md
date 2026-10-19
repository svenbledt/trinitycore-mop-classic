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
List and method: scratch scan `SpellEffect` (Effect 2/10 or aura 3/8, BasePoints 0-1, all three coefficients 0)
joined with `spell_script_names`. Not done yet.
