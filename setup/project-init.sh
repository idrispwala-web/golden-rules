#!/usr/bin/env bash
# project-init.sh - add the base files, and optionally a pack, to the repo you
# are standing in.
#
#   cd ~/projects/my-repo
#   ~/golden-rules/setup/project-init.sh            # base only
#   ~/golden-rules/setup/project-init.sh data n8n   # base + packs
#   ~/golden-rules/setup/project-init.sh data --dry-run
#
# Packs: data | n8n | frontend | agents
# Never overwrites a file that already exists. Safe to re-run.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=0
PACKS=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    data|n8n|frontend|agents) PACKS+=("$arg") ;;
    *) echo "[warn] unknown pack: $arg (valid: data n8n frontend agents)" >&2; exit 2 ;;
  esac
done

ok()   { printf '[ok]   %s\n' "$*"; }
add()  { printf '[add]  %s\n' "$*"; }
skip() { printf '[skip] %s\n' "$*"; }
warn() { printf '[warn] %s\n' "$*" >&2; }
run()  { if [ "$DRY_RUN" = 1 ]; then printf '[dry]  %s\n' "$*"; else eval "$@"; fi; }

[ -d .git ] || { warn "not a git repository: $PWD"; exit 1; }
echo "== project-init in $PWD (packs: ${PACKS[*]:-none}$([ "$DRY_RUN" = 1 ] && echo ', dry run')) =="

# copy_missing <source> <destination>
copy_missing() {
  if [ -e "$2" ]; then
    skip "$2 exists"
  else
    add "$2"
    run "mkdir -p '$(dirname "$2")'"
    run "cp '$1' '$2'"
  fi
}

# ------------------------------------------------------------------ base files
copy_missing "$REPO/packs/base/.gitattributes"        .gitattributes
copy_missing "$REPO/packs/base/CLAUDE.md"             CLAUDE.md
copy_missing "$REPO/packs/base/docs/docker-parity.md" docs/docker-parity.md

# graft/ and graphify-out/ are build output and never get committed.
for pattern in 'graft/' 'graphify-out/'; do
  if [ -f .gitignore ] && grep -qxF "$pattern" .gitignore; then
    skip ".gitignore already has $pattern"
  else
    add ".gitignore += $pattern"
    run "printf '%s\n' '$pattern' >> .gitignore"
  fi
done

# ----------------------------------------------------------------------- packs
for pack in "${PACKS[@]:-}"; do
  [ -z "$pack" ] && continue
  src="$REPO/packs/$pack"

  # The pack's CLAUDE section is appended to the project CLAUDE.md, once.
  if [ -f "$src/CLAUDE.section.md" ]; then
    marker="<!-- golden-rules:$pack -->"
    if grep -qF "$marker" CLAUDE.md 2>/dev/null; then
      skip "CLAUDE.md already has the $pack section"
    else
      add "CLAUDE.md += $pack section"
      run "{ printf '\n%s\n' '$marker'; cat '$src/CLAUDE.section.md'; } >> CLAUDE.md"
    fi
  fi

  # MCP fragment -> .mcp.json (merged; existing servers are kept).
  if [ -f "$src/mcp.json" ]; then
    if [ -f .mcp.json ]; then
      if jq -e --slurpfile f "$src/mcp.json" \
           '($f[0].mcpServers | keys) - (.mcpServers // {} | keys) | length == 0' \
           .mcp.json >/dev/null 2>&1; then
        skip ".mcp.json already has the $pack server"
      else
        add ".mcp.json += $pack server"
        run "jq -s '.[0] * .[1]' .mcp.json '$src/mcp.json' > .mcp.json.tmp && mv .mcp.json.tmp .mcp.json"
      fi
    else
      add ".mcp.json ($pack)"
      run "cp '$src/mcp.json' .mcp.json"
    fi
    warn "$pack MCP reads secrets from the environment - export them in your shell, never commit them"
  fi

  # The agents pack also brings an evals skeleton.
  if [ "$pack" = "agents" ]; then
    copy_missing "$src/evals/README.md"      evals/README.md
    copy_missing "$src/evals/test_evals.py"  evals/test_evals.py
    run "mkdir -p evals/cases"
  fi
done

echo
ok "done. Fill in the <placeholders> in CLAUDE.md before asking an agent to work here."
