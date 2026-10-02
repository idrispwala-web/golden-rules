# golden-rules

A starting skeleton for a Claude Code setup.

Claude Code is better when it knows how you work. That usually means a
`~/.claude/CLAUDE.md` you wrote once and never revisited, a status line you
copied from somewhere, and per-project rules you keep retyping. This sets up
all three, asks what actually applies to you, and stays out of the way.

```sh
npx golden-rules
```

Nothing is installed globally unless you say yes to it.

## What you get

| | |
|---|---|
| **Global rules** | `~/.claude/CLAUDE.md`, composed from the answers you give — not a fixed file |
| **Status line** | model, folder, git branch, and **context used %** (green → amber at 60 → red at 80) |
| **Auto-compact at 80%** | instead of waiting for the wall |
| **Project files** | `CLAUDE.md` skeleton, `.gitattributes` with `eol=lf`, a container-parity checklist |
| **Project packs** | extra rules + MCP config for `data`, `n8n`, `frontend`, `agents` projects |
| **A skill** | the longer procedures: code maps vs grep, the subagent protocol, browser rules, wrap-up |
| **Vault sync** *(optional)* | pulls your Obsidian vault at session start, commits and pushes at session end |

## Why the rules are composed, not copied

A rules file that mentions your production server is wrong for someone who has
none. One that says "explain things simply" is wrong for someone who wants the
opposite. So the wizard asks, and writes only the sections that apply:

| Module | Adds |
|---|---|
| `brain` | vault rules + the two sync hooks |
| `codemaps` | when to use a code map instead of grep |
| `docker` | staging must equal production |
| `browser` | headless, timeouts, cheap model, no raw page dumps |
| `production` | strict "do not touch the live server" rules |

Skip them all and you get a 40-line file with nothing in it you did not choose.

## Usage

```sh
npx golden-rules                      # interactive
npx golden-rules --dry-run            # show what it would do, change nothing
npx golden-rules --yes                # accept every default, no questions
npx golden-rules --with=brain,docker  # pick modules without being asked

cd ~/code/my-project
npx golden-rules project              # base files for this repo
npx golden-rules project data         # ...plus the data pack
```

Everything is idempotent. Run it again any time — it only changes what changed,
and tells you what it did. An existing `~/.claude/CLAUDE.md` is backed up before
it is replaced, and keys in `settings.json` that aren't ours are left alone.

## The vault, if you want one

Opt into the `brain` module and you get two hooks: one pulls your notes vault
when a session starts, the other commits and pushes when it ends. Point
`BRAIN_DIR` at any folder that is a git repo, or use `~/brain`.

In practice that means a **private GitHub repo holding an Obsidian vault**, so
Claude reads your notes and writes back what it decided — and the same notes
follow you to another machine. Any Obsidian folder with a remote works;
[obsidian-mind](https://github.com/breferrari/obsidian-mind) is one ready-made
option if you are starting fresh.

The pull hook deliberately prints nothing. Claude Code adds `SessionStart`
output straight into the model's context, so anything it printed would be paid
for in every session you ever run.

## Optional tools

The wizard offers these and installs nothing you do not pick:

- **[graft](https://www.npmjs.com/package/@nanonets/graft)** — a wiring map of your
  code. Deterministic, no model calls, free to run.
- **[graphify](https://pypi.org/project/graphifyy/)** — a meaning-level graph.
  Uses a model, so it runs at wrap-up rather than constantly.

The rule the skeleton ships with is: *a new tool earns its place by replacing
something or fixing a measured problem.* Every skill, plugin and MCP server
costs tokens in **every session, forever** — so the default is lean on purpose.

## Requirements

Node 18+. Claude Code, obviously — though the files write fine without it.

**Tested on Linux and WSL2.** Windows support is written and the code paths are
cross-platform (no bash, no `flock`), but it has had less real-world use —
reports welcome. macOS is untested; it should work, and I would rather say that
than claim it.

## Development

```sh
npm test        # 8 tests, no network, each in a temp directory
```

## Licence

MIT.

## Releasing (maintainers)

```sh
npm version patch     # or minor / major - updates package.json and tags
git push --follow-tags
```

The `v*` tag triggers `.github/workflows/npm-publish.yml`, which runs the tests,
refuses to publish if the tag and `package.json` disagree, and publishes with
npm **trusted publishing** (OIDC) — there is no npm token stored anywhere.

One-time setup: on the package's npm settings page, add this repository and
`npm-publish.yml` as a trusted publisher.

`release.yml` is the **legacy v1 Go binary** and is manual-only. It installs
tools v2 deliberately does not, so it must never fire on a tag.

Homebrew and winget are retired on purpose — see
[docs/distribution.md](docs/distribution.md) for the reasoning and what it would
cost to bring them back.
