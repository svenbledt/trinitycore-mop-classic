// TC layouts: TransmogrificationPackets.cpp, CollectionPackets.cpp, MiscPackets.cpp (Dismount) and the account collection burst.
export const specs = {};
export const fixed = {};

// TransmogrificationPackets.cpp operator<</>> TransmogOutfitDataInfo
const outfitInfo = (r) => { r.u8("SetType"); r.u32("Icon"); const l = r.bits(8, "NameLen"); r.bit("SituationsEnabled"); r.str(l, "Name"); };
const outfitSlot = (r) => { r.i8("Slot"); r.u8("SlotOption"); r.u8("SheatheCategory"); r.u32("ItemModifiedAppearanceID"); r.u8("AppearanceDisplayType");
  r.u32("SpellItemEnchantmentID"); r.u8("IllusionDisplayType"); r.u32("Flags"); };
const situation = (r) => { r.u32("SituationID"); r.u32("SpecID"); r.u32("LoadoutID"); r.u32("EquipmentSetID"); };

specs.CMSG_TRANSMOG_OUTFIT_NEW = (r) => { r.guid("Npc"); r.u8("Source"); outfitInfo(r); };
specs.SMSG_TRANSMOG_OUTFIT_NEW_ENTRY_ADDED = (r) => { r.u32("TransmogOutfitID"); };
specs.CMSG_TRANSMOG_OUTFIT_UPDATE_INFO = (r) => { r.u32("OutfitID"); r.guid("Npc"); outfitInfo(r); };
specs.SMSG_TRANSMOG_OUTFIT_INFO_UPDATED = (r) => { r.u32("TransmogOutfitID"); outfitInfo(r); };
specs.CMSG_TRANSMOG_OUTFIT_UPDATE_SITUATIONS = (r) => { r.u32("OutfitID"); r.guid("Npc"); const n = r.u32("Situations"); for (let i = 0; i < n; i++) situation(r); r.bit("SituationsEnabled"); };
specs.SMSG_TRANSMOG_OUTFIT_SITUATIONS_UPDATED = (r) => { r.u32("TransmogOutfitID"); const n = r.u32("Situations"); for (let i = 0; i < n; i++) situation(r); r.bit("SituationsEnabled"); };
specs.CMSG_TRANSMOG_OUTFIT_UPDATE_SLOTS = (r) => { r.u32("OutfitID"); const n = r.u32("Slots"); r.guid("Npc"); r.u64("Cost"); for (let i = 0; i < n; i++) outfitSlot(r); r.bit("UseAvailableDiscount"); };
specs.SMSG_TRANSMOG_OUTFIT_SLOTS_UPDATED = (r) => { r.u32("TransmogOutfitID"); const n = r.u32("Slots"); for (let i = 0; i < n; i++) outfitSlot(r); };

// TransmogrificationPackets.cpp AccountTransmogUpdate / AccountTransmogSetFavoritesUpdate
specs.SMSG_ACCOUNT_TRANSMOG_UPDATE = (r) => { r.bit("IsFullUpdate"); r.bit("IsSetFavorite"); const f = r.u32("Favorites"), n = r.u32("NewAppearances"); for (let i = 0; i < f + n; i++) r.u32("ID"); };
specs.SMSG_ACCOUNT_TRANSMOG_SET_FAVORITES_UPDATE = (r) => { r.bit("IsFullUpdate"); r.bit("IsSetFavorite"); const n = r.u32("TransmogSets"); for (let i = 0; i < n; i++) r.u32("TransmogSetID"); };

// CollectionPackets.cpp AccountItemCollectionData (no client handler in 5.5.4; first u32 is uninitialised on retail)
specs.SMSG_ACCOUNT_ITEM_COLLECTION_DATA = (r) => { r.u32("Unknown1110_1"); r.u8("Type"); const n = r.u32("Items");
  for (let i = 0; i < n; i++) { r.i32("ID"); r.u8("Type"); r.u64("Unknown1110"); r.i32("Flags"); } r.bit("Unknown1110_2"); };

// MiscPackets.cpp Dismount
specs.SMSG_DISMOUNT = (r) => { r.guid("Guid"); };

// Not sent by TC (housing collections, client handlers in HousingSystem_C.cpp); kept so new sniffs keep checking their shape
const idsWithBits = (r) => { r.bit("IsFullUpdate"); const n = r.u32("IDs"), b = r.u32("Bits"); for (let i = 0; i < n; i++) r.u32("ID"); for (let i = 0; i < b; i++) r.bit("Flag"); };
specs.SMSG_ACCOUNT_ROOM_COLLECTION_UPDATE = idsWithBits;
specs.SMSG_ACCOUNT_EXTERIOR_FIXTURE_COLLECTION_UPDATE = idsWithBits;
specs.SMSG_ACCOUNT_ROOM_THEME_COLLECTION_UPDATE = idsWithBits;
specs.SMSG_ACCOUNT_ROOM_MATERIAL_COLLECTION_UPDATE = idsWithBits;
