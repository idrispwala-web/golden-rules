# Distribution

**npm is the only channel. Homebrew and winget are deliberately retired.**

Decided 2026-10-02. Written down so it is not re-litigated by someone (or some
agent) who notices the unused plumbing and assumes it is an oversight.

## What exists, and why it is switched off

`.goreleaser.yaml` publishes a Homebrew cask and opens a PR to
`microsoft/winget-pkgs`. All three prerequisites are in place — the
`homebrew-tap` repo, a `winget-pkgs` fork, and the `TAP_GITHUB_TOKEN` secret —
so the pipeline would work today.

It is switched off because of **what it ships**, not because it is broken.
It builds `main.go`, the v1 installer, which installs `superpowers` and
`agent-browser` — tools v2 deliberately removes. Tagging a release with the old
`tags: ["v*"]` trigger would have pushed v1's behaviour to brew and winget at
the same moment npm received v2.

`release.yml` is therefore `workflow_dispatch` only. **Do not restore its tag
trigger** unless the Go binary is rewritten to match v2.

## Why not port it

Getting v2 into a `.exe` costs one of these:

| Route | Cost |
|---|---|
| Node single-executable | ~120 MB per platform, to deliver 112 KB of code |
| Port the CLI to Go | ~684 lines, then two implementations of the same logic, forever |

The second is how the graphify-skill bug happened: two copies of one behaviour
drifting apart. Five bugs were found installing this on two real machines, and
duplicate implementations caused one of them.

## Why npm is enough

This is a Node CLI, and its users already have Node — Claude Code's own skill
installer is `npx`-based, so anyone installing skills has it. `npx golden-rules`
requires no installation at all, which beats a package manager for a tool you
run once or twice.

The argument for winget would be reaching people without Node. Those people also
cannot run the optional tooling the wizard offers, so the install would be
configuring rules for an environment that cannot use the rest of them.

## If this is revisited

Port to Go rather than Node SEA (5 MB beats 120 MB, and the release plumbing
already exists), and add a test asserting the Go and JS implementations produce
an identical `CLAUDE.md` for the same module set. Without that test they will
drift, and the drift will be silent.
