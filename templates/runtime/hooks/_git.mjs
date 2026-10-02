// Shared helpers for the brain sync hooks.
//
// Why Node and not shell: the bash originals used `flock`, which does not exist
// on Windows and is not standard on macOS. An advisory lock directory works
// identically everywhere, because mkdir is atomic on every platform we target.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync, appendFileSync, mkdirSync as mkdirp } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir, homedir } from "node:os";

export const vault = () => process.env.BRAIN_DIR || join(homedir(), "brain");
// Respect CLAUDE_CONFIG_DIR like the installer does, so a sandboxed run never
// writes into the real ~/.claude log.
export const logFile = () => join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "brain-sync.log");

export function log(line) {
  try {
    mkdirp(dirname(logFile()), { recursive: true });
    appendFileSync(logFile(), `${new Date().toISOString()} ${line}\n`);
  } catch {
    /* logging must never break a hook */
  }
}

export function isRepo(dir) {
  try {
    return statSync(join(dir, ".git")).isDirectory() || statSync(join(dir, ".git")).isFile();
  } catch {
    return false;
  }
}

// mkdir is atomic on every platform, so it is a portable mutex. A lock older
// than staleMs is assumed abandoned (a crashed hook) and taken over, otherwise
// one dead run would block every later session.
export function withLock(name, staleMs, fn) {
  const dir = join(tmpdir(), name);
  try {
    mkdirSync(dir);
  } catch {
    let age = Infinity;
    try {
      age = Date.now() - statSync(dir).mtimeMs;
    } catch {
      /* vanished between calls - treat as free */
    }
    if (age < staleMs) return false;
    log(`lock ${name} looked stale (${Math.round(age / 1000)}s), taking it over`);
    try {
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir);
    } catch {
      return false;
    }
  }
  try {
    fn();
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
  return true;
}

export function git(args, cwd, timeout = 30000) {
  return execFileSync("git", args, { cwd, encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] });
}
