---
name: golden-rules
description: The longer working procedures for this setup - graph routing, the subagent protocol, the brain, browser work, and the end-of-session wrap-up. Use when starting a task that involves searching a codebase, launching subagents, browser automation, or finishing a session. Also when the user types /golden-rules.
---

The short always-on rules live in `~/.claude/CLAUDE.md` and are already in your
context. This skill holds only the procedures that are too long for that file.
Do not repeat the rules back; apply them.

## 1. Finding things: which graph to ask

In a repo that has `graft/` or `graphify-out/`, a graph query is the **first**
retrieval move, before any grep or glob. Pick by the kind of question:

| Question is about… | Use | Commands |
|---|---|---|
| Wiring: who calls X, what X calls, what a change breaks, a file's API surface, where a symbol lives | **graft** (deterministic, no model, costs nothing) | `graft callers <symbol>`, `graft blast`, `graft skeleton <file>`, `graft map`, `graft grep <pattern>`, `graft ask "<q>"` |
| Meaning: how a subsystem works, how two concepts relate, anything spanning docs and code | **graphify** | `/graphify query "<question>"`, its path and explain tools |

Unsure: start with graft (cheaper, gives exact `file:line`), move to graphify
only if the answer needs meaning rather than edges.

Broad greps, glob sweeps and directory crawls come **after** the graphs, and only
for what the graphs could not answer. A stale graph is not a reason to skip it:
`graft build` costs nothing and is faster than a blind sweep.

**Keeping them fresh.** Run `graft build` before every push (`graft check` tells
you if it is stale). Run `/graphify --update` only at wrap-up — it calls a model
and costs tokens. Neither `graft/` nor `graphify-out/` is ever committed; both
belong in `.gitignore`.

## 2. Subagents

Use a subagent whenever a task means reading a lot and keeping little: log files,
web pages, large files, repo-wide sweeps. The subagent returns conclusions and
the few facts asked for — never raw dumps, never whole files.

**Every subagent prompt starts with these two lines, then the task:**

```
First invoke the caveman skill at level full and the ponytail skill at level full.
Keep code, file paths, identifiers and error messages verbatim in English.
```
```
If this repo has graft/ or graphify-out/, answer from the graphs first: graft for
wiring questions, graphify for meaning questions. Grep only for what they miss.
```

Load the real skills — a paraphrase of them is not the same thing, and subagents
get no session-start hook to do it for them.

**Exception:** a subagent whose output goes straight to the user, or into a file
that gets committed (documentation, a commit message, PR text), invokes ponytail
only and writes normal prose. Caveman is never active in the main conversation.

**Model choice.** Match the model to the work, not to the importance of the task:

| Work | Model | Why |
|---|---|---|
| Browser automation, scraping, exploratory QA | `sonnet` | Page snapshots are huge and need little reasoning |
| Graph building: graphify extraction chunks, community labelling, `graft build --deep` | `haiku` | Reading files and emitting schema JSON needs no frontier model. Fall back to `sonnet` only after Haiku returns invalid JSON twice |
| Everything else | leave as is | |

Deterministic steps (`graft build`, AST extraction, clustering, exports) call no
model at all — run them directly.

## 3. Browser work

Playwright CLI only, headless, every command wrapped in `timeout 60`. Browser
work runs in a `sonnet` subagent that returns conclusions, not snapshots. No
progress for two minutes: stop and report what blocked you. To capture an API,
record a HAR once, pull the calls out of it, then reproduce them with `curl` or
Python — do not drive the browser for data you can fetch directly.

## 4. The brain

Before changing anything a project's `CLAUDE.md` lists under "Consult the brain
before changing", search the brain and **name what you found** — or say
"nothing recorded" — before writing code.

- `record_work` — what happened in this project and why.
- `remember` — a lesson that will help a different project. State your real
  confidence, not a flattering one.
- `reason` — only when the user asks for it. It is expensive.

Never put secrets or client personal data in the brain.

## 5. Finishing a session

Watch the context percentage in the status line. At about **80%**:

1. Stop starting new work.
2. Run `/graphify --update` if code changed in a repo that has `graphify-out/`.
3. Run `/om-wrap-up` to record decisions and lessons in the brain.
4. Tell the user to `/clear`.

Finishing properly costs less than losing the thread to a compaction.
