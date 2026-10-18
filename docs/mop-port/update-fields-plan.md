# Update fields for 5.5.4.70449 — plan (2026-10-18)

Goal: SMSG_UPDATE_OBJECT create/update blocks that the 70449 client parses, so a character enters the world.

## Findings so far
- First enter-world crash (null call in `0x142DB25D0`, from UPDATE_OBJECT reader `0x1406E7B80`) was the **entity fragment
  numbering**: 70449 uses retail 11.2.7 IDs (CGObject 2, FVendor_C 17, Tag_* 200-219). 16 client registrations
  (`0x14024AE40` and others) checked against WPP `WowCSEntityFragments1127`, 0 disagree. Fixed in
  `WowCSEntityDefinitions.h` (values only; code uses the names).
- Our `UpdateFields.{h,cpp}` is the generated Cata 4.4.2 layout. WPP (TrinityCore/WowPacketParser) has the same
  generator's output for 4.4.2 and every MoP Classic build up to 5.5.3.64802 (`UpdateFieldsHandler553.cs` +
  `UpdateFields/V5_5_3_64802/*.cs`). 4.4.2 -> 5.5.3 only adds: 38 fields in 10 structs, 1 type change, 11 new
  sub-structs; nothing removed or renamed. The reader diff has 276 hunks, mostly changes-mask bit shifts.
- The client has no field-name metadata; 5.5.4-vs-5.5.3 changes must come from the client's generated readers.

## Steps
1. **Converter** `tools/mop-re/uf/`: WPP handler + struct defs -> TrinityCore-style `UpdateFields.{h,cpp}`
   (WriteCreate / WriteUpdate / ClearChangesMask, HasChangesMask sizes, UpdateField<T, block, bit>, visibility flags).
   Validate by converting WPP 4.4.2 and diffing against our current file; every difference must be explained.
2. Generate 5.5.3; keep TC-only parts (ViewerDependentValues hooks, owner/receiver params) exactly as today.
3. **5.5.4 deltas:** the client does not read update fields through the packet primitives (no function calling the
   u64 reader starts like UnitData), and it has no field-name metadata; it uses the "Jam mirror" system
   (`JamMirrorBaseHandlersWrapper<...CGUnit_C...>` change callbacks). So: live-test the 5.5.3 layout first and use the
   crash stack to locate the struct reader that differs, then compare that reader with 5.5.3.
4. Compile the game code against the new fields (new fields default to 0; no gameplay values yet), build, ctest.
5. Live test enter-world; fix by crash/stack as before.

## Not in scope
Filling the new fields with real values (Phase 4), new object types (housing, mesh objects), DB2 changes.

## 5.5.4 deltas ported (2026-10-18)
Source: 11 ymir sniffs (5.5.4.68077/70268) plus one 70449 sniff, decoded with the local WPP reader
`tools/mop-re/refs/wpp/.../UpdateFieldsHandler554.cs` (v3, sha256 `8db9ac78...`; 0 parse errors on 14 sniffs, 18.5k UPDATE_OBJECTs). Every delta
with its evidence: [uf554-deltas.md](uf554-deltas.md).

- Ported: VisibleItem (11-bit mask, transmog fields), UnitData (VirtualItems moved, NameplateAttach, +1 bit shift),
  GameObjectData Flags2, PlayerData (QuestLogQuestIdToIndex map, VisibleItems moved, bit shifts), QuestLog update order,
  ItemModList 7-bit count, VisualAnim (retail 11.2.7 layout), AreaTriggerData create (TimeToTargetShape,
  PeriodModifier, OverrideShapeCurve), SkillInfo 300, BitVectors 14, ActivePlayerData create (TransmogCostMinScalingLevel,
  unknown dwords, TraitConfigs as map, TransmogOutfits/ViewedOutfit/TransmogMetadata) and update (groups 0/32/70/102/134,
  arrays +13), movement create `GravityModifier` (1.0), FVendor_C no longer an indirect fragment.
- Gate: `py -3.12 tools/mop-re/uf/uf_check.py <UpdateFields.cpp> <UpdateFieldsHandler554.cs>` gives 0 differing functions.
  The checker skips reader-only `UNVERIFIED554` diagnostics and the map delta branch (we always send the full map).
- `TODO(verify)` left in `UpdateFields.h`/`.cpp`: VisibleItem HasTransmog/HasIllusion/SheatheCategory; UnitData
  NameplateAttach position; GameObjectData Flags2; QuestLog update bits 3/4; PlayerData QuestLogQuestIdToIndex full-map
  update form; SkillInfo/BitVectors update paths; ActivePlayerData ToyFlags/TraitConfigs update bits, create-only
  Unk554_* fields (names, update bits 31/33-39/142/145-147; sniffs show Unk554_Arr = {1,2,3}, we send empty);
  VisualAnim update path and "0 = no AnimationDataID"; AreaTriggerData update (5.5.3 layout, lacks the 3 new fields),
  OverrideShapeCurve position, Spline/Orbit placement.
