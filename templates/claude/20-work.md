
## How to work
1. Think before coding. State assumptions. If the request has several readings, show them. If a simpler way exists, say so.
2. Simplicity first. The minimum code that solves the problem. No speculative features, abstractions or config.
3. Surgical changes. Every changed line traces to the request. Do not refactor or restyle unrelated code.
4. Goal-driven. Turn the task into a check first (a failing test, a command that must succeed), then make it pass.
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
