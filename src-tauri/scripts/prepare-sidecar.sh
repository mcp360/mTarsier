#!/usr/bin/env bash
# Builds the tsr binary and copies it to binaries/tsr-{triple}[.exe].
#
# When called by Tauri's beforeBundleCommand, TAURI_ENV_TARGET_TRIPLE is set
# automatically for cross-compilation targets. Falls back to host triple otherwise.
#
# Usage:
#   bash scripts/prepare-sidecar.sh          # debug (default)
#   bash scripts/prepare-sidecar.sh release  # release

set -e

HOST_TRIPLE=$(rustc -vV | sed -n 's/host: //p')
TRIPLE="${TAURI_ENV_TARGET_TRIPLE:-$HOST_TRIPLE}"
PROFILE="${1:-debug}"

# Windows binaries have .exe extension
if [[ "$TRIPLE" == *"windows"* ]]; then
  EXT=".exe"
else
  EXT=""
fi

mkdir -p binaries

# Touch placeholder so Tauri's build.rs validation passes before compilation
touch "binaries/tsr-$TRIPLE$EXT"

echo "Building tsr ($PROFILE) for $TRIPLE..."

# Use --target flag when cross-compiling
if [ "$TRIPLE" != "$HOST_TRIPLE" ]; then
  TARGET_FLAG="--target $TRIPLE"
else
  TARGET_FLAG=""
fi

if [ "$PROFILE" = "release" ]; then
  cargo build --release --bin tsr $TARGET_FLAG
  SRC="target/${TRIPLE}/release/tsr${EXT}"
  [ -f "$SRC" ] || SRC="target/release/tsr${EXT}"
else
  cargo build --bin tsr $TARGET_FLAG
  SRC="target/${TRIPLE}/debug/tsr${EXT}"
  [ -f "$SRC" ] || SRC="target/debug/tsr${EXT}"
fi

cp "$SRC" "binaries/tsr-$TRIPLE$EXT"
chmod +x "binaries/tsr-$TRIPLE$EXT" 2>/dev/null || true
echo "✓  binaries/tsr-$TRIPLE$EXT ready"
