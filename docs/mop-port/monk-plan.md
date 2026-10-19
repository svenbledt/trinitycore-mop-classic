# Monk class completion plan (5.5.4.70449)

Goal: every Monk spell (baseline, 3 specs, talents, glyphs, tier sets) behaves as on retail MoP Classic.
Rule (user, 2026-10-19): a class is done completely or not at all; no half-finished mechanics.
Source priority: retail sniffs > 5.5.4 client data > SkyFire 5.4.8 > TC master (memory: mop-content-source-priority).

## Inventory (2026-10-19)
445 spells with SpellClassSet = Monk in 70449 `SpellClassOptions`. Cross-reference against SkyFire 5.4.8
(`ref_sfdb.spell_script_names` + `tools/mop-re/refs/skyfire/src/server`) and this repo:

| Coverage | Spells | Meaning |
|---|---|---|
| SkyFire and ours | 25 | Done or partly done here; re-verify against SkyFire behaviour |
| Ours only | 19 | Our 5.5.4 formula scripts (monk-damage.md) and Roll/Jab/Provoke |
| SkyFire only | 111 | **Main work**: 36 SkyFire scripts plus core code (Stagger, Chi, mastery, brews) to port |
| Nobody | 290 | Passives, markers, visuals, tier/glyph auras. Expected to work from DB2; each needs a quick check |

Regenerate: `SpellClassOptions` monk IDs -> `monkxref.mjs` (scratch; move into `tools/mop-content/` when work starts).

## Already done
Tooltip-formula damage/heals (Blackout Kick, Rising Sun Kick, Fists of Fury, Keg Smash, Spinning Fire Blossom,
Spinning Crane Kick, Rushing Jade Wind, Expel Harm, Chi Wave/Burst/Zen Sphere AP part), Jab Chi + weapon overrides,
Roll, Provoke. See `monk-damage.md`.

## Work packages (in order; each one = build + bind + in-game test + commit)
1. **Blackout Kick and Spinning Fire Blossom riders** (first, user request 2026-10-19)
   - Combat Conditioning 128595: behind target -> 128531 DoT of $100784m2% (20%) of the hit over 4 s; in front -> 128591 heal 20%.
   - Brewmaster Training 117967: Blackout Kick grants Shuffle 115307.
   - Teachings of the Monastery 116645 + Wise Serpent: Blackout Kick cleaves $116645s4 targets for 3.56 x <low>..<high> (50%).
   - Serpent's Zeal 127722 (Mistweaver Blackout Kick buff, statue heal).
   - Spinning Fire Blossom: +50% damage if it travelled > 10 yd (123408), root 123407 unless Glyph 123405;
     glyph turns it into a targeted spell. SkyFire: `spell_monk_spinning_fire_blossom(_damage)`.
2. **Core resources**: Chi (generation/spend, Ascension, Chi Brew 115399), Energy driver 107500, Stance swaps
   (Fierce Tiger/Sturdy Ox/Wise Serpent: power type swap to mana, AP-from-SP 404), Legacy buffs, Tiger Power 125359,
   Combo Breaker 137384 (116768/118864), Muscle Memory 139598.
3. **Brewmaster**: Stagger 124255 + light/moderate/heavy 124273-5 (core: SkyFire Unit damage split), Elusive Brew
   stacks 128938/115308, Purifying Brew 119582, Guard 115295 (+Power Guard 118636, Glyph 123401), Keg Smash chi +
   Dizzying Haze 115180/123727, Breath of Fire 115181/123725 (+Glyph 123394), Gift of the Ox 124502 (areatrigger
   orbs), Black Ox Statue 115315 (Sanctuary, Provoke AoE already), Avert Harm 115213, Fortifying Brew 115203,
   Swift Reflexes 124334/124335 (resolve 4.5 vs 0.3 multiplier from a sniff), Vengeance 120267, Mastery Elusive Brawler.
4. **Windwalker**: Tigereye Brew stacks/consume (125195/116740, 1247267/1247275/1247279 are 5.5.4 variants),
   Energizing Brew 115288, Fists of Fury stun 120086 + facing, Flying Serpent Kick 101545/115057/123586, Touch of Karma
   122470/124280, Touch of Death 115080 (+Glyph 123391), Storm Earth and Fire 137639/138121-3 (clones), Tiger Strikes
   120273, Invoke Xuen 123904 (pet AI), Rising Sun Kick debuff 130320, Mastery Bottled Fury 115636/1247280.
5. **Mistweaver**: Soothing Mist channel 115175 + statue 125950/125953, Surging Mist 116694/116995 (Vital Mists
   118674), Enveloping Mist 124682/132120, Renewing Mist 115151/119611 (jumps), Uplift 116670, Thunder Focus Tea
   116680, Mana Tea stacks 115867/115294/123761 (+Glyph 123763), Revival 115310, Life Cocoon 116849, Healing Sphere
   115460/115464 (areatriggers), Jade Serpent Statue 115313, Eminence 126890/117895, Mastery Gift of the Serpent
   117907/119031, Crackling Jade Lightning 117952 (+knockback 117962), Teachings of the Monastery 116645/118672.
6. **Talents**: Celerity/Tiger's Lust/Momentum, Chi Wave/Zen Sphere/Chi Burst (bounce/areatrigger mechanics, values
   done), Power Strikes 121817, Ascension, Chi Brew, Ring of Peace 116844, Charging Ox Wave 119392, Leg Sweep 119381,
   Healing Elixirs 122280, Dampen Harm 122278, Diffuse Magic 122783, Rushing Jade Wind (done), Invoke Xuen,
   Chi Torpedo 115008.
7. **Utility/baseline**: Paralysis 115078 (+Glyph), Disable 116095/116706, Spear Hand Strike 116705, Grapple Weapon
   117368 (+upgrades 123231-4), Detox 115450, Resuscitate, Transcendence 101643/119996, Zen Pilgrimage 126892/126895,
   Zen Flight 125883, Fortifying Brew, Nimble Brew 137562, Zen Meditation 115176, Clash 122057, Leer of the Ox.
8. **Glyphs and tier sets** (T14-T16 2P/4P, about 25 auras): check each against DB2 spellmods; script the dummies.
9. **Audit pass**: the 290 unreferenced spells, one line each (works from DB2 / needs script / not player-facing).

## Method per spell
1. Client data: `spellwork-554` (effects, triggers, attributes), description variables (`SpellDescriptionVariables`).
2. Retail sniff if we have one (the island sniffs cover levels 1-10 only; higher spells need new sniffs, see
   `sniff-wishlist.md`).
3. SkyFire script/core code: port rewritten in TC style (namespace `Scripts::Spells::Monk`, ValidateSpellInfo).
4. Bind in `sql/updates/world/mop_classic/`, build, check worldserver log for binding errors, test in client.

## Cost estimate
About 60-80 scripts plus core work for Stagger, Chi and statues/areatriggers. Roughly 8-12 sessions of the size of
2026-10-19's formula work; packages 1-2 first (one session), then one session per spec, talents/utility one or two,
audit one. Needs sniffs at level 90 per spec for verification (Stagger tick, Tigereye stacking, Mana Tea, statues).

## Open questions
- Swift Reflexes multiplier (4.5 vs 0.3 x <low>): needs a Brewmaster sniff.
- Whether 5.5.4 changed Tigereye Brew (new 1247xxx spell IDs) vs SkyFire's 5.4.8 logic.
- Expel Harm damage: does it receive caster damage-done mods a second time?

## Appendix: SkyFire-only coverage (spell, SkyFire script names, SkyFire source files)
| Spell | SkyFire DB script | SkyFire code |
|---|---|---|
| 101545 | - | spell_monk.cpp |
| 103985 | - | CharacterHandler.cpp,SpellCombatMetadata.cpp |
| 115008 | spell_monk_chi_torpedo | spell_monk.cpp |
| 115057 | spell_monk_flying_serpent_kick | spell_monk.cpp |
| 115070 | - | SpellAuraEffects.cpp |
| 115078 | spell_monk_paralysis | spell_monk.cpp |
| 115080 | spell_monk_touch_of_death | - |
| 115175 | spell_monk_soothing_mist | spell_monk.cpp |
| 115181 | spell_monk_breath_of_fire | - |
| 115203 | spell_monk_fortifying_brew | spell_monk.cpp |
| 115288 | spell_monk_energizing_brew | spell_monk.cpp |
| 115294 | spell_monk_mana_tea | spell_monk.cpp |
| 115295 | spell_monk_guard | spell_monk.cpp |
| 115307 | - | spell_monk.cpp |
| 115308 | spell_monk_elusive_brew | spell_monk.cpp |
| 115313 | - | SpellSummonMetadata.cpp |
| 115315 | - | SpellSummonMetadata.cpp |
| 115399 | spell_monk_healing_elixirs | spell_monk.cpp |
| 115460 | - | spell_monk.cpp |
| 115636 | - | spell_mastery.cpp |
| 115867 | - | spell_monk.cpp |
| 115921 | spell_monk_legacy_of_the_emperor | spell_monk.cpp |
| 116095 | spell_monk_disable | spell_monk.cpp |
| 116189 | - | spell_monk.cpp |
| 116330 | - | spell_monk.cpp |
| 116335 | spell_monk_power_strikes | spell_monk.cpp |
| 116645 | - | spell_monk.cpp |
| 116670 | - | spell_monk.cpp |
| 116680 | - | spell_monk.cpp |
| 116694 | spell_monk_surging_mist | spell_monk.cpp |
| 116705 | spell_monk_spear_hand_strike | spell_monk.cpp |
| 116706 | - | spell_monk.cpp |
| 116709 | - | spell_monk.cpp |
| 116740 | spell_monk_tigereye_brew | spell_monk.cpp |
| 116768 | - | spell_mastery.cpp |
| 116841 | spell_monk_tigers_lust | spell_monk.cpp |
| 116995 | - | spell_monk.cpp |
| 117368 | spell_monk_grapple_weapon | spell_monk.cpp |
| 117640 | - | spell_monk.cpp |
| 117666 | - | spell_monk.cpp |
| 117667 | - | spell_monk.cpp |
| 117906 | - | spell_mastery.cpp |
| 117907 | - | spell_mastery.cpp |
| 117952 | spell_monk_crackling_jade_lightning | spell_monk.cpp |
| 117953 | - | spell_monk.cpp |
| 117959 | - | spell_monk.cpp |
| 117962 | - | spell_monk.cpp |
| 117993 | - | spell_monk.cpp |
| 118604 | spell_monk_guard | - |
| 118635 | - | spell_monk.cpp |
| 118672 | - | spell_monk.cpp |
| 118852 | - | spell_monk.cpp |
| 118864 | - | spell_mastery.cpp |
| 119582 | spell_monk_purifying_brew | spell_monk.cpp |
| 119607 | - | spell_monk.cpp |
| 119611 | - | spell_monk.cpp |
| 119996 | - | spell_monk.cpp |
| 120086 | - | spell_monk.cpp |
| 120273 | - | spell_monk.cpp |
| 120274 | - | spell_monk.cpp |
| 120954 | - | spell_monk.cpp |
| 121817 | - | spell_monk.cpp |
| 121828 | spell_monk_chi_torpedo | spell_monk.cpp |
| 122057 | spell_monk_clash | spell_monk.cpp |
| 122278 | spell_monk_dampen_harm | spell_monk.cpp |
| 122280 | spell_monk_healing_elixirs | spell_monk.cpp |
| 122281 | - | spell_monk.cpp |
| 122470 | spell_monk_touch_of_karma | spell_monk.cpp |
| 122783 | spell_monk_diffuse_magic | spell_monk.cpp |
| 123154 | - | spell_monk.cpp |
| 123231 | - | spell_monk.cpp |
| 123232 | - | spell_monk.cpp |
| 123234 | - | spell_monk.cpp |
| 123332 | - | spell_monk.cpp |
| 123333 | spell_monk_power_strikes | - |
| 123334 | - | spell_monk.cpp |
| 123393 | - | spell_monk.cpp |
| 123394 | - | spell_monk.cpp |
| 123402 | spell_monk_guard | - |
| 123407 | - | spell_monk.cpp |
| 123408 | spell_monk_spinning_fire_blossom_damage | spell_monk.cpp |
| 123586 | - | spell_monk.cpp |
| 123725 | - | spell_monk.cpp |
| 123757 | - | spell_monk.cpp |
| 123760 | - | spell_monk.cpp |
| 123766 | spell_monk_mana_tea_stacks | spell_monk.cpp |
| 123980 | - | spell_monk.cpp |
| 123986 | spell_monk_chi_burst | spell_monk.cpp |
| 124040 | - | spell_monk.cpp |
| 124273 | - | spell_monk.cpp |
| 124274 | - | spell_monk.cpp |
| 124275 | - | spell_monk.cpp |
| 124280 | - | spell_monk.cpp |
| 124489 | - | spell_monk.cpp |
| 124490 | - | spell_monk.cpp |
| 124682 | spell_monk_enveloping_mist | spell_monk.cpp |
| 124997 | - | spell_monk.cpp |
| 125195 | spell_monk_tigereye_brew_stacks | spell_monk.cpp |
| 125359 | - | SpellAuraDefines.h |
| 125883 | spell_monk_zen_flight_check | spell_monk.cpp |
| 125893 | spell_monk_glyph_of_zen_flight | spell_monk.cpp |
| 126890 | - | spell_monk.cpp |
| 126892 | spell_monk_zen_pilgrimage | spell_monk.cpp |
| 126895 | spell_monk_zen_pilgrimage_return | spell_monk.cpp |
| 127722 | spell_monk_serpents_zeal | spell_monk.cpp |
| 127796 | - | spell_monk.cpp |
| 128531 | - | spell_monk.cpp |
| 128591 | - | spell_monk.cpp |
| 128595 | - | spell_monk.cpp |
| 128939 | - | spell_monk.cpp |
| 129881 | spell_monk_power_strikes | spell_monk.cpp |
| 130316 | - | spell_monk.cpp |
| 131561 | - | spell_monk.cpp |
| 132005 | - | spell_monk.cpp |
| 132120 | - | spell_monk.cpp |
| 136070 | spell_monk_guard | - |
