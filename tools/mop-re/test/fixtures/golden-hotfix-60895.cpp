    // Achievement.db2
    PrepareStatement(HOTFIX_SEL_ACHIEVEMENT, "SELECT Description, Title, Reward, ID, InstanceID, Faction, Supercedes, Category, MinimumCriteria, "
        "Points, Flags, UiOrder, IconFileID, CriteriaTree, SharesCriteria FROM achievement WHERE (`VerifiedBuild` > 0) = ?", CONNECTION_SYNCH);
    PREPARE_MAX_ID_STMT(HOTFIX_SEL_ACHIEVEMENT, "SELECT MAX(ID) + 1 FROM achievement", CONNECTION_SYNCH);
    PREPARE_LOCALE_STMT(HOTFIX_SEL_ACHIEVEMENT, "SELECT ID, Description_lang, Title_lang, Reward_lang FROM achievement_locale"
        " WHERE (`VerifiedBuild` > 0) = ? AND locale = ?", CONNECTION_SYNCH);

    // AreaTrigger.db2
    PrepareStatement(HOTFIX_SEL_AREA_TRIGGER, "SELECT Message, PosX, PosY, PosZ, ID, ContinentID, PhaseUseFlags, PhaseID, PhaseGroupID, Radius, "
        "BoxLength, BoxWidth, BoxHeight, BoxYaw, ShapeType, ShapeID, AreaTriggerActionSetID, Flags FROM area_trigger WHERE (`VerifiedBuild` > 0) = ?", CONNECTION_SYNCH);
    PREPARE_MAX_ID_STMT(HOTFIX_SEL_AREA_TRIGGER, "SELECT MAX(ID) + 1 FROM area_trigger", CONNECTION_SYNCH);
    PREPARE_LOCALE_STMT(HOTFIX_SEL_AREA_TRIGGER, "SELECT ID, Message_lang FROM area_trigger_locale WHERE (`VerifiedBuild` > 0) = ? AND locale = ?", CONNECTION_SYNCH);

    // ChrClasses.db2
    PrepareStatement(HOTFIX_SEL_CHR_CLASSES, "SELECT Name, Filename, NameMale, NameFemale, PetNameToken, ID, CreateScreenFileDataID, "
        "SelectScreenFileDataID, IconFileDataID, LowResScreenFileDataID, Flags, StartingLevel, SpellTextureBlobFileDataID, ArmorTypeMask, "
        "CinematicSequenceID, DefaultSpec, HasStrengthAttackBonus, PrimaryStatPriority, DisplayPower, RangedAttackPowerPerAgility, "
        "AttackPowerPerAgility, AttackPowerPerStrength, SpellClassSet, RolesMask, DamageBonusStat, HasRelicSlot FROM chr_classes"
        " WHERE (`VerifiedBuild` > 0) = ?", CONNECTION_SYNCH);
    PREPARE_MAX_ID_STMT(HOTFIX_SEL_CHR_CLASSES, "SELECT MAX(ID) + 1 FROM chr_classes", CONNECTION_SYNCH);
    PREPARE_LOCALE_STMT(HOTFIX_SEL_CHR_CLASSES, "SELECT ID, Name_lang, NameMale_lang, NameFemale_lang FROM chr_classes_locale"
        " WHERE (`VerifiedBuild` > 0) = ? AND locale = ?", CONNECTION_SYNCH);

