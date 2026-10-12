# Phase 2a blocker — "active game time required to create a character"

**Status:** RESOLVED 2026-10-12. The real gate was WowTokenLimitedMode in the glue feature status
(see `re-notes.md` "Phase 2a live fixes"); the game-time-state packet was not the cause. History kept for context.

## Symptom
MoP Classic 5.5.4.70032 client, at the character-select screen:
- Red text on the create button: *"Zum Erstellen eines Charakters ist aktive Spielzeit erforderlich"* / *"To create a character you need active playtime."*
- "Jetzt neu abonnieren" (Subscribe now) banner shown; Shop button greyed.
- `Neuen Charakter erstellen` is disabled, so **`CMSG_CREATE_CHARACTER` is never sent** — the client gates creation before any packet. This is an account subscription/game-time gate, NOT a packet bug.

## Ruled out (with evidence)
- **Expansion.** `worldserver.conf Expansion=4` (ActiveExpansionLevel) and `AccountExpansionLevel = GetAccountExpansion()` — no effect. `AccountExpansionLevel = 0` is upstream cata_classic ("Classic only").
- **bnet v1 account RPCs.** Implemented `HandleGetGameAccountState` `game_time_info` (is_subscription/is_unlimited_play_time=true) and `HandleGetGameTimeRemainingInfo` (minutes_remaining large) — **never called**. Full bnet RPC trace (service.protobuf logger) shows the client uses the **v2** AccountService only.
- **World `SMSG_AUTH_RESPONSE` `GameTimeInfo.TimeRemain`** set to 2e9 — no effect.

## What the client actually does (bnet trace, cache-cleared fresh login)
`service.protobuf` trace of the full login. The only account calls are **v2**:
- `ConnectionService.Connect`, `AuthenticationService.Logon` + `VerifyAuthToken` → `OnLogonComplete { account_id:1, game_account{ id:1, title_id:5730135, region:2 }, session_key }`
- `AccountService.GetAccountInfo` → `info { account_id:1, flags:7 }` (flags = FLAG_IS_HIDDEN_FROM_FRIEND_FINDER only)
- `AccountService.GetRestriction` → empty
- `AccountService.GetGameAccountInfo` → `info { account_id:1, name:"WoW1" }`
- `AccountService.GetGameAccountRestriction` → empty
- `GameUtilitiesService.ProcessTask` (RealmListTicket, FetchBleepProxies, LastCharPlayed, RealmList, RealmJoin) + `GetAllValuesForAttribute(RealmListRequest)`
- Then `ForceDisconnect` after realm join → client goes to world. **No game-time RPC, no Subscribe.**

Key constraint: the **v2 `GameAccountInfo` proto has only `account_id` + `name`** (`src/server/proto/Client/api/common/v2/account_types.pb.h`) and v2 `AccountInfo` flags have no subscription bit — so no v2 account response can carry game-time. The client gets **no positive "has subscription/game-time" signal from any response it reads**, so it defaults to "no game time."

## Client RE findings (dump `WowClassic_dump.exe.i64`, imagebase 0x140000000)
- Lua `GetBillingTimeRemaining` C handler `sub_141819F80` → reads the **NetClient singleton `qword_143D81E08`** (same singleton as the CertStore, RVA 0x3D81E08): returns `0` if `[singleton+0x7F4]==1`, else `[singleton+0x7F8]`. So world billing time lives at `+0x7F8`, gated by a flag at `+0x7F4`. **But `GetBillingTimeRemaining()==0` is normal for an unlimited sub**, so the create-gate almost certainly uses a different "is-subscribed" check, not this value.
- Relevant client enum strings: `NoGameTimeRemaining`, `NoPlayTime`, `PartialPlayTime`; bnet proto `GameTimeInfo{is_subscription,is_unlimited_play_time}`, `GameTimeRemainingInfo{minutes_remaining,...}`.
- The create-button disable + tooltip is **FrameXML Lua** (in CASC, not the binary); the binary is control-flow-obfuscated, so the exact gate condition wasn't isolated from disassembly alone.

## Why this is novel
Classic-family clients (Classic Era/TBC/Wrath/Cata/MoP Classic) enforce a subscription/game-time gate that retail-engine clients don't. TC master (12.0.x) and cata_classic do **not** implement any game-time/subscription reporting, and retail TC clients never hit this gate. No published MoP/Cata Classic emulator fix was found. This is uncharted for the port.

## Recommended next steps (in order)
1. **Extract the glue Lua from CASC (definitive).** Use `tools/mop-re/casc/casc_dump.cpp` to pull the character-select / create glue Lua (`Blizzard_GlueXML` / `Blizzard_CharacterCreate`) and read the exact disable condition + the C API it calls. Needs the FileDataID(s) — get them from a community listfile (wago.tools) filtered to "charactercreate"/"characterselect".
2. **From that condition, identify the single server signal** (a specific v2 bnet response field, a bnet notification after Subscribe, or a world SMSG) and implement exactly that — one change, one test.
3. Only then resume live testing.

## Also outstanding
- **Launcher CertStore regression:** `burralis-launcher` `CertStoreInjector` polls on the UI thread, freezing the window after the first inject and not reliably re-injecting on realm reconnect → every live test needs ~2 login attempts. Fix: move the poll loop off the UI thread / add a small sleep.
