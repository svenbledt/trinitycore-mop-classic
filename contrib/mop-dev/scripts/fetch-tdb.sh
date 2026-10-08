#!/usr/bin/env bash
# Puts the TDB full world/hotfixes SQL next to worldserver so DBUpdater finds them (LOCATION_DOWNLOAD).
set -euo pipefail
want_world=$(grep -oP 'DATABASE_FULL_DATABASE\s+"\K[^"]+' /src/revision_data.h.in.cmake)
if [[ ! -f "/tdb/${want_world}" ]]; then
  command -v 7z >/dev/null || (apt-get update -qq && apt-get install -y -qq p7zip-full >/dev/null)
  url=$(curl -fsSL https://api.github.com/repos/TrinityCore/TrinityCore/releases/tags/TDB442.26081 \
        | grep -oP '"browser_download_url":\s*"\K[^"]+\.7z')
  curl -fsSL "$url" -o /tdb/tdb.7z
  (cd /tdb && 7z x -y tdb.7z >/dev/null && rm tdb.7z)
fi
ln -sf /tdb/*.sql /opt/tc/bin/
