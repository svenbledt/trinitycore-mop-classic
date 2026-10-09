# Phase 1 — Login, realm list and character screen (design)

Status: approved in conversation 2026-10-08. Awaiting review of this written spec.
Context: `docs/mop-port/00-recon.md`. Decisions: MoP-only; RE the 70032 dump in the user's IDA GUI session; Arctium launcher; Docker dev environment.

## 1. Goal and scope

**Done when** a MoP Classic 5.5.4.70032 client, started through Arctium, logs in, shows the realm list, and enters an **empty character screen** served by this core.

**In scope**
1. Docker dev environment: build, DB, bnetserver, worldserver.
2. Generator tooling for opcodes (from the dump plus WowPacketParser names) and DB2 metadata (from WoWDBDefs).
3. Full 70032 opcode table.
4. DB2 metadata, load info, structures and hotfix schema for 70032, enough that worldserver starts.
5. Auth: 70032 `build_info` and `build_auth_key`, and Battle.net service checks.
6. World handshake and the glue-screen packets up to `SMSG_ENUM_CHARACTERS_RESULT` with zero characters.

**Out of scope (Phase 2 or later):** character create and delete, entering the world, update fields, extracting maps/vmaps/mmaps, a native Windows build, and MoP gameplay.

## 2. Dev environment (Docker)

Files go in `contrib/mop-dev/`, a new directory, so there's no upstream conflict.

| Service | Image | Notes |
|---|---|---|
| `db` | `mysql:8.4` | Named volume. Healthcheck: `mysqladmin ping`. Init creates the auth, characters, world and hotfixes DBs via upstream `sql/create/create_mysql.sql`. |
| `builder` | `trinitycore/circle-ci:debian-13-builder` | Profile `build`. Source bind-mounted read-only. Build dir and ccache in named volumes. Runs CMake (Ninja) with upstream CI flags plus `-DBUILD_TESTING=1`, then the build, then `ctest`. Installs into a named `install` volume. |
| `bnetserver` | `trinitycore/circle-ci:debian-13-runner` | Binaries from the `install` volume. `depends_on: db: service_healthy`. Ports 1119 and 8081. |
| `worldserver` | same runner image | `depends_on: db: service_healthy`. Ports 8085 and 8086. `/data` volume holds the extracted DB2s. |
| `extractor` | runner image | Profile `extract`. `D:\WoW\World of Warcraft` mounted **read-only**. Runs `mapextractor -e 10` (`EXTRACT_DBC | EXTRACT_GT`, `System.cpp:91-94`) into the `/data` volume. |

- **Configuration:** generated from `*.conf.dist` plus `contrib/mop-dev/conf/*.override`. Database host is `db`. `LoginREST.ExternalAddress` and the realmlist address are `127.0.0.1`. Certificates are TrinityCore's stock ones, which Arctium accepts.
- **Usage, documented in `contrib/mop-dev/README.md`:** `docker compose --profile build run --rm builder`, then `docker compose --profile extract run --rm extractor`, then `docker compose up db bnetserver worldserver`.
- The patterns used (healthcheck plus `depends_on: service_healthy`, profiles, named volumes) were checked against the Docker Compose docs via Context7.

## 3. Opcode pipeline

All tooling lives in `tools/mop-re/` (new). The TypeScript scripts run with bun.

| File | Role |
|---|---|
| `ida/export_opcodes.py` | IDAPython script, run in the user's IDA GUI session via MCP. Finds the client's opcode dispatch and registration tables. Writes `out/<build>/opcodes.json` (`{direction, value, handler_or_ctor_rva, hints}`). |
| `src/wpp.ts` | Parses the newest WowPacketParser 5.5.x `Opcodes.cs` at a pinned commit, giving names and their `(group, index)` per direction. |
| `match.ts` | Assigns names to 70032 values using group and index order alignment, handling insertions, plus handler/ctor signature hints. Writes `out/<build>/match-report.md` (matched, ambiguous, new, removed). |
| `gen_opcodes.ts` | Rewrites values in `src/server/game/Server/Protocol/Opcodes.h` in place, keeping TC formatting. Adds new names as `STATUS_UNHANDLED` in `Opcodes.cpp`. Names absent in 70032 stay in the enums so upstream code compiles, but get values in the never-valid sentinel groups `0xFF` (client) and `0xFE` (server), and their registrations are removed. It also regenerates `NUM_*_OPCODES` and the `GetOpcodeArrayIndex` switch. Adds a header comment with the build and WPP SHA. |

- **Unknown:** how 70032 stores its opcode tables. The first task is to find them, and the findings go in `docs/mop-port/re-notes.md`, with addresses and the reasoning that identified them.
- **Ambiguous matches** get `// TODO(verify):` on the enum line. The login-path opcodes (about 20) are checked by hand in IDA.
- Code that references opcodes absent in 70032 (for example void storage) compiles unchanged through the sentinel values. Those packets are never valid on the wire.
- `out/` is gitignored. Only the scripts and the generated source are committed.

## 4. DB2 for 70032

| File | Role |
|---|---|
| `tools/mop-re/dbd_gen.ts` | Reads WoWDBDefs at a pinned commit for build 5.5.4.70032. Fully generates `DB2Metadata.h` and `DB2LoadInfo.h`, the hotfixes `CREATE TABLE` SQL and the `HotfixDatabase.cpp` prepared statements. Writes `out/70032/db2-struct-diff.md` per table: fields added, removed and retyped compared with `DB2Structure.h`. |
| `tools/mop-re/check_layout_hashes.ts` | Cross-checks the generated layout hashes against the dump bytes, as in Phase 0. |

- `DB2Structure.h` is **updated by hand** from the diff report, keeping TC field names. Call sites in game code get the smallest fix that compiles; MoP semantics come later.
- Scope: the 265 stores loaded in `DB2Stores.cpp`, of which 111 changed. None of the 15 tables absent from 70032 are loaded today.
- Hotfix schema changes go in `sql/updates/hotfixes/mop_classic/` and the hotfixes base SQL, in place. There's no live data yet.
- Check whether the `GameTables` files (`gt*.txt`) changed format, and handle them if they did.

## 5. Auth and Battle.net

- **SQL:** new directories `sql/updates/{auth,characters,hotfixes,world}/mop_classic/`, registered in `updates_include` by an auth update. Upstream `cata_classic/` stays untouched.
- **`build_info`:** `(70032, 5, 5, 4, NULL)`.
- **`build_auth_key`:** keys for the platform/arch/type rows the client uses (at least `Win`/`x64`/`WoW`), recovered from the dump in IDA. The method is written up in `re-notes.md`.
- **Battle.net:** compare the protobuf service hashes and methods the client uses in 70032 with `src/server/proto`. Change them only where they differ, and cite the IDA address for each change.

## 6. World handshake and glue screen

- Sequence: `SMSG_AUTH_CHALLENGE`, then `CMSG_AUTH_SESSION`, then `SMSG_AUTH_RESPONSE`, then the glue-screen packets, then `CMSG_ENUM_CHARACTERS`, then `SMSG_ENUM_CHARACTERS_RESULT` (empty).
- The exact set of glue-screen packets the client expects comes from the WowPacketParser 5.5.3 parsers and gets checked in IDA.
- Each changed `Read()`/`Write()` cites its source in a comment: the WPP file and method, or the IDA address. Unverified fields are marked `// TODO(verify):`.

## 7. Testing

- `bun test` in `tools/mop-re/`: generators against small fixed fixtures.
- Catch2 (`tests/game/Opcodes.cpp`, new):
  - No duplicate opcode values per direction.
  - Every opcode with a handler is registered.
  - Opcodes absent in 70032 (sentinel groups `0xFF`/`0xFE`) are never valid.
  - The login-path opcodes are valid.
- The builder container runs the full build and `ctest`.
- **Manual end-to-end (acceptance):** Arctium client logs in, sees the realm list, then the empty character screen. bnetserver and worldserver logs are kept as evidence in the Phase 1 summary.

## 8. Commit sequence

Each commit builds and passes the tests:
1. Docker dev env and README. Upstream build passes in the container (baseline).
2. `tools/mop-re` skeleton and bun tests.
3. RE notes plus the opcode export, match and generation; opcode table switched to 70032.
4. DB2 generator; metadata, load info and structures switched to 70032; hotfix schema.
5. Auth SQL (`build_info`, `build_auth_key`, `updates_include`).
6. Login and glue-screen packet changes. End-to-end check.

## 9. Risks for this phase

| Risk | Mitigation |
|---|---|
| Opcode tables are hard to locate or name in 70032 | Fall back to hand-verifying the login path first; the ambiguous rest stay `TODO(verify)` |
| Hand-updating `DB2Structure.h` for 111 tables is large | The diff report keeps it mechanical; commit in batches, each one building |
| `build_auth_key` can't be found | Investigate first, before the rest of section 5 |
| Docker Desktop not running or slow bind mounts | Build dir in a named volume; source mount read-only |
