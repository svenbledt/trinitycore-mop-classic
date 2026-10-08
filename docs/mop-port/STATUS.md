# MoP Classic port — status

Last updated: 2026-10-08

| | |
|---|---|
| Base | TrinityCore `cata_classic` @ `0614c9fd941` (4.4.2.60895) |
| Target | MoP Classic 5.5.4.70032 (dump at `d:\WoW\World of Warcraft\_classic_\WowClassic_dump.exe`) |
| Current phase | **0 — Recon: done** (`00-recon.md`) |
| Next | Phase 1 — login and realm list (needs spec → plan, superpowers workflow) |

## Done
- Imported upstream `cata_classic` with full history as local `main`. The `upstream` remote has push disabled; there's no `origin` yet, and the repo will be private.
- Phase 0 recon: `docs/mop-port/00-recon.md`.

## Decisions (2026-10-08)
1. **MoP-only.** Cata Classic client support is dropped. Protocol files are changed in place.
2. **Client RE:** recover whatever the server needs (including `build_auth_key`) from the 70032 dump, using IDA Pro via MCP, Ghidra, or anything that fits.
3. **Hosting:** a private repo on the user's GitHub, later moving to an org. Ask before creating it or pushing.

## Not started
- Local build verification. The toolchain on this machine hasn't been checked.
