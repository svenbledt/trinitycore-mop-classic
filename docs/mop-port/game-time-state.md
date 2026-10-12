# Game-time / subscription state (5.5.4.70032)

Correction (2026-10-12): this did NOT fix the create button; the gate was WowTokenLimitedMode (`re-notes.md`
"Phase 2a live fixes"). The packet is still correct and sent. All addresses are IDA EAs in the 70032 dump (image base `0x140000000`).

## Where the client keeps it
NetClient singleton `qword_143D81E08`, 16 bytes at `+0x7F4` = the `GameTimeInfo` block:
`+0x7F4 BillingPlan (u32)`, `+0x7F8 TimeRemain (u32)`, `+0x7FC Unknown735 (u32)`, `+0x800..0x802` the three bits.
The NetClient ctor (`sub_141698410`) zeroes it, so with no packet BillingPlan = 0.

## The only writer: SMSG_UPDATE_GAME_TIME_STATE = `0x4602DB`
- Getter `sub_1405CFC20` (`mov [rdx], 4602DBh`), dispatch case `4588251` in `sub_14061C540`.
- Ctor `sub_1405CFC30` reads the block at packet+32 with `sub_140667EF0` (the same GameTimeInfo reader AUTH_RESPONSE
  uses: u32, u32, u32, one byte holding 3 bits).
- Handle thunk `sub_1405CFC10` jumps through `qword_143D79BD0`, set to `sub_141699320` by the NetClient ctor, which
  reaches `sub_1416F3A20` "Handle Update Game Time State": `*(OWORD*)(NetClient+0x7F4) = *(OWORD*)(packet+32)` and
  fires a Lua event when the trial/veteran state flips.
- No other code writes `+0x7F4..+0x803` (scanned every `[reg+7F4h]`/`[reg+7F8h]` store). AUTH_RESPONSE's GameTimeInfo
  is parsed but does not reach this field.
- The repo had the name at `0x4602D5` (constant-drift guess; that slot is a different packet) and never sent it.

## Readers (what the values mean)
| Check | Code | Meaning |
|---|---|---|
| `IsTrialAccount()` | `sub_140C9EF80`: `BillingPlan == 5` | full trial |
| `IsVeteranTrialAccount()` | `sub_140C9F440`: `BillingPlan == 4` | lapsed subscription ("Resubscribe") |
| ~100 restriction checks | `cmp [NetClient+7F4h], 5` / `4` | trial/veteran limits |
| `GetBillingTimeRemaining()` | `sub_141819F80`: 0 if `BillingPlan == 1` else TimeRemain | 1 = unlimited subscription |
| `GetBillingPlan()` | `sub_141819FC0`: server 1→1, 2→3, 3→4, else 0; plus IGR bit `+0x801` | Lua plan id |

Both trial checks also return true if a CVar named `converted` exists with value 0 (FNV-1a lookup, seed = hash of "c");
no such CVar is registered in 70032, so that branch is dead.

## Server
`WorldSession::SendGameTimeState()` sends BillingPlan = 1 (unlimited subscription), TimeRemain = 0, right after
SMSG_AUTH_RESPONSE. Open: the exact create-button condition lives in the glue Lua (CASC, not the binary); if plan 1 is
not enough, read `CharacterSelect`/`CharacterCreate` glue Lua to see which of the readers above it calls.
