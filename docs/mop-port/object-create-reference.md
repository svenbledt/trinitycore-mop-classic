# Object create block: unused SceneObject payloads

Upstream TrinityCore keeps these as commented-out code in `Object::BuildMovementUpdate`
(`flags.SceneObject`). They were moved here to meet the 2-line inline-comment limit. The server always
writes `HasLocalScriptData = false` and `HasPetBattleFullUpdate = false`, so none of this is sent.

```cpp
    if (HasLocalScriptData)
    {
        data->WriteBits(Data.length(), 7);
        data->FlushBits();
        data->WriteString(Data);
    }

    if (HasPetBattleFullUpdate)
    {
        for (std::size_t i = 0; i < 2; ++i)
        {
            *data << ObjectGuid(Players[i].CharacterID);
            *data << int32(Players[i].TrapAbilityID);
            *data << int32(Players[i].TrapStatus);
            *data << uint16(Players[i].RoundTimeSecs);
            *data << int8(Players[i].FrontPet);
            *data << uint8(Players[i].InputFlags);

            data->WriteBits(Players[i].Pets.size(), 2);
            data->FlushBits();
            for (std::size_t j = 0; j < Players[i].Pets.size(); ++j)
            {
                *data << ObjectGuid(Players[i].Pets[j].BattlePetGUID);
                *data << int32(Players[i].Pets[j].SpeciesID);
                *data << int32(Players[i].Pets[j].CreatureID);
                *data << int32(Players[i].Pets[j].DisplayID);
                *data << int16(Players[i].Pets[j].Level);
                *data << int16(Players[i].Pets[j].Xp);
                *data << int32(Players[i].Pets[j].CurHealth);
                *data << int32(Players[i].Pets[j].MaxHealth);
                *data << int32(Players[i].Pets[j].Power);
                *data << int32(Players[i].Pets[j].Speed);
                *data << int32(Players[i].Pets[j].NpcTeamMemberID);
                *data << uint8(Players[i].Pets[j].BreedQuality);
                *data << uint16(Players[i].Pets[j].StatusFlags);
                *data << int8(Players[i].Pets[j].Slot);

                *data << uint32(Players[i].Pets[j].Abilities.size());
                *data << uint32(Players[i].Pets[j].Auras.size());
                *data << uint32(Players[i].Pets[j].States.size());
                for (std::size_t k = 0; k < Players[i].Pets[j].Abilities.size(); ++k)
                {
                    *data << int32(Players[i].Pets[j].Abilities[k].AbilityID);
                    *data << int16(Players[i].Pets[j].Abilities[k].CooldownRemaining);
                    *data << int16(Players[i].Pets[j].Abilities[k].LockdownRemaining);
                    *data << int8(Players[i].Pets[j].Abilities[k].AbilityIndex);
                    *data << uint8(Players[i].Pets[j].Abilities[k].Pboid);
                }

                for (std::size_t k = 0; k < Players[i].Pets[j].Auras.size(); ++k)
                {
                    *data << int32(Players[i].Pets[j].Auras[k].AbilityID);
                    *data << uint32(Players[i].Pets[j].Auras[k].InstanceID);
                    *data << int32(Players[i].Pets[j].Auras[k].RoundsRemaining);
                    *data << int32(Players[i].Pets[j].Auras[k].CurrentRound);
                    *data << uint8(Players[i].Pets[j].Auras[k].CasterPBOID);
                }

                for (std::size_t k = 0; k < Players[i].Pets[j].States.size(); ++k)
                {
                    *data << uint32(Players[i].Pets[j].States[k].StateID);
                    *data << int32(Players[i].Pets[j].States[k].StateValue);
                }

                data->WriteBits(Players[i].Pets[j].CustomName.length(), 7);
                data->FlushBits();
                data->WriteString(Players[i].Pets[j].CustomName);
            }
        }

        for (std::size_t i = 0; i < 3; ++i)
        {
            *data << uint32(Enviros[j].Auras.size());
            *data << uint32(Enviros[j].States.size());
            for (std::size_t j = 0; j < Enviros[j].Auras.size(); ++j)
            {
                *data << int32(Enviros[j].Auras[j].AbilityID);
                *data << uint32(Enviros[j].Auras[j].InstanceID);
                *data << int32(Enviros[j].Auras[j].RoundsRemaining);
                *data << int32(Enviros[j].Auras[j].CurrentRound);
                *data << uint8(Enviros[j].Auras[j].CasterPBOID);
            }

            for (std::size_t j = 0; j < Enviros[j].States.size(); ++j)
            {
                *data << uint32(Enviros[i].States[j].StateID);
                *data << int32(Enviros[i].States[j].StateValue);
            }
        }

        *data << uint16(WaitingForFrontPetsMaxSecs);
        *data << uint16(PvpMaxRoundTime);
        *data << int32(CurRound);
        *data << uint32(NpcCreatureID);
        *data << uint32(NpcDisplayID);
        *data << int8(CurPetBattleState);
        *data << uint8(ForfeitPenalty);
        *data << ObjectGuid(InitialWildPetGUID);
        data->WriteBit(IsPVP);
        data->WriteBit(CanAwardXP);
        data->FlushBits();
    }
```
