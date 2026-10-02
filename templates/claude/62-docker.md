
## Staging must equal production
- Projects run in the same container image locally and in production; only `.env` differs.
- Pin base image versions. Commit the lockfile and build from it.
- Every repo has `.gitattributes` with `* text=auto eol=lf`.
- One change per branch. Before changing code, state what must NOT change, and keep it unchanged.
- Tests (and evals for RAG or agent work) pass before anything is called done. Production deploys only through CI.
