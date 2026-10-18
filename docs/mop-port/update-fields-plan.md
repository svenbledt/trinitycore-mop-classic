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
3. **5.5.4 deltas:** locate the client's per-struct create readers, tokenize, compare with the 5.5.3 tokens; patch the
   converter input (not the output) for each proven difference.
4. Compile the game code against the new fields (new fields default to 0; no gameplay values yet), build, ctest.
5. Live test enter-world; fix by crash/stack as before.

## Not in scope
Filling the new fields with real values (Phase 4), new object types (housing, mesh objects), DB2 changes.
