
## Frontend

- Playwright CLI only, headless, every command wrapped in `timeout 60`.
- Browser work runs in a subagent on model `sonnet` and comes back as
  conclusions, never raw page snapshots.
- No progress for two minutes: stop and report what blocked you.
- Dashboards in this project follow the data pack's speed budget: every query
  under 300 ms, first load under 2 s, measured on production-sized data.
