
## Data and dashboards

**Speed budget**, measured on production-sized data, not a toy table:
- every dashboard query under **300 ms**
- first page load under **2 s**

**Rules**
- Run `EXPLAIN (ANALYZE, BUFFERS)` on every dashboard query and show the output
  before calling the work done. "It feels fast" is not a measurement.
- Dashboards read summary tables or materialized views, refreshed by n8n. They
  never read raw tables directly.
- Index every column used in a filter, join or sort — then prove from the plan
  that the index is actually used.
- Send aggregates and paginated rows only. Never ship a full table to the browser.
- Cache API responses in FastAPI when the underlying data changes hourly or slower.
- Validate every number against a known total before showing it to anyone.

**Dashboard tool:** decide in a decision record before building, and record the
reason in the brain.
