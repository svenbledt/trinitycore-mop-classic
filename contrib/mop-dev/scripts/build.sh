#!/usr/bin/env bash
# Configure, build, test and install TrinityCore inside the builder container.
set -euo pipefail
cmake -S /src -B /build -GNinja \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_INSTALL_PREFIX=/opt/tc \
  -DWITH_WARNINGS=1 -DWITH_WARNINGS_AS_ERRORS=1 -DWITH_COREDEBUG=0 \
  -DUSE_COREPCH=1 -DUSE_SCRIPTPCH=1 -DTOOLS=1 -DSCRIPTS=minimal-static -DSERVERS=1 \
  -DNOJEM=0 -DBUILD_TESTING=1 \
  -DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache
cmake --build /build
ctest --test-dir /build --output-on-failure
cmake --install /build
cp /src/src/server/bnetserver/bnetserver.cert.pem /src/src/server/bnetserver/bnetserver.key.pem /opt/tc/bin/
