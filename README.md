# golden-rules

Our team's golden rules for Claude Code, packaged as a `/golden-rules` skill, plus a one-command installer for every plugin, CLI and skill the rules depend on.

The installer is a plain Go binary. It runs local commands (`claude plugin`, `claude mcp`, `npm`, `pip`/`uv`) and never calls a model, so installing costs no AI credits.

## Install

```sh
# macOS / Linux
brew install --cask idrispwala-web/tap/golden-rules
golden-rules

# Windows
winget install idrispwala-web.golden-rules
golden-rules
```

Restart Claude Code, then type `/golden-rules`.

Preview first with `golden-rules --dry-run`. Re-running is safe: anything already installed is skipped.

## What it installs

| Item | How |
|---|---|
| `/golden-rules` skill | written to `~/.claude/skills/golden-rules/SKILL.md` |
| superpowers, caveman, ponytail, andrej-karpathy-skills plugins | `claude plugin marketplace add` + `claude plugin install` |
| context7 MCP | `claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp` |
| graft | `npm install -g @nanonets/graft` |
| agent-browser + its skill | `npm install -g agent-browser`, `agent-browser install`, skill from vercel-labs/agent-browser |
| graphify + its skill | `uv tool install graphifyy` (or pipx / pip), then `graphify install` |

Prerequisites: [Claude Code](https://claude.com/claude-code), [Node.js](https://nodejs.org), and [uv](https://docs.astral.sh/uv) or Python 3. The installer reports whatever is missing.

## Plugin-only install

If you only want the rules and not the dependencies:

```
/plugin marketplace add idrispwala-web/golden-rules
/plugin install golden-rules@golden-rules
```

With this path the skill is namespaced as `/golden-rules:golden-rules`.

## Releasing

1. Create the public repos `idrispwala-web/homebrew-tap` (empty) and a fork of `microsoft/winget-pkgs` under `idrispwala-web`.
2. Add a repo secret `TAP_GITHUB_TOKEN`: a PAT with `repo` scope that can push to both repos.
3. Tag and push: `git tag v0.1.0 && git push origin v0.1.0`.

The release workflow builds binaries for Windows, macOS and Linux, pushes the cask to the tap, and opens a PR to `microsoft/winget-pkgs`. Winget availability waits on Microsoft's review of that PR, which usually takes a few days for a new package.

Edit the rules in `skills/golden-rules/SKILL.md`. The binary embeds that file.
