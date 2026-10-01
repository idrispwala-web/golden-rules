# golden-rules

One lean Claude Code setup, installed the same way on every Linux machine I work
on: my desktop (WSL2 Ubuntu) and my Azure VM.

Three layers:

| Layer | What it is | Installed by |
|---|---|---|
| **Global** | Rules, status line, brain-sync hooks, a small set of skills, agents and CLI tools. Identical on both machines. | `setup/linux-bootstrap.sh` |
| **Project packs** | Extra rules and MCP servers a *kind* of project needs — data, n8n, frontend, agents. | `setup/project-init.sh` |
| **On demand** | Everything else. Installed when there is a reason, never "just in case". | by hand |

## Install

```sh
git clone https://github.com/idrispwala-web/golden-rules ~/golden-rules
cd ~/golden-rules && git checkout v2

# See what it would do first:
./setup/linux-bootstrap.sh --role desktop --dry-run

# Then really do it:
./setup/linux-bootstrap.sh --role desktop     # or: --role vm
```

Needs `claude`, `jq`, `git`, Node.js (via nvm) and `uv` already on the machine.
Anything already installed is skipped, so re-running is safe and is how you
update: `git pull && ./setup/linux-bootstrap.sh --role desktop`.

### Starting from an old setup

```sh
./setup/wipe-claude.sh --dry-run   # shows exactly what would go
./setup/wipe-claude.sh             # backs up to ~/claude-backup-<date>/ first, then asks
```

It backs up `~/.claude` and `~/.claude.json`, **checks the backup**, and only
then removes local plugins, user-scope MCP servers, local skills, agents,
commands and the `hooks`/`statusLine` keys. It keeps your login and your session
history, and it cannot touch anything synced from your claude.ai account — that
lives in the account, so turn those off at claude.ai if you want them gone.

## What the global layer installs

| Item | What for |
|---|---|
| `~/.claude/CLAUDE.md` | The always-on rules. Short on purpose — it is in context in every session. |
| `golden-rules` skill | The longer procedures: graph routing, subagent protocol, browser rules, wrap-up. Loaded only when needed. |
| status line | model, folder, git branch, and **context used %** — green, amber at 60, red at 80. |
| `autoCompactWindow: 80` | Compaction starts at 80% instead of waiting for the wall. |
| brain hooks | Pull the Obsidian vault at session start, commit and push it at session end. |
| context7 MCP | Current library documentation. Skipped if your claude.ai account already provides it. |
| Ponytail (level `full`) | Writing style. |
| Caveman (**skill only**) | Terse mode for subagents. Installed without its plugin hooks so it is never active in the main conversation. |
| 9 agent-skills | interview-me, doubt-driven-development, incremental-implementation, documentation-and-adrs, ci-cd-and-automation, shipping-and-launch, observability-and-instrumentation, debugging-and-error-recovery, source-driven-development |
| 5 agency-agents | AI engineer, backend architect, devops automator, API tester, reality checker |
| graft, graphify | Code maps. graft is deterministic and free; graphify costs tokens and runs at wrap-up. |
| QMD | Local search. On the VM, only if it has 8 GB+ RAM. |
| Playwright CLI | Browser automation. Desktop only. |

## Project packs

```sh
cd ~/projects/my-repo
~/golden-rules/setup/project-init.sh              # base files only
~/golden-rules/setup/project-init.sh data n8n     # base + packs
```

Every project gets `.gitattributes` (`eol=lf`), a `CLAUDE.md` skeleton, a Docker
parity checklist, and `graft/` + `graphify-out/` in `.gitignore`. Packs append
their own section to `CLAUDE.md` and merge their MCP server into `.mcp.json`.
Nothing is ever overwritten.

| Pack | Adds |
|---|---|
| `data` | Query speed budget (300 ms / 2 s), `EXPLAIN ANALYZE` rule, Postgres MCP in read-only mode |
| `n8n` | n8n MCP; workflows live in the repo as JSON, not only in the UI |
| `frontend` | Browser rules; dashboards inherit the data speed budget |
| `agents` | `evals/` skeleton and the rule that no prompt, retrieval or chunking change ships until evals pass |

MCP fragments read secrets from environment variables (`${DATABASE_URI}`,
`${N8N_API_KEY}`). No secret is ever written into a file in this repo.

## Legacy v1

`main.go`, `install.sh`, `install.ps1`, `.goreleaser.yaml` and the
`.claude-plugin/` manifests are **v1** — a Go binary that installed an older,
larger set of tools (superpowers, agent-browser, andrej-karpathy-skills). They
are kept so existing installs keep working, but v2 does not use them and they
are not maintained. Use the shell scripts above.
