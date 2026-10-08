struct ChrClassesMeta
{
    static constexpr DB2MetaField Fields[26] =
    {
        { FT_STRING, 1, true },
        { FT_STRING_NOT_LOCALIZED, 1, true },
        { FT_STRING, 1, true },
        { FT_STRING, 1, true },
        { FT_STRING_NOT_LOCALIZED, 1, true },
        { FT_INT, 1, false },
        { FT_INT, 1, false },
        { FT_INT, 1, false },
        { FT_INT, 1, false },
        { FT_INT, 1, false },
        { FT_INT, 1, true },
        { FT_INT, 1, true },
        { FT_INT, 1, false },
        { FT_INT, 1, false },
        { FT_SHORT, 1, false },
        { FT_SHORT, 1, false },
        { FT_BYTE, 1, false },
        { FT_BYTE, 1, false },
        { FT_BYTE, 1, true },
        { FT_BYTE, 1, false },
        { FT_BYTE, 1, false },
        { FT_BYTE, 1, false },
        { FT_BYTE, 1, false },
        { FT_BYTE, 1, false },
        { FT_BYTE, 1, false },
        { FT_BYTE, 1, false },
    };

    static constexpr DB2Meta Instance{ 1361031, 5, 26, 26, 0xE20D59D3, Fields, -1 };
};

struct ActionBarGroupEntryMeta
{
    static constexpr DB2MetaField Fields[5] =
    {
        { FT_INT, 1, true },
        { FT_INT, 1, true },
        { FT_INT, 1, true },
        { FT_INT, 1, true },
        { FT_INT, 1, true },
    };

    static constexpr DB2Meta Instance{ 4572797, -1, 5, 4, 0xF28AF796, Fields, 4 };
};

struct ChrClassesLoadInfo
{
    static constexpr DB2FieldMeta Fields[26] =
    {
        { false, FT_STRING, "Name" },
        { false, FT_STRING_NOT_LOCALIZED, "Filename" },
        { false, FT_STRING, "NameMale" },
        { false, FT_STRING, "NameFemale" },
        { false, FT_STRING_NOT_LOCALIZED, "PetNameToken" },
        { false, FT_INT, "ID" },
        { false, FT_INT, "CreateScreenFileDataID" },
        { false, FT_INT, "SelectScreenFileDataID" },
        { false, FT_INT, "IconFileDataID" },
        { false, FT_INT, "LowResScreenFileDataID" },
        { true, FT_INT, "Flags" },
        { true, FT_INT, "StartingLevel" },
        { false, FT_INT, "SpellTextureBlobFileDataID" },
        { false, FT_INT, "ArmorTypeMask" },
        { false, FT_SHORT, "CinematicSequenceID" },
        { false, FT_SHORT, "DefaultSpec" },
        { false, FT_BYTE, "HasStrengthAttackBonus" },
        { false, FT_BYTE, "PrimaryStatPriority" },
        { true, FT_BYTE, "DisplayPower" },
        { false, FT_BYTE, "RangedAttackPowerPerAgility" },
        { false, FT_BYTE, "AttackPowerPerAgility" },
        { false, FT_BYTE, "AttackPowerPerStrength" },
        { false, FT_BYTE, "SpellClassSet" },
        { false, FT_BYTE, "RolesMask" },
        { false, FT_BYTE, "DamageBonusStat" },
        { false, FT_BYTE, "HasRelicSlot" },
    };

    static constexpr DB2LoadInfo Instance{ Fields, 26, &ChrClassesMeta::Instance, HOTFIX_SEL_CHR_CLASSES };
};
