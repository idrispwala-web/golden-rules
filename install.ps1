# Runs the golden-rules setup wizard (v2) straight from GitHub. Needs Node 18+.
# Usage: irm https://raw.githubusercontent.com/idrispwala-web/golden-rules/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host 'golden-rules needs Node.js 18 or newer: https://nodejs.org'
    return  # not exit: under `iex` that would close the user's window
}

# npm 12 refuses git sources unless allowed. `all`, not `root`: npm 11 blocks even the
# named package under `root`. Safe here because golden-rules has no dependencies.
npx -y --allow-git=all github:idrispwala-web/golden-rules @args
