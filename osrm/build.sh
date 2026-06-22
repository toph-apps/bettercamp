#!/usr/bin/env bash
# Build the OSRM contraction graph for Quebec.
# One-time: ~5 min download + ~10 min extract+contract on a modern laptop.

set -euo pipefail

cd "$(dirname "$0")"
mkdir -p extract
cd extract

PBF="quebec-latest.osm.pbf"
URL="https://download.geofabrik.de/north-america/canada/quebec-latest.osm.pbf"

if [ ! -f "$PBF" ]; then
  echo "→ downloading $URL"
  curl -fL -o "$PBF" "$URL"
fi

IMG="ghcr.io/project-osrm/osrm-backend:v5.27.1"

run() {
  echo "→ $*"
  docker run --rm -v "$PWD:/data" "$IMG" "$@"
}

run osrm-extract -p /opt/car.lua "/data/$PBF"
run osrm-partition "/data/${PBF%.osm.pbf}.osrm"
run osrm-customize "/data/${PBF%.osm.pbf}.osrm"

echo "✓ OSRM graph built in $PWD"
echo "  start with: docker compose up -d osrm"
