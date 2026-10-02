
## Browser
- Headless by default, every command wrapped in a timeout.
- No progress for two minutes: stop and report what blocked you.
- Browser work runs in a subagent on a cheaper model and returns conclusions, never raw page dumps.
- To capture an API: record once, extract the calls, then reproduce them directly instead of driving the browser.
