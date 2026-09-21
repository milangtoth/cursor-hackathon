#!/bin/sh
set -eu

copy_if_empty() {
  src="$1"
  dest="$2"
  mkdir -p "$dest"
  if [ -z "$(ls -A "$dest" 2>/dev/null || true)" ] && [ -d "$src" ]; then
    cp -a "$src"/. "$dest"/
  fi
}

copy_if_empty /opt/seed/data /app/data
copy_if_empty /opt/seed/content /app/public/content
mkdir -p /app/uploads/submissions

exec node server.js
