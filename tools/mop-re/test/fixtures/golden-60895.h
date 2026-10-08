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
struct AchievementLoadInfo
{
    static constexpr DB2FieldMeta Fields[15] =
    {
        { false, FT_STRING, "Description" },
        { false, FT_STRING, "Title" },
        { false, FT_STRING, "Reward" },
        { false, FT_INT, "ID" },
        { true, FT_SHORT, "InstanceID" },
        { true, FT_BYTE, "Faction" },
        { true, FT_SHORT, "Supercedes" },
        { true, FT_SHORT, "Category" },
        { true, FT_BYTE, "MinimumCriteria" },
        { true, FT_BYTE, "Points" },
        { true, FT_INT, "Flags" },
        { false, FT_SHORT, "UiOrder" },
        { true, FT_INT, "IconFileID" },
        { false, FT_INT, "CriteriaTree" },
        { true, FT_SHORT, "SharesCriteria" },
    };

    static constexpr DB2LoadInfo Instance{ Fields, 15, &AchievementMeta::Instance, HOTFIX_SEL_ACHIEVEMENT };
};

struct AreaTriggerLoadInfo
{
    static constexpr DB2FieldMeta Fields[18] =
    {
        { false, FT_STRING, "Message" },
        { false, FT_FLOAT, "PosX" },
        { false, FT_FLOAT, "PosY" },
        { false, FT_FLOAT, "PosZ" },
        { false, FT_INT, "ID" },
        { false, FT_SHORT, "ContinentID" },
        { true, FT_INT, "PhaseUseFlags" },
        { true, FT_SHORT, "PhaseID" },
        { true, FT_SHORT, "PhaseGroupID" },
        { false, FT_FLOAT, "Radius" },
        { false, FT_FLOAT, "BoxLength" },
        { false, FT_FLOAT, "BoxWidth" },
        { false, FT_FLOAT, "BoxHeight" },
        { false, FT_FLOAT, "BoxYaw" },
        { true, FT_BYTE, "ShapeType" },
        { true, FT_SHORT, "ShapeID" },
        { true, FT_INT, "AreaTriggerActionSetID" },
        { true, FT_BYTE, "Flags" },
    };

    static constexpr DB2LoadInfo Instance{ Fields, 18, &AreaTriggerMeta::Instance, HOTFIX_SEL_AREA_TRIGGER };
};

