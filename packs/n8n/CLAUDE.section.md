
## n8n workflows

- Workflows live in this repo as exported JSON under `workflows/`. The repo is
  the source of truth, not the n8n UI.
- Change a workflow by editing it in the UI, exporting it, and committing the
  JSON — or by editing the JSON and importing it. Never leave a change that
  exists only in the UI.
- Credentials are never exported. Export strips them; keep it that way.
- The n8n URL and API key come from the environment (`N8N_API_URL`,
  `N8N_API_KEY`), never from a committed file.
- Production n8n is live. Do not stop, restart or re-deploy it to test a change.
