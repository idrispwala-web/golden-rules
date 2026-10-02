#!/usr/bin/env node
// Claude Code status line: model | folder | git branch | context used %
// Reads the session JSON on stdin. Field names per code.claude.com/docs/en/statusline.
// Node rather than shell so it works the same on Windows, macOS and Linux.
import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const read = () =>
  new Promise((resolve) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => resolve(raw));
  });

// Never throw: whatever this prints becomes the user's status bar, and a crash
// here would surface as a broken bar rather than a missing field.
let session = {};
try {
  session = JSON.parse((await read()).trim() || "{}") ?? {};
} catch {
  /* malformed or empty payload - fall through with empty defaults */
}

const model = session.model?.display_name ?? "?";
const dir = session.workspace?.current_dir ?? session.cwd ?? process.cwd();
const folder = basename(dir) || dir;

let branch = "";
try {
  branch = execFileSync("git", ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 1000,
  }).trim();
} catch {
  /* not a repo, or git is unavailable — the branch is simply omitted */
}

// Measure against the auto-compact window (settings "autoCompactWindow": 200000),
// not the model's window: on a 1M model, used_percentage would only reach 20%
// when compaction fires. Keep this number in step with that setting.
const COMPACT_WINDOW = 200000;
// Both fields are null until the first API response of a session.
const used = session.context_window?.total_input_tokens;
const pct = typeof used === "number" ? (used * 100) / COMPACT_WINDOW : session.context_window?.used_percentage;
let ctx = "--% ctx";
if (typeof pct === "number") {
  const n = Math.floor(pct);
  const colour = n >= 80 ? 31 : n >= 60 ? 33 : 32; // red / amber / green
  ctx = `\u001b[${colour}m${n}% ctx\u001b[0m`;
}

console.log([model, folder, branch, ctx].filter(Boolean).join(" | "));
