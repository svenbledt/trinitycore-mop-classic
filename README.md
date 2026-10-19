# TrinityCore MoP Classic

A **work-in-progress server core for World of Warcraft: Mists of Pandaria Classic (5.5.x)**, built as a port of [TrinityCore](https://github.com/TrinityCore/TrinityCore).

> ### 💬 Join the community
> **[discord.gg/uAtSHesZt9](https://discord.gg/uAtSHesZt9)**
>
> This is an open, community-driven project — contributors, testers and the curious are all welcome. Come say hi, grab a task, or just follow along.

--------------

## Built on TrinityCore

This project **uses [TrinityCore](https://github.com/TrinityCore/TrinityCore) as its base.** It is a fork of TrinityCore's `cata_classic` branch (Cataclysm Classic 4.4.x), ported forward to talk to the **Mists of Pandaria Classic** client.

All of the heavy lifting — the server architecture, build system, database layer, networking, DB2 stores, CASC extractors and scripting engine — comes from TrinityCore. Huge thanks to the TrinityCore team and its contributors; none of this would exist without their work. We track upstream `cata_classic` and pull in fixes over time.

* Upstream project: <https://github.com/TrinityCore/TrinityCore>
* Upstream website: <https://www.trinitycore.org>

## What this is

* **Goal:** a solid, maintainable MoP Classic (5.5.x) core that keeps receiving upstream TrinityCore fixes.
* **First milestone:** a client logs in, creates or selects a character, and enters the world.
* **Current focus:** world protocol, client data (DB2) for MoP, and a gameplay baseline (movement, chat, basic spells, the Monk class and the Wandering Isle starting experience).

This is early, actively-developed software. Expect rough edges and breaking changes while the port matures.

## What this is *not*

* It is **not** affiliated with or endorsed by Blizzard Entertainment.
* It ships **no** Blizzard game data. You need your own copy of the MoP Classic client to extract maps and client data from.
* It is **not** a drop-in replacement for upstream TrinityCore — it targets a different client build.

## Getting started

The quickest path is the Docker dev setup in [`contrib/mop-dev/`](contrib/mop-dev/) (nothing to install but Docker Desktop):

```sh
cd contrib/mop-dev
docker compose --profile build run --rm builder       # configure + build + install
docker compose --profile extract run --rm extractor   # extract client data into the data volume
docker compose up -d db bnetserver worldserver        # MySQL + servers
```

Native build requirements (CMake ≥ 3.24, Boost, OpenSSL, MySQL client, zlib/bzip2/readline) follow upstream TrinityCore; see the [TrinityCore wiki](https://trinitycore.info/en/home) for platform details, and `contrib/mop-dev/README.md` for this project's specifics.

## Contributing

Pull requests, bug reports and testing are all welcome — this is a community project and that's the whole point. The best place to coordinate, ask questions and claim work is the Discord:

**👉 [discord.gg/uAtSHesZt9](https://discord.gg/uAtSHesZt9)**

When contributing code, please follow TrinityCore's existing conventions so changes stay mergeable with upstream.

## Copyright / License

License: **GPL 2.0** — see [COPYING](COPYING).

This project inherits TrinityCore's license and copyright. See [AUTHORS](AUTHORS) for TrinityCore's authors and contributors.

## Links

* **Community Discord:** <https://discord.gg/uAtSHesZt9>
* Upstream (TrinityCore): <https://github.com/TrinityCore/TrinityCore>
* TrinityCore website: <https://www.trinitycore.org>
* TrinityCore wiki: <https://www.trinitycore.info>
