#!/usr/bin/env node
// SessionEnd hook: commit whatever changed in the vault, then pull and push.
import { hostname } from "node:os";
import { vault, isRepo, withLock, git, log } from "./_git.mjs";

const dir = vault();
if (!isRepo(dir)) process.exit(0);

withLock("brain-sync.lock", 120000, () => {
  try {
    git(["add", "-A"], dir);
    try {
      git(["diff", "--cached", "--quiet"], dir);
      log("push: nothing to commit");
      return; // nothing staged - a clean exit, not a failure
    } catch {
      /* non-zero from --quiet means there ARE staged changes */
    }
    const stamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    git(["commit", "-q", "-m", `brain: ${hostname()} ${stamp}`], dir);
    git(["pull", "--rebase", "--autostash", "-q"], dir);
    git(["push", "-q"], dir);
    log("push ok");
  } catch (e) {
    log(`push failed: ${String(e.stderr || e.message).trim().split("\n").slice(-1)[0]}`);
    console.error("brain: sync failed, see ~/.claude/brain-sync.log");
  }
});
process.exit(0);
