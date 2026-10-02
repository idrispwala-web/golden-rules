#!/usr/bin/env node
// SessionStart hook.
//
// Prints NOTHING to stdout on success: Claude Code adds SessionStart stdout
// straight into the model's context, so anything printed here is paid for in
// every single session. Problems go to stderr, which is not added to context.
import { vault, isRepo, withLock, git, log } from "./_git.mjs";

const dir = vault();
if (!isRepo(dir)) process.exit(0);

const ran = withLock("brain-sync.lock", 120000, () => {
  try {
    git(["pull", "--rebase", "--autostash", "-q"], dir, 20000);
    log("pull ok");
  } catch (e) {
    log(`pull failed: ${String(e.stderr || e.message).trim().split("\n").slice(-1)[0]}`);
    console.error("brain: pull failed, see ~/.claude/brain-sync.log");
  }
});
if (!ran) log("pull skipped, another sync held the lock");
process.exit(0);
