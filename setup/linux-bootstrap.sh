#!/usr/bin/env bash
# linux-bootstrap.sh - install the global Claude Code baseline on a Linux box.
#
#   ./setup/linux-bootstrap.sh --role desktop
#   ./setup/linux-bootstrap.sh --role vm --dry-run
#
# Safe to re-run: anything already present is skipped.
# --role vm skips the browser stack and gates QMD on available memory.
set -euo pipefail

ROLE=""
DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --role)    ROLE="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "[warn] unknown flag: $1" >&2; exit 2 ;;
  esac
done
case "$ROLE" in
  desktop|vm) ;;
  *) echo "usage: $0 --role desktop|vm [--dry-run]" >&2; exit 2 ;;
esac

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

ok()   { printf '[ok]   %s\n' "$*"; }
add()  { printf '[add]  %s\n' "$*"; }
skip() { printf '[skip] %s\n' "$*"; }
warn() { printf '[warn] %s\n' "$*" >&2; }
run()  { if [ "$DRY_RUN" = 1 ]; then printf '[dry]  %s\n' "$*"; else eval "$@"; fi; }

# WSL puts the whole Windows PATH after the Linux one, so `command -v graft`
# happily returns C:\...\AppData\Roaming\npm\graft. A Windows binary is not an
# install on this machine - treat anything under /mnt/ as absent.
have() {
  local p
  p=$(command -v "$1" 2>/dev/null) || return 1
  case "$p" in /mnt/*) return 1 ;; esac
  return 0
}

echo "== golden-rules bootstrap (role: $ROLE$([ "$DRY_RUN" = 1 ] && echo ', dry run')) =="

# ------------------------------------------------------------- prerequisites
for t in claude jq git; do
  have "$t" || { warn "missing prerequisite: $t"; exit 1; }
done
if ! have node; then
  # nvm is a shell function, not a binary, so load it before giving up.
  # shellcheck disable=SC1091
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi
have node || warn "node not found - npm-based items will be skipped"
have uv   || warn "uv not found - graphify will be skipped"

mkdir -p "$CLAUDE_DIR/hooks"

# ------------------------------------------------------------------- 1. rules
if [ -f "$CLAUDE_DIR/CLAUDE.md" ] && cmp -s "$REPO/config/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"; then
  skip "~/.claude/CLAUDE.md already current"
else
  add "~/.claude/CLAUDE.md"
  run "cp '$REPO/config/CLAUDE.md' '$CLAUDE_DIR/CLAUDE.md'"
fi

# ------------------------------------------------------ 3. status line + hooks
for f in statusline.sh; do
  if [ -f "$CLAUDE_DIR/$f" ] && cmp -s "$REPO/config/$f" "$CLAUDE_DIR/$f"; then
    skip "~/.claude/$f already current"
  else
    add "~/.claude/$f"
    run "install -m 0755 '$REPO/config/$f' '$CLAUDE_DIR/$f'"
  fi
done
for f in brain-pull.sh brain-push.sh; do
  if [ -f "$CLAUDE_DIR/hooks/$f" ] && cmp -s "$REPO/config/hooks/$f" "$CLAUDE_DIR/hooks/$f"; then
    skip "~/.claude/hooks/$f already current"
  else
    add "~/.claude/hooks/$f"
    run "install -m 0755 '$REPO/config/hooks/$f' '$CLAUDE_DIR/hooks/$f'"
  fi
done

# ------------------------------------------------------- 4. golden-rules skill
if [ -d "$CLAUDE_DIR/skills/golden-rules" ] && cmp -s "$REPO/skills/golden-rules/SKILL.md" "$CLAUDE_DIR/skills/golden-rules/SKILL.md"; then
  skip "golden-rules skill already current"
else
  add "golden-rules skill -> ~/.claude/skills/golden-rules/"
  run "mkdir -p '$CLAUDE_DIR/skills/golden-rules'"
  run "cp '$REPO/skills/golden-rules/SKILL.md' '$CLAUDE_DIR/skills/golden-rules/SKILL.md'"
fi

# ------------------------------------------------------------------ 5. context7
# Only if the claude.ai account is not already providing a Context7 connector:
# two copies of the same server means two copies of its tools in every prompt.
if claude mcp list 2>/dev/null | grep -qi 'context7'; then
  skip "context7 already available (claude.ai connector or user scope)"
else
  add "context7 MCP (user scope)"
  run "claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp"
fi

# ------------------------------------------------------------------ 6. ponytail
if claude plugin list --json 2>/dev/null | jq -e '.[] | select(.id | startswith("ponytail"))' >/dev/null 2>&1; then
  skip "ponytail plugin already installed"
else
  add "ponytail plugin"
  run "claude plugin marketplace add DietrichGebert/ponytail"
  run "claude plugin install ponytail@ponytail"
fi
# Level "full" everywhere. Ponytail reads ~/.config/ponytail/config.json.
PONY_CFG="$HOME/.config/ponytail/config.json"
if [ -f "$PONY_CFG" ] && [ "$(jq -r '.defaultMode // empty' "$PONY_CFG" 2>/dev/null)" = "full" ]; then
  skip "ponytail defaultMode already full"
else
  add "ponytail defaultMode = full"
  run "mkdir -p '$(dirname "$PONY_CFG")'"
  run "if [ -f '$PONY_CFG' ]; then jq '.defaultMode = \"full\"' '$PONY_CFG' > '$PONY_CFG.tmp' && mv '$PONY_CFG.tmp' '$PONY_CFG'; else echo '{\"defaultMode\":\"full\"}' > '$PONY_CFG'; fi"
fi

# ------------------------------------------------------------------- 7. caveman
# Skill-only install (npx skills add), never the plugin: the plugin's hooks would
# make caveman active in the main conversation, which we never want. Subagents
# can still invoke the skill explicitly.
# `-s caveman` asks for the one skill we use; without it the installer offers
# all ~20 (caveman-commit, cavecrew, lean-build, surgical-patch, ...), several
# of which duplicate skills installed above.
#
# `-y -a claude-code` are REQUIRED, not cosmetic: without them the installer
# opens an interactive picker, and over SSH (no TTY) it prints "Installation
# cancelled", exits 0, and installs nothing. The agent id is `claude-code`;
# `claude` is rejected as invalid.
#
# The prune below stays as a safety net for machines that already have the
# full pack from an earlier install.
CAVEMAN_EXTRAS="cavecrew caveman-commit caveman-compress caveman-discover \
caveman-evidence-review caveman-explore caveman-help caveman-learn \
caveman-manage caveman-optimize caveman-review caveman-setup caveman-stats \
investigate-first lean-build migration safe-refactor surgical-patch \
verify-and-stop"
if [ -d "$CLAUDE_DIR/skills/caveman" ]; then
  skip "caveman skill already installed"
elif have node; then
  add "caveman skill (skill only, no plugin hooks)"
  run "npx -y skills add JuliusBrussee/caveman -g -y -a claude-code -s caveman"
else
  skip "caveman (needs node)"
fi
pruned=0
for extra in $CAVEMAN_EXTRAS; do
  if [ -d "$CLAUDE_DIR/skills/$extra" ]; then
    pruned=$((pruned + 1))
    run "rm -rf '$CLAUDE_DIR/skills/$extra'"
  fi
done
if [ "$pruned" -gt 0 ]; then
  add "pruned $pruned extra caveman-pack skills (keeping only 'caveman')"
else
  skip "caveman pack already trimmed"
fi

# --------------------------------------------------------- 8. agent-skills (9)
AGENT_SKILLS="interview-me doubt-driven-development incremental-implementation \
documentation-and-adrs ci-cd-and-automation shipping-and-launch \
observability-and-instrumentation debugging-and-error-recovery \
source-driven-development"
if have node; then
  for s in $AGENT_SKILLS; do
    if [ -d "$CLAUDE_DIR/skills/$s" ]; then
      skip "skill $s"
    else
      add "skill $s"
      run "npx -y skills add addyosmani/agent-skills -g -y -a claude-code -s '$s'"
    fi
  done
else
  skip "agent-skills (needs node)"
fi

# ------------------------------------------------------------ 9. agency-agents
AGENTS="engineering/engineering-ai-engineer.md \
engineering/engineering-backend-architect.md \
engineering/engineering-devops-automator.md \
testing/testing-api-tester.md \
testing/testing-reality-checker.md"
mkdir -p "$CLAUDE_DIR/agents"
for a in $AGENTS; do
  name=$(basename "$a")
  if [ -f "$CLAUDE_DIR/agents/$name" ]; then
    skip "agent $name"
  else
    add "agent $name"
    run "curl -fsSL 'https://raw.githubusercontent.com/msitarzewski/agency-agents/main/$a' -o '$CLAUDE_DIR/agents/$name'"
  fi
done

# --------------------------------------------------------------- 10. CLI tools
npm_global() {   # npm_global <package> <binary>
  if have "$2"; then
    skip "$2 already installed"
  elif have node; then
    add "npm i -g $1"
    run "npm install -g '$1'"
  else
    skip "$1 (needs node)"
  fi
}
npm_global "@nanonets/graft" graft

if have graphify; then
  skip "graphify CLI already installed"
elif have uv; then
  add "graphify CLI (uv tool install graphifyy)"
  run "uv tool install graphifyy"
else
  skip "graphify (needs uv)"
fi
# The skill is installed by `graphify install`, separately from the CLI. Check
# it on its own: a wipe removes ~/.claude/skills/graphify while leaving the CLI
# in place, and a CLI-only check would then silently never restore the skill.
if [ -d "$CLAUDE_DIR/skills/graphify" ]; then
  skip "graphify skill already installed"
elif have graphify; then
  add "graphify skill (graphify install)"
  run "graphify install || true"
fi

# QMD indexes locally and is memory-hungry; on the VM only install it if there
# is room to spare.
MEM_GB=$(awk '/MemTotal/ {printf "%d", $2/1024/1024}' /proc/meminfo)
if [ "$ROLE" = "vm" ] && [ "$MEM_GB" -lt 8 ]; then
  skip "QMD (VM has ${MEM_GB}GB RAM, needs 8GB+)"
else
  npm_global "@tobilu/qmd" qmd
fi

# ------------------------------------------------------- 11. browser (desktop)
if [ "$ROLE" = "vm" ]; then
  skip "Playwright CLI (not installed on the VM by default)"
else
  npm_global "@playwright/cli" playwright-cli
  # The CLI ships its own skill inside the package, but installing the package
  # does NOT register it. Without this copy the binary is present and Claude
  # never knows it exists - the browser capability is silently half-installed.
  # There is no `install --skills` flag; the path comes from `--help`.
  if [ -d "$CLAUDE_DIR/skills/playwright-cli" ]; then
    skip "playwright-cli skill already installed"
  elif have playwright-cli; then
    pw_skill=$(playwright-cli --help 2>&1 | grep -oE "/[^ ]*playwright-cli/SKILL.md" | head -1)
    if [ -n "$pw_skill" ] && [ -f "$pw_skill" ]; then
      add "playwright-cli skill"
      run "mkdir -p '$CLAUDE_DIR/skills/playwright-cli'"
      run "cp '$pw_skill' '$CLAUDE_DIR/skills/playwright-cli/SKILL.md'"
    else
      warn "playwright-cli skill not found in the package - browser work will not be discoverable"
    fi
  fi
fi

# ------------------------------- 12. settings (merge, never clobber) - LAST
# This runs last on purpose: `claude plugin install` rewrites settings.json
# from Claude Code's own loaded config and silently drops any key added
# before it (autoCompactWindow was lost this way, and again by /model saving a default).
# The template's keys win; every other key already in settings.json is kept.
if [ -f "$CLAUDE_DIR/settings.json" ]; then
  if jq -e --slurpfile t "$REPO/config/settings.template.json" \
       '. as $cur | ($cur * $t[0]) == $cur' "$CLAUDE_DIR/settings.json" >/dev/null 2>&1; then
    skip "settings.json already has the template keys"
  else
    add "merge settings.template.json into settings.json"
    run "jq -s '.[0] * .[1]' '$CLAUDE_DIR/settings.json' '$REPO/config/settings.template.json' > '$CLAUDE_DIR/settings.json.tmp' && mv '$CLAUDE_DIR/settings.json.tmp' '$CLAUDE_DIR/settings.json'"
  fi
else
  add "create settings.json from template"
  run "cp '$REPO/config/settings.template.json' '$CLAUDE_DIR/settings.json'"
fi


# graft's own installer writes hook timeouts in milliseconds (10000, 15000), but
# Claude Code reads them as seconds, so a hung hook could block for hours. Only
# merged where graft has installed its helper; re-run this after `graft init`.
if [ -f "$CLAUDE_DIR/helpers/graft-hooks.cjs" ]; then
  if jq -e --slurpfile t "$REPO/config/settings.graft.json" \
       '. as $cur | ($cur * $t[0]) == $cur' "$CLAUDE_DIR/settings.json" >/dev/null 2>&1; then
    skip "graft hooks already set, timeouts in seconds"
  else
    add "graft hooks with timeouts in seconds"
    run "jq -s '.[0] * .[1]' '$CLAUDE_DIR/settings.json' '$REPO/config/settings.graft.json' > '$CLAUDE_DIR/settings.json.tmp' && mv '$CLAUDE_DIR/settings.json.tmp' '$CLAUDE_DIR/settings.json'"
  fi
fi

echo
ok "bootstrap finished. Restart Claude Code, then run: claude plugin list; claude mcp list"
