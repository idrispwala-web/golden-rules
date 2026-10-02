import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the sync log follows CLAUDE_CONFIG_DIR, so test runs stay out of the real log", async () => {
  const box = mkdtempSync(join(tmpdir(), "gr-log-"));
  process.env.CLAUDE_CONFIG_DIR = box;
  const { log, logFile } = await import(pathToFileURL(join(repo, "templates", "runtime", "hooks", "_git.mjs")));
  assert.equal(logFile(), join(box, "brain-sync.log"));
  log("hello");
  assert.match(readFileSync(join(box, "brain-sync.log"), "utf8"), /hello/);
  rmSync(box, { recursive: true, force: true });
});
