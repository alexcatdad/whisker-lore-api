#!/bin/bash
cd "$(dirname "$0")"
[ -f ../.env.local ] && set -a && source ../.env.local && set +a
[ -d node_modules ] || bun install --silent
[ -d ../node_modules/convex ] || (cd .. && bun install --silent)
exec bun src/api-server.ts
