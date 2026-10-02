// What is already on this machine. Every check is cheap and never throws.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";

export const claudeDir = () => process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");

export function osName() {
  if (platform() === "win32") return "windows";
  if (platform() === "darwin") return "macos";
  return existsSync("/proc/sys/fs/binfmt_misc/WSLInterop") || process.env.WSL_DISTRO_NAME ? "wsl" : "linux";
}

// On WSL the Windows PATH is appended, so `where` can return a Windows binary
// that cannot run here. Anything under /mnt/ is treated as absent.
export function has(cmd) {
  try {
    const out = execFileSync(platform() === "win32" ? "where" : "which", [cmd], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
    }).trim().split(/\r?\n/)[0];
    if (!out) return false;
    if (out.startsWith("/mnt/")) return false;
    return true;
  } catch {
    return false;
  }
}

export function readJson(file, fallback = {}) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function localPlugins() {
  try {
    const out = execFileSync("claude", ["plugin", "list", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 30000,
    });
    return JSON.parse(out).filter((p) => p.scope !== "synced");
  } catch {
    return [];
  }
}
