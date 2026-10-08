# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Port of TrinityCore's `cata_classic` branch (Cataclysm Classic 4.4.x) to the **Mists of Pandaria Classic** client.

- **First milestone:** a client logs in, creates or selects a character, and enters the world.
- **Long term:** a solid MoP Classic core that keeps receiving upstream TrinityCore `cata_classic` fixes.

> Repository state (2026-10-08): imported TrinityCore `cata_classic` at `0614c9fd941` (full history) as local `main`.
> Remote `upstream` = `TrinityCore/TrinityCore`, push disabled. There is no `origin` yet; the project repo will be **private**, so never create or push to a public remote.
> Upstream currently targets Cata Classic **4.4.2.60895** (newest row in `build_info`, `sql/base/auth_database.sql`).
> Target client: MoP Classic **5.5.4.70032**. The dump at `d:\WoW\World of Warcraft\_classic_\WowClassic_dump.exe`, the installed exe and CASC (`.build.info`) all match.
> The user replaces the dump when a new build is released, so check its FileVersion at session start and re-baseline if it changed.
> Never run the dump; it's for static analysis only.
> Decided 2026-10-08: **MoP-only**, so Cata Classic client support is dropped and protocol files change in place. Reverse-engineer the dump with the IDA Pro MCP or Ghidra. Hosting will be a private repo on the user's GitHub; ask before creating it or pushing.

## Session start

1. Read everything in `docs/mop-port/` and continue from the documented state. If that directory doesn't exist, Phase 0 hasn't started.
2. Keep `docs/mop-port/STATUS.md` current.
3. Before coding each phase, show a short plan. Then implement, build, test, and summarize what changed and what's next.

## Sources and authority

| Source | Use for | Authority |
|---|---|---|
| TrinityCore `cata_classic` | Architecture, build system, DB layer, bnetserver/networking, DB2 stores, CASC extractors, scripting, fixes | The base and the **only upstream** |
| MoP Classic client (.exe + CASC) | Build number, opcode diffs, packet layouts, update-field layout, DB2 definitions, auth changes | **Ground truth** for anything that changed since Cata Classic. Interoperability analysis only. |
| SkyFire 5.4.8 | MoP game logic and content: Monk, spec/talent rework, pet battles, scenarios, challenge modes, spells, creatures, quests, gameobjects, SmartAI, scripts | **Not authoritative** for the network protocol |
| TrinityCore `WowPacketParser`, module `WowPacketParserModule.V5_5_0_61735` | Cited reference for MoP Classic opcodes, packet layouts and update fields | Covers builds up to 5.5.3.67509. Check 5.5.4 changes against the client. |
| TrinityCore `ymir` | Packet sniffer that supports MoP Classic 5.5.x | Tooling only |

## Hard rules

- **Context7 first.** Before using any external library or tool (Boost, OpenSSL, protobuf, MySQL connector, CMake, fmt, bun, and so on), fetch current docs via Context7 (`resolve-library-id`, then `query-docs`).
- **Never guess protocol constants.** Every opcode, field offset, enum value and packet layout must trace back to one of:
  - the client binary
  - a client dump
  - a cited reference implementation

  Mark anything unverified with `// TODO(verify):`.
- **Keep diffs mergeable with upstream.**
  - Follow TrinityCore's existing patterns for build-version gating, packet classes, opcode tables and DB2 stores.
  - Keep MoP-specific changes localized.
  - Don't refactor upstream code unless it's required.
- **Inline comments: 2 lines max.** State only the non-obvious "why"; longer reasoning goes in `docs/mop-port/` with a one-line pointer. A PostToolUse hook (`tools/comment_budget_hook.mjs`) enforces this on every file you edit, upstream TrinityCore comments included (only vendored `dep/` is exempt).
  - **Never ignore a comment-budget block.** Fix every run it reports before moving on, even ones your edit didn't write: an earlier edit, session or person put it there, and it's still ours to fix.
- **Small steps.** Each commit is buildable and testable. The build must pass on Linux, and on Windows if configured, and existing tests must run.
- **Ask before hard-to-reverse decisions**, such as:
  - dropping Cata Classic client support vs. keeping multi-build support
  - DB schema forks
  - large content imports
- **Interoperability only.**
  - Limit reverse engineering to what a server needs to talk to the client.
  - Don't bypass client protections beyond what connecting to a custom server requires.
  - Never commit client binaries or extracted Blizzard assets.
- **Say when something is unknown.** Propose how to find out, and don't paper over it.

## Phases

0. **Recon (no code changes).**
   - Check whether `cata_classic` is still the active Classic branch.
   - Look for an existing MoP Classic branch or fork. If one exists, report its state and ask whether to base on it.
   - Identify the exact client build and diff it against the Cata Classic build: auth, opcodes, packets, update fields, DB2s, CASC/extractors.
   - Map the MoP systems missing from cata_classic.
   - Deliverable: `docs/mop-port/00-recon.md` with findings, sources, open questions and risks.
1. **Login and realm list.** Update bnetserver and auth for the MoP Classic build (version checks, service changes, realm list). Done when the client reaches the realm list and character screen.
2. **World connection.**
   - Update the opcode table and handshake.
   - Update the char enum, create and delete packets and the enter-world packets.
   - Update the update-field definitions.
   - Done when a character enters the world with a correct player object update.
3. **Client data.**
   - Update the CASC extractors (maps, vmaps, mmaps).
   - Update DB2 definitions and stores, and add new ones (for example Monk class and spec data).
   - Document every DB2 structure change with its source.
4. **Gameplay baseline.**
   - Movement, chat, basic spells and auras, creature visibility, and a basic quest flow.
   - Monk at a basic playable level.
   - Import SkyFire/world DB content only where the license is compatible, using reproducible conversion scripts.
5. **Upstream sync tooling** (TypeScript helper scripts run with **bun**).
   - `/sync-trinitycore`:
     1. Fetch `TrinityCore/TrinityCore` `cata_classic` and list commits since the last synced SHA, which is stored in `docs/mop-port/upstream-sync.md`.
     2. Classify each commit:
        - **safe:** deps, build, crash fixes, core systems, unaffected scripts
        - **needs adaptation:** touches opcodes, packets, update fields, DB2 structures, auth, or MoP-modified code
        - **skip:** Cata-Classic-only content or protocol changes
     3. Cherry-pick the safe commits onto `sync/<date>`, then build and test.
     4. Write a report.
     5. Never force-push, and never merge to main without approval.
   - `/check-deps`: compare Boost, OpenSSL, MySQL, protobuf, the CMake minimum and compilers against upstream `cata_classic` and Context7 docs, then propose upgrades.
6. **Later (plan only):** full class and spec mechanics, talents, pet battles, scenarios, challenge modes, raids and instances.

## Build & test

**Docker (preferred; nothing to install but Docker Desktop).** Run from `contrib/mop-dev/`; details in its `README.md`.

```sh
docker compose --profile build run --rm builder      # cmake + ninja + ctest + install (upstream CI image)
docker compose --profile extract run --rm extractor  # DB2 + GameTables from the local client into the data volume
docker compose up -d db bnetserver worldserver       # MySQL 8.4 + servers on 1119/8081/8085/8086
```

**Native.** Taken from upstream CI (`.github/workflows/*.yml`, `.circleci/config.yml`). Requires CMake ≥ 3.24, Boost (CI uses 1.84), OpenSSL, the MySQL client library and readline/zlib/bzip2. Everything else is vendored in `dep/`. Local toolchain availability hasn't been verified yet.

```sh
# Configure (same flags as CI; BUILD_TESTING is off by default)
cmake -GNinja -S . -B build -DCMAKE_BUILD_TYPE=Debug -DWITH_WARNINGS=1 -DWITH_WARNINGS_AS_ERRORS=1 \
  -DTOOLS=1 -DSCRIPTS=static -DSERVERS=1 -DBUILD_TESTING=1
# Windows: run from a VS x64 dev shell, and set MYSQL_ROOT_DIR, OPENSSL_ROOT_DIR and BOOST_ROOT
cmake --build build
cmake --build build --target test                    # all unit tests (Catch2 via CTest)
ctest --test-dir build -R "<test name regex>"        # a single test
./contrib/check_codestyle.sh                         # CI style gate: no tabs, no trailing whitespace, no triple blank lines in src/
```

- `-DSCRIPTS=` accepts `none|static|dynamic|minimal-static|minimal-dynamic`. Use `minimal-static` for faster protocol-work builds.
- Smoke check after install: `bnetserver --version` and `worldserver --version`.
- Tests live in `tests/` (one `tests` executable linked against `game`). Coverage is thin (config, containers, chat commands), so protocol work has to be verified against a real client.
- SQL: `sql/base/` holds the auth and characters schemas. Incremental updates go in `sql/updates/{auth,characters,hotfixes,world}/cata_classic/` as `YYYY_MM_DD_NN_<db>.sql`, applied by the DB updater (`src/server/database/Updater`). The world and hotfixes base DBs (TDB) are a separate download.

## Architecture

- **Two servers.** `bnetserver` (`src/server/bnetserver`) handles Battle.net login over protobuf RPC: services in `Services/`, protos in `src/server/proto`, and a REST login in `REST/`. It hands the client a realm join ticket. `worldserver` runs the game, with nearly all logic in the `game` library (`src/server/game`). `src/server/shared` holds code both servers use, including `Realm/ClientBuildInfo.*`.
- **Client build gating** is data-driven, not `#ifdef`-based. Accepted builds and their per-platform auth keys come from the `build_info` and `build_auth_key` tables in the auth DB, loaded by `ClientBuild::LoadBuildInfo()` and checked in `WorldSocket.cpp` and the bnet `AuthenticationService`/`GameUtilitiesService`. Adding the MoP build starts here.
- **World protocol:**
  - Opcode enums live in `game/Server/Protocol/Opcodes.h` and handler/status registration in `Opcodes.cpp`.
  - Packet classes are in `game/Server/Packets/*Packets.{h,cpp}`: `Read()` for client→server, `Write()` for server→client.
  - Handlers are `WorldSession::Handle*` in `game/Handlers/`.
  - Socket and handshake: `WorldSocket.cpp`.
- **Update fields:** `game/Entities/Object/Updates/UpdateFields.{h,cpp}`. These are generated-style descriptors that must match the client's field layout exactly. `ViewerDependentValues.h` and `WowCSEntityDefinitions.*` sit alongside them.
- **Client data (DB2):**
  - Generic reader: `src/common/DataStores/DB2FileLoader`.
  - Per-table field metadata: `game/DataStores/DB2LoadInfo.h`, with layout info in `DB2Metadata.h`.
  - Row structs: `DB2Structure.h`. Store registration and indexes: `DB2Stores.{h,cpp}`.
  - Hotfix DB tables mirror each DB2.
  - A DB2 structure change touches all of these plus the hotfixes SQL schema.
- **Extractors** (`src/tools`): `map_extractor`, `vmap4_extractor`, `vmap4_assembler` and `mmaps_generator`. They read CASC via `dep/CascLib`; helper scripts are `contrib/extractor.{sh,bat}`.
- **Scripts:** `src/server/scripts`, built as static or dynamic modules per the `SCRIPTS` option.
