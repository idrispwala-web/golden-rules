// The install steps. Every one is idempotent and reports [ok]/[add]/[skip].
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { claudeDir, readJson } from "./detect.mjs";

export const state = { dryRun: false, changed: 0 };

const tag = (t, s) => console.log(`  [${t.padEnd(4)}] ${s}`);
export const add = (s) => {
  state.changed++;
  tag("add", s);
};
export const skip = (s) => tag("skip", s);
export const warn = (s) => tag("warn", s);
export const ok = (s) => tag("ok", s);

function write(file, body) {
  if (existsSync(file) && readFileSync(file, "utf8") === body) return false;
  if (!state.dryRun) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
  }
  return true;
}

/** Compose ~/.claude/CLAUDE.md from the chosen fragments. */
export function writeRules(templatesDir, fragments) {
  const body = fragments
    .map((f) => readFileSync(join(templatesDir, "claude", f), "utf8").replace(/\s+$/, ""))
    .join("\n") + "\n";
  const target = join(claudeDir(), "CLAUDE.md");
  if (existsSync(target) && readFileSync(target, "utf8") !== body) {
    const backup = `${target}.bak-${new Date().toISOString().slice(0, 10)}`;
    if (!existsSync(backup)) {
      if (!state.dryRun) cpSync(target, backup);
      warn(`existing CLAUDE.md backed up to ${backup}`);
    }
  }
  write(target, body) ? add(`CLAUDE.md (${fragments.length} sections)`) : skip("CLAUDE.md already current");
}

/** Merge our keys into settings.json, keeping every key the user already had. */
export function mergeSettings(patch) {
  const file = join(claudeDir(), "settings.json");
  const current = readJson(file, {});
  const merged = { ...current, ...patch };
  if (JSON.stringify(current) === JSON.stringify(merged)) return skip("settings.json already current");
  if (!state.dryRun) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`);
  }
  add(`settings.json (${Object.keys(patch).join(", ")})`);
}

/** Copy a runtime file (status line, hook) into ~/.claude. */
export function installRuntime(templatesDir, rel) {
  const src = join(templatesDir, "runtime", rel);
  const dest = join(claudeDir(), rel);
  write(dest, readFileSync(src, "utf8")) ? add(`~/.claude/${rel}`) : skip(`~/.claude/${rel} already current`);
}

export function installSkill(repoDir, name) {
  const src = join(repoDir, "skills", name, "SKILL.md");
  const dest = join(claudeDir(), "skills", name, "SKILL.md");
  write(dest, readFileSync(src, "utf8")) ? add(`skill ${name}`) : skip(`skill ${name} already current`);
}

export function run(cmd, args, label) {
  if (state.dryRun) return tag("dry", `${cmd} ${args.join(" ")}`);
  try {
    execFileSync(cmd, args, { stdio: "inherit", timeout: 900000 });
    add(label);
  } catch {
    warn(`${label} failed - continuing`);
  }
}

export const skillInstalled = (name) => existsSync(join(claudeDir(), "skills", name));
export const listLocalSkills = () => {
  try {
    return readdirSync(join(claudeDir(), "skills")).filter((d) => d !== "synced");
  } catch {
    return [];
  }
};
