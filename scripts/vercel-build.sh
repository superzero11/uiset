#!/usr/bin/env bash
# The site's build, on Vercel and on any other machine. The prerender opens every page in
# Chromium. Vercel's build machines (Amazon Linux) have no browser and lack libraries it loads,
# so there it installs both first and uses Playwright's Chromium; elsewhere it builds with the
# installed Chrome, as before.
set -euo pipefail
if [ -n "${VERCEL:-}" ] && [ "$(uname)" = "Linux" ] && command -v dnf >/dev/null; then
  dnf install -y --setopt=strict=0 nss nspr atk at-spi2-atk cups-libs libdrm libxkbcommon \
    libXcomposite libXdamage libXfixes libXrandr mesa-libgbm pango alsa-lib libxshmfence >/dev/null
  pnpm exec playwright install chromium
  # The prerender takes Playwright's own Chromium under CI.
  export CI=1
fi
pnpm build:static
