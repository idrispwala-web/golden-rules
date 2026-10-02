#!/bin/sh
# Runs the golden-rules setup wizard (v2) straight from GitHub. Needs Node 18+.
# Usage: curl -fsSL https://raw.githubusercontent.com/idrispwala-web/golden-rules/main/install.sh | sh
set -eu

command -v npx >/dev/null 2>&1 || { echo "golden-rules needs Node.js 18 or newer: https://nodejs.org" >&2; exit 1; }

# npm 12 refuses git sources unless allowed. `all`, not `root`: npm 11 blocks even the
# named package under `root`. Safe here because golden-rules has no dependencies.
set -- -y --allow-git=all github:idrispwala-web/golden-rules "$@"

# Under `curl | sh` stdin is this script, so the wizard would see no terminal and
# silently take every default. Read the answers from the terminal when there is one.
if [ ! -t 0 ] && (exec </dev/tty) 2>/dev/null; then
  exec npx "$@" </dev/tty
fi
exec npx "$@"
