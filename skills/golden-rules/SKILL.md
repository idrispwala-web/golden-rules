---
name: golden-rules
description: Team golden rules for every coding session - Karpathy guidelines, read-before-write, root-cause fixes, verify-then-claim, git hygiene, graph-first retrieval, subagent conventions. Use at the start of any coding task, or when the user types /golden-rules.
---

Apply every rule below for the rest of this session. Confirm with one line: "Golden rules active." Then continue with the user's task.

# Golden Rules
These apply in every session, every project, no exceptions.

0. **Karpathy's rules. These outrank every rule below.** ([source](https://x.com/karpathy/status/2015883857489522876), skill: `andrej-karpathy-skills:karpathy-guidelines`)
   - **Think before coding.** State assumptions out loud. Multiple readings of the request: present them, don't silently pick one. Simpler approach exists: say so, push back. Something unclear: stop and name it (scope the asking with rule 5 - ask when the answer changes the work).
   - **Simplicity first.** Minimum code that solves the problem, nothing speculative. No features beyond the ask, no abstraction for single-use code, no unrequested configurability, no error handling for impossible states. Wrote 200 lines that could be 50: rewrite it. Test: would a senior engineer call this overcomplicated?
   - **Surgical changes.** Every changed line traces directly to the request. Don't improve adjacent code, comments, or formatting. Don't refactor what isn't broken. Match existing style even where you'd choose differently. Unrelated dead code: mention it, don't delete it. Delete only the imports and helpers your own change orphaned.
   - **Goal-driven execution.** Turn the task into a verifiable goal before starting: "add validation" becomes "write tests for invalid inputs, then make them pass"; "fix the bug" becomes "write a failing test that reproduces it, then make it pass". Multi-step work gets a brief plan where each step names its own check. Strong criteria let you loop to done without asking.

1. **Read before you write.** Never edit a file you have not read in this session. Never claim a fact about code you have not opened.
2. **Root cause, not symptom.** Before patching, grep every caller. Fix once where all paths route through.
3. **No unrequested scope.** Do what was asked. No bonus refactors, no speculative abstractions, no new dependencies for what a few lines solve. Suggest extras in one line instead of building them.
4. **Verify, then claim.** "Done" only after running the test/build/command. If it failed, say so and paste the decisive line. Never report success you did not observe.
5. **Ask only when it changes the work.** Two readings lead to materially different code -> ask. Otherwise pick the sane default, state the assumption, keep going.
6. **Destructive ops need consent.** `rm -rf`, force push, history rewrite, DB drop/migrate, mass file delete, secret rotation: confirm first, every time. Prior approval does not carry over.
7. **Git hygiene.** Commit or push only when asked. Never commit on the default branch - branch first. Never `--no-verify`. Never commit secrets, `.env`, credentials, or large binaries.
8. **Secrets stay local.** Never print, log, commit, or send keys/tokens/passwords to any external service.
9. **Match the codebase.** Follow existing style, naming, error handling, and test patterns. Check neighboring files before inventing a convention.
10. **Leave one runnable check.** Non-trivial logic ships with the smallest thing that fails when it breaks - an assert, a `test_*.py`, a `__main__` demo. Trivial one-liners need none.
11. **Finish or flag.** Complete every part of the scope. If something is blocked, finish the rest and say plainly what was left out and why. No silent narrowing.
12. **Don't guess APIs.** Unsure about a library, framework, or CLI: check docs (context7/web) or the installed source. No invented flags, no invented methods.
13. **Every push = graphify + graft.** First `git push` in a repo: run `/graphify` on the repo root to build `graphify-out/` AND `graft build` to build `graft/`. Every push after that: run `/graphify --update` and `graft build` before pushing, so neither graph lags the code (`graft check` tells you if graft is stale). Do not commit `graphify-out/` or `graft/` unless asked - add both to `.gitignore`.
14. **Subagent work is SDD work.** Any fan-out of two or more tasks, or execution of a plan with independent tasks, runs through `superpowers:subagent-driven-development` - fresh implementer per task, task review after each, broad review at the end. One-off lookups and single edits stay direct; don't ceremony them.
15. **Every subagent launches in caveman wenyan + ponytail ultra — by invoking the real skills.** Subagents get no SessionStart hook, and a paraphrase of the rules is not the skill. Start every `Agent` prompt (SDD implementer, reviewer, or ad-hoc) with these three lines, then the task:
    `Before anything else, invoke the Skill tool twice: skill "caveman:caveman" with args "wenyan-full", then skill "ponytail:ponytail" with args "ultra". Follow both skills exactly for the whole task. Code, file paths, identifiers, and error strings stay verbatim in English.`
    `If graphify-out/ or graft/ exists in the repo, answer from the graphs first. Structural code questions (who calls X, what breaks if Y changes, API surface of a file, where a symbol lives) go to graft: `graft callers`, `graft blast`, `graft skeleton`, `graft ask`. Conceptual questions (how a subsystem works, how concepts relate, anything spanning docs and code) go to `/graphify query "<question>"`. Broad grep or glob sweeps come after, only for what the graphs cannot answer.`
    `Do not summarise or paraphrase the skills back; load them and apply them.`
    Exception: an agent whose output goes straight to the user or into a committed file (docs, commit messages, PR text) invokes ponytail only and writes normal prose.
16. **Graph before grep - and pick the graph by query type.** In any repo with `graphify-out/` or `graft/`, the first retrieval move is a graph query - yours and every subagent's. Route by what is being asked:
    - **Structural / wiring** (who calls X, callees of X, blast radius of a diff, signatures of a file, where a symbol is defined, repo orientation, regex hit grouped by symbol): **graft** - `graft callers <symbol>`, `graft blast`, `graft skeleton <file>`, `graft map`, `graft grep <pattern>`, `graft ask "<q>"`. Deterministic, $0, no LLM.
    - **Conceptual / architectural** (how does subsystem X work, how do A and B relate, what are the god nodes, anything that mixes docs, papers, or non-code inputs with code): **graphify** - `/graphify query "<question>"`, path/explain tools.
    - Unsure which: structural first (cheaper, exact file:line), graphify if the answer needs meaning rather than edges.
    Broad greps, glob sweeps, and directory crawls come after, only for what the graphs missed. Stale graph: `graft build` / `/graphify --update` cost less than a blind sweep.
17. **Browser work runs on Sonnet.** Every agent-browser task (navigating, clicking, forms, screenshots, scraping, exploratory QA, Playwright-style checks driven through the browser) goes to a subagent launched with `model: "sonnet"`, never on the main model. Snapshots and page dumps are token-heavy and low-reasoning; Sonnet is enough and far cheaper. The subagent invokes the `agent-browser` skill itself (rule 15's skill-invocation lines still apply) and returns only the conclusion plus the few facts asked for, never raw snapshots. Exception: a single one-off URL check where spawning costs more than the page (one `curl` or one snapshot) stays direct.
18. **Graph builds run on the cheapest model that works.** `/graphify` semantic-extraction chunk agents and community labelling, `graft build --deep` meaning passes, and any other graph-construction subagent launch with `model: "haiku"`; fall back to `model: "sonnet"` only if Haiku returns invalid JSON or misses the node-ID format twice. Never run extraction chunks on the main (Opus/Fable) model — reading files and emitting schema JSON needs no frontier reasoning. Deterministic parts (`graft build`, AST extraction, clustering, exports) use no LLM at all and stay direct.
