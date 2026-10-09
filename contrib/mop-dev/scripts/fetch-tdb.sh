#!/bin/sh
# Downloads and unpacks the TDB full world/hotfixes SQL named in revision_data.h.in.cmake into /tdb.
# Runs in the alpine-based "tdb" service (needs apk for p7zip).
set -eu
want=$(sed -n 's/.*DATABASE_FULL_DATABASE *"\([^"]*\)".*/\1/p' /src/revision_data.h.in.cmake)
tag=$(echo "$want" | sed -n 's/TDB_full_world_\([0-9]*\)\.\([0-9]*\)_.*/TDB\1.\2/p')
if [ -f "/tdb/$want" ]; then echo "TDB present: $want"; exit 0; fi
apk add --no-cache p7zip wget >/dev/null
url=$(wget -qO- "https://api.github.com/repos/TrinityCore/TrinityCore/releases/tags/$tag" | sed -n 's/.*"browser_download_url": *"\([^"]*\.7z\)".*/\1/p' | head -n1)
echo "Downloading $url"
wget -qO /tdb/tdb.7z "$url"
cd /tdb && 7z x -y tdb.7z >/dev/null && rm tdb.7z
ls -la /tdb
