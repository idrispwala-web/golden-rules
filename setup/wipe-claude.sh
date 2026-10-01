#!/usr/bin/env bash
# wipe-claude.sh - back up, then remove the old Claude Code setup.
#
# Removes: every locally installed plugin (running the plugin's own uninstall
# script first when it has one), every user-scope MCP server, ~/.claude/skills,
# ~/.claude/agents, ~/.claude/commands, and the "hooks" and "statusLine" keys in
# ~/.claude/settings.json.
#
# Keeps: login credentials (.credentials.json), ~/.claude/projects (session
# history), everything synced from claude.ai (that lives in your account, not on
# this machine - turn those off at claude.ai/settings if you want them gone).
set -euo pipefail

DRY_RUN=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --yes|-y)  ASSUME_YES=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "[warn] unknown flag: $arg" >&2; exit 2 ;;
  esac
done

CLAUDE_DIR="$HOME/.claude"
BACKUP="$HOME/claude-backup-$(date +%F)"

ok()   { printf '[ok]   %s\n' "$*"; }
add()  { printf '[add]  %s\n' "$*"; }
skip() { printf '[skip] %s\n' "$*"; }
warn() { printf '[warn] %s\n' "$*" >&2; }
run()  { if [ "$DRY_RUN" = 1 ]; then printf '[dry]  %s\n' "$*"; else eval "$@"; fi; }

[ -d "$CLAUDE_DIR" ] || { ok "no $CLAUDE_DIR - nothing to wipe"; exit 0; }

# ---------------------------------------------------------------- what we found
# `claude plugin list --json` reports a "scope" field. Anything with scope
# "synced" comes from the claude.ai account, not this machine - it cannot be
# uninstalled locally and would just re-sync, so it is excluded here.
PLUGINS=$(claude plugin list --json 2>/dev/null \
  | jq -r '.[] | select(.scope != "synced") | .id' || true)

# `claude mcp list` has no --json and health-checks every claude.ai connector.
# User-scope servers live in ~/.claude.json under .mcpServers, so read that.
MCPS=$(jq -r '.mcpServers // {} | keys[]' "$HOME/.claude.json" 2>/dev/null || true)

echo "This will remove, after backing up to $BACKUP:"
[ -n "$PLUGINS" ]              && echo "  plugins:    $(echo "$PLUGINS" | tr '\n' ' ')" || echo "  plugins:    (none installed locally)"
[ -n "$MCPS" ]                 && echo "  user MCPs:  $(echo "$MCPS" | tr '\n' ' ')"    || echo "  user MCPs:  (none)"
LOCAL_SKILLS=$(find "$CLAUDE_DIR/skills" -mindepth 1 -maxdepth 1 ! -name synced -printf '%f ' 2>/dev/null || true)
[ -n "${LOCAL_SKILLS:-}" ]     && echo "  skills:     $LOCAL_SKILLS" || echo "  skills:     (none installed locally)"
[ -d "$CLAUDE_DIR/agents" ]    && echo "  $CLAUDE_DIR/agents"
[ -d "$CLAUDE_DIR/commands" ]  && echo "  $CLAUDE_DIR/commands"
jq -e 'has("hooks") or has("statusLine")' "$CLAUDE_DIR/settings.json" >/dev/null 2>&1 \
  && echo "  the \"hooks\" and \"statusLine\" keys in settings.json"
echo "It will NOT touch: credentials, $CLAUDE_DIR/projects, or anything synced from claude.ai."
echo

if [ "$DRY_RUN" = 0 ] && [ "$ASSUME_YES" = 0 ]; then
  read -r -p 'Type "yes" to continue: ' reply
  [ "$reply" = "yes" ] || { echo "aborted"; exit 1; }
fi

# ---------------------------------------------------------------------- backup
if [ -d "$BACKUP" ]; then
  skip "backup exists: $BACKUP"
else
  add "backup -> $BACKUP"
  run "mkdir -p '$BACKUP'"
  run "cp -a '$CLAUDE_DIR' '$BACKUP/.claude'"
  [ -f "$HOME/.claude.json" ] && run "cp -a '$HOME/.claude.json' '$BACKUP/.claude.json'"
  if [ "$DRY_RUN" = 0 ]; then
    src=$(find "$CLAUDE_DIR" | wc -l)
    dst=$(find "$BACKUP/.claude" | wc -l)
    if [ "$src" -ne "$dst" ]; then
      warn "backup check FAILED: $src entries in source, $dst in backup. Nothing was removed."
      exit 1
    fi
    ok "backup verified ($dst entries)"
  fi
fi

# --------------------------------------------------------------------- plugins
if [ -n "$PLUGINS" ]; then
  while read -r p; do
    [ -z "$p" ] && continue
    # A plugin may ship its own uninstaller (Ponytail does). Run it first:
    # removing the plugin deletes the script along with it.
    un=$(find "$CLAUDE_DIR/plugins" -path "*/${p%@*}/scripts/uninstall.js" -print -quit 2>/dev/null || true)
    if [ -n "$un" ]; then
      add "plugin $p: running its own uninstall.js first"
      run "node '$un' || true"
    fi
    add "plugin uninstall $p"
    run "claude plugin uninstall '$p' || true"
  done <<< "$PLUGINS"
else
  skip "no locally installed plugins"
fi

# ------------------------------------------------------------------ user MCPs
if [ -n "$MCPS" ]; then
  while read -r m; do
    [ -z "$m" ] && continue
    add "mcp remove $m (user scope)"
    run "claude mcp remove '$m' --scope user || true"
  done <<< "$MCPS"
else
  skip "no user-scope MCP servers"
fi

# ------------------------------------------------------- skills/agents/commands
for d in agents commands; do
  if [ -d "$CLAUDE_DIR/$d" ]; then
    add "remove $CLAUDE_DIR/$d"
    run "rm -rf '$CLAUDE_DIR/$d'"
  else
    skip "$CLAUDE_DIR/$d does not exist"
  fi
done

# Skills: keep the "synced" folder (claude.ai account skills; deleting it only
# makes Claude Code re-download them). Remove every other entry.
if [ -d "$CLAUDE_DIR/skills" ]; then
  found=0
  for entry in "$CLAUDE_DIR/skills"/*; do
    [ -e "$entry" ] || continue
    [ "$(basename "$entry")" = "synced" ] && continue
    found=1
    add "remove skill $(basename "$entry")"
    run "rm -rf '$entry'"
  done
  [ "$found" = 0 ] && skip "no locally installed skills (only claude.ai-synced ones)"
else
  skip "$CLAUDE_DIR/skills does not exist"
fi

# ------------------------------------------------------- settings.json surgery
if [ -f "$CLAUDE_DIR/settings.json" ]; then
  if jq -e 'has("hooks") or has("statusLine")' "$CLAUDE_DIR/settings.json" >/dev/null 2>&1; then
    add 'settings.json: drop "hooks" and "statusLine" (other keys kept)'
    run "jq 'del(.hooks, .statusLine)' '$CLAUDE_DIR/settings.json' > '$CLAUDE_DIR/settings.json.tmp' && mv '$CLAUDE_DIR/settings.json.tmp' '$CLAUDE_DIR/settings.json'"
  else
    skip 'settings.json has no "hooks" or "statusLine"'
  fi
fi

ok "wipe complete. Backup: $BACKUP"
