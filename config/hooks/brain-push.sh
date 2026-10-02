#!/usr/bin/env bash
# SessionEnd hook. Commits and pushes the brain vault.
set -u
VAULT="${BRAIN_DIR:-$HOME/brain}"
LOG="$HOME/.claude/brain-sync.log"
[ -d "$VAULT/.git" ] || exit 0
exec 9>"/tmp/brain-sync.lock"
flock -w 30 9 || exit 0
cd "$VAULT" || exit 0
git add -A >>"$LOG" 2>&1
git diff --cached --quiet && exit 0
git commit -q -m "brain: $(hostname -s) $(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$LOG" 2>&1
if ! { timeout 30 git pull --rebase --autostash -q && timeout 30 git push -q; } >>"$LOG" 2>&1; then
  echo "brain: sync failed, see $LOG" >&2
fi
exit 0
