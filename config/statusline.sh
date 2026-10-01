#!/usr/bin/env bash
# Claude Code status line: model | folder | git branch | context used %
# Reads the session JSON on stdin. Field names verified against
# code.claude.com/docs/en/statusline (2026-10-01). No network calls.
set -u

input=$(cat)

model=$(printf '%s' "$input" | jq -r '.model.display_name // "?"')
dir=$(printf '%s' "$input" | jq -r '.workspace.current_dir // .cwd // ""')
pct=$(printf '%s' "$input" | jq -r '.context_window.used_percentage // empty')

folder=$(basename "${dir:-$PWD}")

branch=$(git -C "${dir:-$PWD}" rev-parse --abbrev-ref HEAD 2>/dev/null) || branch=""

# used_percentage is null until the first API response of a session.
if [ -n "$pct" ]; then
  pct=${pct%.*}
  if   [ "$pct" -ge 80 ]; then ctx=$(printf '\033[31m%s%% ctx\033[0m' "$pct")   # red: wrap up
  elif [ "$pct" -ge 60 ]; then ctx=$(printf '\033[33m%s%% ctx\033[0m' "$pct")   # yellow
  else                         ctx=$(printf '\033[32m%s%% ctx\033[0m' "$pct")   # green
  fi
else
  ctx="--% ctx"
fi

out="$model | $folder"
[ -n "$branch" ] && out="$out | $branch"
printf '%s | %s\n' "$out" "$ctx"
