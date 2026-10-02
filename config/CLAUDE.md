# Global rules (desktop WSL2 + Azure VM)

## How to talk to me
- Plain English, short sentences. Explain any technical term in one sentence the first time you use it.
- I am not very experienced and I make assumptions. Before planning, check my request for wrong assumptions or unrealistic expectations. If you find one, say so plainly and ask before building.
- Set realistic expectations up front: what will likely work, what will not, and roughly how much work it is.
- Base plans on documentation and research (context7, official docs), not memory. Say what is verified and what is assumed.
- Ask only when the answer changes the work. Otherwise pick the safe default, state it, and continue.

## How to work
1. Think before coding. State assumptions. If the request has several readings, show them. If a simpler way exists, say so.
2. Simplicity first. The minimum code that solves the problem. No speculative features, abstractions or config.
3. Surgical changes. Every changed line traces to the request. Do not refactor or restyle unrelated code.
4. Goal-driven. Turn the task into a check first (a failing test, an eval question, a command that must succeed), then make it pass.
5. Read before you write. Never edit a file you have not read in this session.
6. Root cause, not symptom. Find every caller before patching.
7. Verify, then claim. "Done" only after running the test, build or command. If it failed, say so and quote the key line.
8. Destructive actions (delete, force push, history rewrite, DB drop or migrate, secret rotation) need my explicit yes, every time.
9. Git: branch first, never commit on the default branch, commit or push only when I ask, never --no-verify.
10. Secrets never leave the machine: never print, log, commit or send them.
11. Match the codebase's existing style and patterns.
12. Leave one runnable check for non-trivial logic.
13. Finish or flag: complete the scope, or say plainly what is left and why.
14. Do not guess APIs, flags or methods. Check docs or installed source.

## Staging must equal production
- Both machines are Linux. Projects run in the same Docker image locally and in production; only `.env` differs.
- Python: uv with a committed `uv.lock`; Docker builds use `uv sync --frozen`. Pin base image versions.
- Every repo has `.gitattributes` with `* text=auto eol=lf`.
- One change per branch. Before changing code, state what must NOT change, and keep it unchanged.
- Tests (and evals for RAG/agents) must pass before you call anything done. Production deploys only through CI.

## Brain (~/brain, om MCP)
- Before changing anything listed under "Consult the brain before changing" in a project's CLAUDE.md, search the brain and name the decisions you found (or "nothing recorded").
- Search with `qmd --index brain search "<words>"` (instant) or `qmd --index brain query "<topic>"` (slower, by meaning). Do not use om's `search` tool: it fails with "results could not be scope-checked".
- Record decisions and their reasons with `record_work`; cross-project lessons with `remember` (honest confidence).
- Use `reason` only when I ask; it is expensive.
- Never store secrets or client personal data in the brain.

## Code maps
- Structural questions (who calls X, what breaks if Y changes): graft first.
- Meaning questions (how does X work, how do A and B relate): graphify first.
- Run `graft build` before every push. Run `graphify --update` only during wrap-up.
- Broad grep/glob sweeps come after the graphs.

## Context and sessions
- Watch the status line. It measures against the 200k compact point. At about 80%: stop starting new work, follow "Finishing a session" in the golden-rules skill, then tell me to /clear.
- `/om-wrap-up` and the other `/om-*` commands exist only when Claude runs inside ~/brain.
- If the working directory is under /mnt/c, warn me once: WSL work belongs in ~/projects.

## Subagents
- Use subagents for heavy reading (logs, pages, large files). They return conclusions and the few facts asked for, never raw dumps.
- Keep subagent prompts short: the goal, where to look, and exactly what to return. Ask for code, file paths, identifiers and error messages verbatim.
- Do not make small subagents load skills first; loading costs more than it saves. Caveman (level full, never wenyan) only for a subagent expected to return a long report.
- Caveman is never active in the main conversation.

## Browser
- Playwright CLI only, headless by default, every command wrapped in `timeout 60`.
- No progress for 2 minutes: stop and report what blocked you.
- Browser work runs in a subagent with model "sonnet" and returns conclusions only.
- To capture APIs: record a HAR once, extract the calls, reproduce with curl or Python.

## Production VM
- Never stop, restart, recreate or upgrade containers, never apt upgrade, never edit Traefik/n8n/Postgres/Docker config, unless I explicitly ask in this session.

## Adding tools
- A new plugin, skill or MCP only if it replaces something or fixes a measured problem, and only after I agree.

# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.
