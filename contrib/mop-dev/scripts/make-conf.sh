#!/usr/bin/env bash
# usage: make-conf.sh <bnetserver|worldserver>
# Builds /opt/tc/etc/<name>.conf from the installed .conf.dist plus conf/<name>.conf.override.
set -euo pipefail
name="$1"
dist="/opt/tc/etc/${name}.conf.dist"
out="/opt/tc/etc/${name}.conf"
# The source tree may be checked out with CRLF line endings on Windows.
sed 's/\r$//' "$dist" > "$out"
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ -z "$line" || "$line" == \#* ]] && continue
  key="${line%%=*}"; key="$(echo "$key" | xargs)"
  if grep -qE "^${key}[[:space:]]*=" "$out"; then
    sed -i -E "s|^${key}[[:space:]]*=.*|${line//|/\\|}|" "$out"
  else
    echo "$line" >> "$out"
  fi
done < "/src/contrib/mop-dev/conf/${name}.conf.override"
