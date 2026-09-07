#!/usr/bin/env sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
legacy_root="$project_root/src/routes"

for route_group in api web web_api; do
    target="$legacy_root/$route_group"
    if [ -d "$target" ]; then
        rm -rf -- "$target"
        echo "Removed $target"
    fi
done

rmdir "$legacy_root" 2>/dev/null || true
echo "Legacy route cleanup complete."
