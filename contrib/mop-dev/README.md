# MoP Classic development environment (Docker)

Everything runs in Docker; the only Windows requirement is Docker Desktop. The client runs on Windows and connects to the published ports.

All commands are run from `contrib/mop-dev/`.

| Step | Command |
|---|---|
| Build, run unit tests, install into the `install` volume | `docker compose --profile build run --rm builder` |
| Extract DB2 and GameTables from the local client (`D:\WoW\World of Warcraft`, mounted read-only) into the `data` volume | `docker compose --profile extract run --rm extractor` |
| Start the database and servers | `docker compose up -d db bnetserver worldserver` |
| Follow the logs | `docker compose logs -f worldserver` |
| Stop everything | `docker compose down` |

On its first start, worldserver downloads TDB 442.26081 (world and hotfixes) into the `tdb` volume. DBUpdater then auto-populates all databases.

## Accounts

```
docker compose attach worldserver
bnetaccount create test@test test
```
Detach with `Ctrl-P Ctrl-Q`. Typing `exit` would stop worldserver.

## Client

Start the 5.5.4 client through Arctium, pointed at `127.0.0.1`. bnetserver uses the stock TrinityCore certificate (`src/server/bnetserver/bnetserver.{cert,key}.pem`), which Arctium accepts.

## Notes

- **Dev only.** The servers connect to MySQL as `root`/`root`, and MySQL is published on `127.0.0.1:3306`.
- The source tree is mounted read-only at `/src`. Build output lives in Docker volumes, so nothing is written to the repo.
- `conf/*.conf.override` lists only the settings that differ from upstream `*.conf.dist`. `scripts/make-conf.sh` merges them at container start.
- Volumes: `build`, `ccache`, `install`, `data`, `tdb`, `mysql`. `docker compose down -v` deletes them all, including the databases.
