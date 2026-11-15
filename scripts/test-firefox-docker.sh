#!/usr/bin/env bash
# Runs the Firefox projects of the e2e suite inside Playwright's Linux image, for machines
# where Playwright's own Firefox won't start (on macOS 27 it fails with "Could not find
# profile folder"). CI runs Firefox natively on Linux and doesn't need this.
#
#   scripts/test-firefox-docker.sh                      # every Firefox test
#   scripts/test-firefox-docker.sh tests/e2e/board.spec.ts --workers=1
#
# node_modules and the pnpm store live in Docker volumes, since the Mac's are built for macOS.
set -euo pipefail
cd "$(dirname "$0")/.."
version="$(node -p 'require("./package.json").devDependencies["@playwright/test"]')"
pnpm_version="$(node -p 'require("./package.json").packageManager.split("@")[1]')"
args="${*:-}"
docker run --rm --ipc=host \
  -v "$PWD":/work -v uiset-nm:/work/node_modules -v uiset-pnpm-store:/root/.local/share/pnpm \
  -w /work "mcr.microsoft.com/playwright:v${version}-noble" \
  bash -lc "npm i -g pnpm@${pnpm_version} >/dev/null 2>&1 && CI=1 pnpm install --frozen-lockfile --store-dir /root/.local/share/pnpm/store >/dev/null && pnpm exec playwright test --project=firefox --project=web-firefox --timeout=90000 --output=test-results/firefox ${args}"
