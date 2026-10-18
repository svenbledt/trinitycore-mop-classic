# SMSG_UPDATE_OBJECT: MoP Classic 5.5.4 deltas vs WPP UpdateFieldsHandler553

Where the evidence comes from: 11 ymir sniffs (s1 = 5.5.4.68077, s2..s11 = 5.5.4.70268) plus **u2 = 5.5.4.70449**
(target build, 14 MB, 4 logins, combat/quests/pets/flights; it outranks the others where they conflict). All are
relabelled to 5.5.3.67509 with `to553.mjs`. A further 70449 sniff, **u3** (38 MB, 13427 UPDATE_OBJECT), was added in v3.
After the changes below, all 18569 UPDATE_OBJECT packets parse with 0 exceptions and 0 "not fully read"
(17735 creates, 60351 value updates).

**v2 (70449 pass)** changed: ItemModList (H), QuestLog update (E2), ActivePlayerData update (G, rewritten). It also
verified the SkillInfo update and the QuestLogQuestIdToIndex delta update. Items tagged **[70449]** are new in v2.

**v3 (u3 pass)** changed only AreaTriggerData create and VisualAnim; see section I. u3 has no other failure classes. File/packet numbers point to the relabelled `wpp554/sN.pkt`, which keeps the same
packet order as the original sniff after filtering to UPDATE_OBJECT.

Every UF blob is size-prefixed and each read must use it up exactly. That checks the total size and the order of
fields whose values are non-zero. It cannot show where an always-zero field sits relative to other zero fields. Those
cases are marked "position by precedent".

"256" means WPP `UpdateFieldsHandler256.cs` (2.5.6, same release era). "1127" means the retail 11.2.7 handler and
fragment logic.

Code: `WowPacketParserModule.V5_5_0_61735/Parsers/UpdateFieldsHandler554.cs`. The full diff vs 553 is in
`uf553_554.diff`. The local core patches are in `wpp_local_core.diff`.

---

## A. Parts of UPDATE_OBJECT outside the update fields

| # | Change | Evidence | Precedent |
|---|---|---|---|
| A1 | Entity fragment IDs use the retail 11.2.7 numbering (`WowCSEntityFragments1127`). | Patched before this task; confirmed in the client. | 1127 |
| A2 | **MovementUpdate (create block):** new `float GravityModifier` right after `MoveIndex`, before the `RemoveForcesIDs` loop. | Without it, every speed shifts by 4 bytes and MovementForceCount is garbage, which caused 85+ exceptions. With it, GravityModifier = 1.0 in all 1208 movement blocks, the speeds are sane (2.5/7/4.5/...) and the next fields line up. s1 pkt 0. | kk fork aa35e2ddf adds the same float after MoveIndex in MovementHandler.ReadMovementStats (5.5.4.68042). |
| A3 | **FVendor_C is no longer an indirect fragment.** There is no `IndirectFragmentActive` bool in create. In values updates the fragment uses 1 changed-fragment bit, not 2. | Vendor creates had 4 bytes left = Flags with no bool byte (13 cases in s1/s10/s11, first at s1 pkt 3). Fragment-bit counting fixed 266 "Values Creature rem=5" failures. | 1127: retail stopped treating FVendor_C as indirect at V11_2_7_64632 (`WowCSUtilities.IsIndirect`). |

---

## B. VisibleItem (used by UnitData.VirtualItems[3] and PlayerData.VisibleItems[19])

**Create:** after `ItemVisual (u16)`:

1. `ItemModifiedAppearanceID u32`
2. `TransmogSlotOption u8`
3. `SheatheCategory u8`
4. ResetBitReader, then `HasTransmog bit` and `HasIllusion bit` (1 byte).

**Update:**

- The mask grows from 6 to 11 bits.
- Bits 1 (HasTransmog) and 2 (HasIllusion) are read as bits first, then ResetBitReader.
- Old bits move: ItemID 1→3, SecondaryItemModifiedAppearanceID 2→4, ConditionalItemAppearanceID 3→5, ItemAppearanceModID 4→6, ItemVisual 5→7.
- New bits: ItemModifiedAppearanceID 8, TransmogSlotOption 9, SheatheCategory 10.

**Evidence:**

- Unit create was exactly +23 bytes: 3 × 7 bytes here, plus NameplateAttach.
- Player VisibleItems have ItemModifiedAppearanceID ≠ 0 (204 cases, s1 pkt 0), and VisibleItems[15].TransmogSlotOption is 1..4 (s2 pkt 2).
- Unit full updates (flag 33, 13 cases, s1 pkt 7) exercise all 11 VirtualItems bits.
- Player updates (s9) exercise bits 3 and 8.

**Precedent:** 256, identical.

**UNVERIFIED:** SheatheCategory, HasTransmog and HasIllusion are 0 in every sniff, so only their combined size and slot are proven.

---

## C. UnitData

**Create:**

1. The `VirtualItems[3]` loop moves from after `FactionTemplate` to after the `ChannelObjects` dynamic data, just before HasAssistActionData. The ItemIDs at the new place are real (82352, 82351, 5956, …, s3 pkt 30).
2. New `PackedGuid128 NameplateAttach` after `Field_2F4`, before the dynamic-array data. It is always empty (2 bytes) in the sniffs, so the position is by precedent.
3. A ResetBitReader comes before `HasAssistActionData`.

**Update:**

- NameplateAttach is bit 118.
- HasAssistActionData moves into the bit-112..118 group, and AssistActionData goes 118 → 119.
- All arrays shift +1: PowerRegenFlatModifier 120+i → 121+i, PowerRegenInterruptedFlatModifier 130→131, Power 140→141, MaxPower 150→151, ModPowerRegen 160→161, AttackRoundBaseTime 175→176, Stats 179→180, StatPosBuff 184→185, StatNegBuff 189→190, Resistances 195→196, ResistanceBuffModsPositive 202→203, ResistanceBuffModsNegative 209→210, PowerCostModifier 216→217, PowerCostMultiplier 223→224.
- VirtualItems: the group is bit 171 and the elements are 172+i, but the block is now *read last*, after PowerCostMultiplier.
- The mask size is unchanged (8 blocks).

**Evidence:** 4411 unit-only plus 21 object+unit updates parse cleanly, including 13 full-mask updates (s1 pkt 7) that touch every field.

**Precedent:** 256, which is a verbatim copy of the 256 function. 553 differed from 255 only cosmetically.

---

## D. GameObjectData

- **Create:** new `u32 Flags2` right after `Flags`, before `ParentRotation`. This is the reported first failure: FactionTemplate read 1.0f.
- **Update:** the mask grows from 21 to 22 bits. Flags2 is bit 12. ParentRotation 12→13, FactionTemplate 13→14, Level 14→15, State 15→16, TypeID 16→17, PercentHealth 17→18, ArtKit 18→19, CustomParam 19→20, AssistActionData 20→21.
- **Evidence:** 663 GO creates went from rem=4 to clean (s1 pkt 0). There were 202 GO updates with the Flags2 bit set (s1 pkt 2).
- **Precedent:** 256.
- **UNVERIFIED:** Flags2 is always 0. Its being *after* Flags is supported because Flags holds the non-zero values (36, 32, 4, 2097156).

---

## E. PlayerData

**Create:**

1. New map `QuestLogQuestIdToIndex` (u32 count, then {i32 key, i32 value}). It is inside the `PartyMember` block, right after `QuestLog[25]`. The keys are real quest IDs, e.g. 30045 (s1 pkt 0).
2. The `VisibleItems[19]` loop moves from after QuestLog to after the `VisualItemReplacements` data, followed by ResetBitReader, then the Name length bits.

Every Player and ActivePlayer create parses, including names and DungeonScore.

**Update (mask still 5 blocks):**

- QuestLogQuestIdToIndex map is bit 25. Format: byte updateType; 0 = delta (u16 count, then per entry {i32 key, u8 changeType, i32 value unless changeType == 2}), otherwise a full map (u32 count + pairs). **[70449] the delta form is verified**: u2 pkt 34, keys 0 (removed) and 28767 → 3, consumed exactly. The full-map form is still UNVERIFIED.
- Bits ≥25 shift +1: PlayerTitle 26, FakeInebriation 27, VirtualPlayerRealm 28, CurrentSpecID 29, CurrentCombatTraitConfigSubTreeID 30, TaxiMountAnimKitID 31.
- CurrentBattlePetBreedQuality 31 → **33**: it skips group bit 32 and is read inside block 32.
- HonorLevel 34, LogoutTime 35, Name 36, Field_13C 37, Field_140 38, CurrentBattlePetSpeciesID 39, DungeonScore 40, LeaverInfo 41, DeclinedNames 42, PersonalTabard 43.
- PartyType 45+i, QuestLog 48+i, VisibleItems 74+i (block read *last*), AvgItemLevel 94+i, ForcedReactions 101+i, Field_3120 134+i.

**Evidence:**

- s9 pkt 685/687/729/761: bits 0, 32, 38 with Field_140 (u32) and the unconditional HasDeclinedNames bit byte. Bits 93/94 carry AvgItemLevel[0] = 2.5.
- AvgItemLevel[1..3] = 2.375 / 3.18.
- VisibleItems[n] ItemID / ItemModifiedAppearanceID appear in 96-flag updates.

**Precedent:** 256. The 553-only fields stay in place: PetNames/VisualItemReplacements order and CurrentCombatTraitConfigSubTreeID.

---

## E2. QuestLog update [70449]

The 553 bit order (EndTime 1, QuestID 2, StateFlags u32 3, group 4, progress 5+i) is wrong for 5.5.4. New order, retail-12.x style:

| Bit | Field |
|---|---|
| 1 | QuestID |
| 2 | StateFlags (**u16**) |
| 3 | EndTime |
| 4 | ObjectiveFlags |
| 5 | ObjectiveProgress group |
| 6+i | ObjectiveProgress[i], i < 24 |

**Evidence (u2):**

- pkt 1042: bit 2 with exactly 2 bytes.
- pkt 34: bit 1 = QuestID 28767.
- pkt 54: bits 5,6 = progress[0] = 1, and the following ActivePlayer part then parses (bits 32, 44 = XP 55, 102, 117).

EndTime (3) and ObjectiveFlags (4) are UNVERIFIED. In u2 pkt 34, bit 30 is set together with QuestID, without group 5 and with no payload. It has no field in this layout; it is ignored and UNVERIFIED.

## F. ActivePlayerData create

Fields are listed in read order. Only changes are listed.

| Position | Change | Evidence | Precedent |
|---|---|---|---|
| Skill | SkillInfo grows from **256 to 300** entries (7 × u16 each). | The zero run after 64 real skills ends exactly at entry 300. The next fields are sane: Block 3.0, Dodge 3.0, Parry 8.8, Crit 5.0, SpellCrit, ModDamageDonePercent 1.0 ×7, Mastery 8. | 256 (300) |
| BitVectors | 13 → **14** BitVector entries. | RestInfo / ModHealing* / WatchedFactionIndex = -1 / MaxLevel = 90 line up afterwards. | 256 |
| after MaxCreatureScalingLevel | New `u8 TransmogCostMinScalingLevel`. | Value 90. ModPetHaste = 1.0 and NumBackpackSlots = 20 line up only with exactly 1 byte here. | 256 |
| Dynamic counts after Research[1] | The order is DailyQuestsCompleted, Field_1000, AvailableQuestLineXQuestIDs, **Unk554_A (u32, always 0)**, Heirlooms, HeirloomFlags, Toys, **(no ToyFlags count)**, Transmog, ConditionalTransmog, SelfResSpells, WarbandScenes, CharacterRestrictions, SpellPctModByLabel, SpellFlatModByLabel, TaskQuests. | Heirloom data = 42951/48683/61936/62025 (real heirlooms), then HeirloomFlags[4], then 9 real toy IDs (86575, 88370, …). Transmog (8785 dwords) follows the toys directly. | 255 also has no ToyFlags. 256 has ToyFlags and no Unk554_A. The word count is identical; the semantics favour this layout. **UNVERIFIED:** which zero dword is the extra one (it could be a moved ToyFlags count). |
| after TaskQuests count | 12 dwords where 553 had Timerunning/TransportServerTime/TraitConfigs-count/ActiveCombat: Unk554_B, **Unk554_ArrCount (dynamic array, data = {1,2,3} in every sniff; its data is read right after the Transmog data)**, Unk554_C[4], Unk554_E, Unk554_F, Unk554_G, TimerunningSeasonID, **TransportServerTime**, ActiveCombatTraitConfigID. | Glyph pairs (slots 21..26) start right after. The TransportServerTime word is a counter that equals the value in update bit 137 (see G), e.g. 1135924395. The {1,2,3} data sits exactly between the Transmog bitset and PvpInfo[0]. | 256 has the same 12-dword count but other names: 256 calls our TimerunningSeasonID "TransportServerTime" and our TransportServerTime "Unk". **UNVERIFIED:** the names of the 8 zero dwords; 256's UiChromieTimeExpansionID/WeeklyRewardsPeriodSinceOrigin labels are kept only as comments. |
| TraitConfigs | No longer a Resize count in the scalar list. It is now a **map** (u32 count, {i32 key, TraitConfig}) read after DungeonScoreData. | Count 0 in all sniffs. | 256 |
| after TraitConfigs map | New `TransmogOutfits` map (u32 count, {u32 key, TransmogOutfitData}), then `ViewedOutfit` (TransmogOutfitData), then `TransmogMetadata` (TransmogOutfitMetadata), then the existing CharacterRestrictions data, PetStable and bank tabs. | Outfit names "Atuendo 2" / "Indumentaria 1", real slot/situation lists, and the parse ends exactly. | 256 (struct readers copied verbatim) |
| unchanged, confirmed | InvSlots stays 146, GlyphSlots/Glyphs stays **6** (not 9 as in 256), PvpInfo stays 9 × 66 bytes, KnownTitles is u64, BankBagSlotFlags stays 7. | The parse lines up. | — |

---

## G. ActivePlayerData update [70449: rewritten, now mostly verified]

**Mask:** 15 blocks (15-bit mask-mask). u2 has 193 ActivePlayer updates, all parsing clean.

**Group bits:** 0, **32** (553: 38), 70, 102, 134.

- Group 0 covers 1..31.
- Group 32 covers 33..69.
- The dynamic block uses bits 1..39 minus 32. It is 8 bits longer than 553. Which dynamic field is which is UNVERIFIED; bits 31 and 33..39 print `UNVERIFIED554` if set, which never happened.

**Scalar positions:**

- Group 32: FarsightObject 40, SummonedBattlePetGUID 41, Coinage 42 ✓, AccountBankCoinage 43, XP 44 ✓, NextLevelXP 45 ✓, TrialXP 46, Skill 47 ✓, CharacterPoints 48 … DodgePercentage 56 ✓ … CritPercentage/RangedCrit/OffhandCrit 60/61/62 ✓, ShieldBlock 63, ShieldBlockCrit 64, Mastery 65 ✓ … Versatility 69.
- Group 70: VersatilityBonus 71, PvpPowerDamage 72, PvpPowerHealing 73, BitVectors 74 ✓, ModHealingDonePos 75 ✓ … ModResiliencePercent 80 ✓ … LocalFlags 85 ✓ … LifetimeHonorableKills 101.
- Group 102: LifetimeDishonorableKills 103 … MaxCreatureScalingLevel 111, TransmogCostMinScalingLevel 112, PetSpellPower 113 ✓ … ModPetHaste 117 ✓, LocalRegenFlags 118, AuraVision 119 ✓ (u8) … PerksProgramCurrency 132, ResearchHistory 133.
- Group 134: FrozenPerksVendorItem 135, TimerunningSeasonID 136, TransportServerTime 137 ✓, DungeonScore 138, ActiveCombatTraitConfigID 139, GlyphsEnabled 140, LfgRoles 141, **new 142**, **PetStable 143 ✓**, NumStableSlots 144, **new 145, 146, 147**, Field_17B8 148.

Points marked ✓ come from u2 values or s1..s11:

- Level-up to 2: Coinage 50, NextLevelXP 900, XP rising 55/110/…/755.
- Dodge 19.5, Crit 25.29 ×3, Mastery 12.59 (together with CombatRatings[25] = 2754).
- BitVectors parses. ModHealingDonePos 15124, ModResiliencePercent -72, AuraVision u8, ModPetHaste 0.909 / 0.534.
- PetStable (u2 pkt 2) contains pet "Wolf" and StableMaster.

Bits 142 and 145..147 print a warning if set; none fired. Their order relative to NumStableSlots / Field_17B8 is UNVERIFIED. Only "1 new bit before PetStable, 3 after, arrays start at 149" is proven.

**Struct members:** read after all scalar blocks, per group.

- Group 102: ResearchHistory.
- Group 134: ResetBitReader, then the unconditional `HasPetStable` bit (verified: its byte appears whenever group 134 is set), then FrozenPerks, DungeonScore, PetStable.

**Arrays: 553 bit + 13 [70449, was +9 in v1].**

- InvSlots 149/150+i ✓ (slot 36/37 item GUIDs).
- TrackResourceMask 296/297+i.
- SpellCritPercentage 299/300+i ✓, ModDamageDonePos 307+i ✓ (116 ×6), ModDamageDoneNeg 314+i, ModDamageDonePercent 321+i ✓ (1.1 ×7).
- RestInfo 328/329+i (group seen set).
- WeaponDmgMultipliers 331/332+i, WeaponAtkSpeedMultipliers 335+i.
- BuybackPrice 338/339+i, BuybackTimestamp 351+i.
- CombatRatings 363/364+i ✓ (CR[5..10], [17..19], [25]).
- PvpInfo 396/397+i ✓ (9 brackets, per-element masks parse).
- NoReagentCostMask 406/407+i, ProfessionSkillLine 411/412+i, BagSlotFlags 414/415+i, BankBagSlotFlags 419/420+i.
- GlyphSlots 427/428+i, Glyphs 434+i.
- Field_4348 440/441+i (last bit 453).

**Bit 455:** seen set 3× in u2, with no payload. It lies past Field_4348; its meaning is unknown and the reader ignores it.

**Create-vs-update dword mismatch: resolved by count, identities still UNVERIFIED.** v1 had 9 non-scalar create dwords against 8 new update bits. 70449 adds 4 more bits in the late scalar/struct area (142, 145–147). One consistent model:

- **TraitConfigs** left the dynamic block. It is now a map, and in create it is read with the struct members.
- **ToyFlags** was removed.
- The net dynamic change is then UnkA + U1..U9 (create dwords) − ToyFlags − TraitConfigs = +8, which matches the 8 new dynamic bits exactly.
- The 4 late bits are the 4 new struct-type members: TraitConfigs map, TransmogOutfits map, ViewedOutfit, TransmogMetadata.
- Still UNVERIFIED: which of 142/145/146/147 is which, and where UnkA/U1..U9 sit in the dynamic block. The reader still has 553's ToyFlags (12) and TraitConfigs (21) dynamic bits, which are probably wrong.

---

## H. Other substructures

| Struct | Change | Status |
|---|---|---|
| SkillInfo update | 300 entries. Mask = 1 + 7×300 bits, so 66 blocks with a 66-bit mask-mask (2 dwords + 2 bits). Element offsets are 1, 301, 601, 901, 1201, 1501, 1801 (+i). | **[70449] verified**: the level-up update sets SkillRank (601+i) / SkillMaxRank (1201+i) = 10 on the right skill slots and parses exactly. |
| BitVectors update | 14 entries (bits 1..14). | **UNVERIFIED**: never set. |
| QuestLog | Create unchanged. Update re-ordered, see E2. | [70449] |
| ItemModList [70449] | The count is **7 bits** (was 6), both in create and in `ReadUpdateMask(packet, 7)`. | In u2, 39 item creates had 5/10 bytes left. The bits byte 0x02/0x04/0x06 then holds exactly 1/2/3 ItemMods {u8 type, i32 value}, e.g. type 2 = 445. Precedent: retail 12.1 (`UpdateFieldsHandler1210`). The update form follows precedent only. |
| Item, Container, Corpse, DynamicObject, AreaTrigger, SceneObject, Conversation | No changes needed. These object types are rare or absent in the sniffs; whatever was present parsed cleanly. | Not exercised |

---

## I. AreaTriggerData create and VisualAnim [v3, u3]

u3 has all 37 AT creates: SphereShape, PathType 2, radius 2/3/5/10/45. They were 14–43 bytes short before this fix. Changes vs 553, in read order:

| # | Change | Evidence | Precedent |
|---|---|---|---|
| I1 | New `u32 TimeToTargetShape` after `TimeToTargetPos`. | Afterwards SpellID = SpellForVisuals = 121536, SpellXSpellVisualID 447648, BoundsRadius2D 3.0, a real CreatingEffectGUID (Cast/…/121536), RollPitchYaw 0, MovementStartTime = CreationTime (ms clock). | retail 12.x |
| I2 | New `AreaTriggerActionSetPeriodModifier {i32 Field_0, float Field_4}` right after `ShapeType`, before the shape struct. | Field_0 = 0, Field_4 = 1.0 in all 37. The Sphere then reads Radius = RadiusTarget = 3.0 (= BoundsRadius2D). The following ExtraScaleCurve has ParameterCurve 0x3F800001 (constant 1.0 flag) and OverrideActive = true. | retail 12.x (`PeriodModifier`) |
| I3 | New ScaleCurve `OverrideShapeCurve` (25 bytes) after `OverrideMoveCurveZ`, before VisualAnim. | It is always zero (inactive), so only the size is proven: 21 bytes left over = 25 − 4 saved by I4. The position is by precedent. | retail 12.x (curve list ends …MoveCurveZ, ShapeCurve) |
| I4 | **VisualAnim create** uses the retail 11.2.7 layout: ResetBitReader, `HasAnimationDataID bit`, `IsDecay bit`, ResetBitReader, `u32 AnimKitID`, `u32 AnimProgress`, then `i16 AnimationDataID` only if the bit is set. That is 9 bytes, where 553 had 13 (`u32` ×3 + bit). | It accounts for the remaining 4 bytes together with I3. | 1127 |
| I5 | **VisualAnim update** uses the 1127 layout. Bits stay at 5: IsDecay 1, then the HasAnimationDataID bit; AnimKitID 3, AnimProgress 4, AnimationDataID 2 (i16, if flagged). | **UNVERIFIED**: no AreaTrigger value updates (flag 0x800) in any sniff. | 1127 |

**Unchanged and UNVERIFIED** (all 37 ATs are sphere + PathType 2 + no TargetRollPitchYaw/ForcedPosition):

- In 553 the PathType structs (Spline for 0, Orbit for 1) are still read at the very end. Retail 12.x reads them right after PeriodModifier, before the shape.
- Retail's MovementScript (PathType 3), Disk/BoundedPlane shapes, PositionalSoundKitID and SpellCastVisual.ScriptVisualID do **not** exist here; the byte counts rule them out for this path.
- `ReadUpdateAreaTriggerData` is still the 553 layout. It does not account for TimeToTargetShape, PeriodModifier or OverrideShapeCurve, so it is certainly incomplete.

---

## Per-file result (WPP "Parsed … with errors")

| File | Build | UPDATE_OBJECT packets | Objects (create / values) | Errors |
|---|---|---|---|---|
| s1 | 68077 | 22 | 170 / 79 | 0 |
| s2 | 70268 | 54 | 94 / 73 | 0 |
| s3 | 70268 | 149 | 124 / 173 | 0 |
| s4 | 70268 | 266 | 136 / 424 | 0 |
| s5 | 70268 | 246 | 149 / 250 | 0 |
| s6 | 70268 | 150 | 150 / 178 | 0 |
| s7 | 70268 | 13 | 110 / 62 | 0 |
| s8 | 70268 | 26 | 104 / 78 | 0 |
| s9 | 70268 | 1039 | 344 / 1362 | 0 |
| s10 | 70268 | 239 | 121 / 395 | 0 |
| s11 | 70268 | 1295 | 585 / 2614 | 0 |
| **u2** | **70449** | 1643 | 3856 / 7080 | 0 |
| **u3** | **70449** | 13427 | 11792 / 47583 | 0 |

Every file has 0 exceptions, 0 "Updatefields not fully read" and 0 `UNVERIFIED554` warnings.

Our own server output (`wpp554/ours.pkt`, not tuned to) fails in 3 of 5 packets. Its first error is in the movement block: our server sends no GravityModifier (A2), so PauseTimes and everything after it are garbage. One "Values Player" update also has 12 bytes left over.
