#!/usr/bin/env bash
# SessionStart hook. Must print NOTHING to stdout: Claude Code adds SessionStart
# stdout straight into the model's context, which would burn tokens every session.
set -u
VAULT="${BRAIN_DIR:-$HOME/brain}"
LOG="$HOME/.claude/brain-sync.log"
[ -d "$VAULT/.git" ] || exit 0
exec 9>"/tmp/brain-sync.lock"
flock -w 20 9 || exit 0
if ! timeout 20 git -C "$VAULT" pull --rebase --autostash -q >>"$LOG" 2>&1; then
  echo "brain: pull failed, see $LOG" >&2
fi
exit 0
