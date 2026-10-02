import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(repo, "bin", "cli.mjs");

function runCli(args, env = {}) {
  return execFileSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const sandbox = () => mkdtempSync(join(tmpdir(), "gr-test-"));

test("--dry-run writes nothing", () => {
  const box = sandbox();
  const cfg = join(box, ".claude");
  runCli(["--yes", "--dry-run"], { CLAUDE_CONFIG_DIR: cfg });
  assert.equal(existsSync(cfg), false, "dry run must not create the config directory");
  rmSync(box, { recursive: true, force: true });
});

test("default install writes the core and is idempotent", () => {
  const box = sandbox();
  const cfg = join(box, ".claude");
  runCli(["--yes"], { CLAUDE_CONFIG_DIR: cfg });
  assert.ok(existsSync(join(cfg, "CLAUDE.md")));
  assert.ok(existsSync(join(cfg, "statusline.mjs")));
  assert.ok(existsSync(join(cfg, "skills", "golden-rules", "SKILL.md")));

  const second = runCli(["--yes"], { CLAUDE_CONFIG_DIR: cfg });
  assert.equal(/\[add /.test(second), false, "a second run must add nothing");
  rmSync(box, { recursive: true, force: true });
});

test("modules decide which sections exist", () => {
  const box = sandbox();
  const cfg = join(box, ".claude");
  runCli(["--with=brain,production"], { CLAUDE_CONFIG_DIR: cfg });
  const rules = readFileSync(join(cfg, "CLAUDE.md"), "utf8");
  assert.match(rules, /## Brain/);
  assert.match(rules, /## Production server/);
  assert.equal(/## Staging must equal production/.test(rules), false, "docker was not selected");

  const settings = JSON.parse(readFileSync(join(cfg, "settings.json"), "utf8"));
  assert.deepEqual(Object.keys(settings.hooks), ["SessionStart", "SessionEnd"]);
  assert.equal(settings.autoCompactWindow, 200000);
  rmSync(box, { recursive: true, force: true });
});

test("no modules means no optional sections and no hooks", () => {
  const box = sandbox();
  const cfg = join(box, ".claude");
  runCli(["--with="], { CLAUDE_CONFIG_DIR: cfg });
  const rules = readFileSync(join(cfg, "CLAUDE.md"), "utf8");
  for (const section of ["## Brain", "## Production server", "## Code maps", "## Browser"]) {
    assert.equal(rules.includes(section), false, `${section} must be absent`);
  }
  const settings = JSON.parse(readFileSync(join(cfg, "settings.json"), "utf8"));
  assert.equal(settings.hooks, undefined, "no vault means no sync hooks");
  rmSync(box, { recursive: true, force: true });
});

test("an existing CLAUDE.md is backed up, never silently replaced", () => {
  const box = sandbox();
  const cfg = join(box, ".claude");
  runCli(["--with="], { CLAUDE_CONFIG_DIR: cfg });
  writeFileSync(join(cfg, "CLAUDE.md"), "# my own rules\n");
  runCli(["--with=brain"], { CLAUDE_CONFIG_DIR: cfg });
  const backups = readFileSync(join(cfg, `CLAUDE.md.bak-${new Date().toISOString().slice(0, 10)}`), "utf8");
  assert.match(backups, /my own rules/);
  rmSync(box, { recursive: true, force: true });
});

test("settings.json keeps keys we do not own", () => {
  const box = sandbox();
  const cfg = join(box, ".claude");
  mkdirSync(cfg, { recursive: true });
  writeFileSync(join(cfg, "settings.json"), JSON.stringify({ theme: "dark", tui: "fullscreen" }));
  runCli(["--yes"], { CLAUDE_CONFIG_DIR: cfg });
  const settings = JSON.parse(readFileSync(join(cfg, "settings.json"), "utf8"));
  assert.equal(settings.theme, "dark", "an unrelated key must survive");
  assert.equal(settings.tui, "fullscreen");
  assert.equal(settings.autoCompactWindow, 200000);
  rmSync(box, { recursive: true, force: true });
});

test("an unknown module is rejected", () => {
  assert.throws(() => runCli(["--with=nonsense"]), /status 2|Command failed/);
});

test("the status line survives malformed input", () => {
  const out = execFileSync(process.execPath, [join(repo, "templates", "runtime", "statusline.mjs")], {
    input: "not json",
    encoding: "utf8",
  });
  assert.match(out, /ctx/, "it must still print a line");
});

test("the status line measures context against the 200k compact window, not the model window", () => {
  // 160k tokens on a 1M model is 16% of the model window, but 80% of the compact window.
  const out = execFileSync(process.execPath, [join(repo, "templates", "runtime", "statusline.mjs")], {
    input: JSON.stringify({ context_window: { total_input_tokens: 160000, context_window_size: 1000000, used_percentage: 16 } }),
    encoding: "utf8",
  });
  assert.match(out, /80% ctx/);
});

test("the shell status line agrees with the node one", () => {
  const out = execFileSync("bash", [join(repo, "config", "statusline.sh")], {
    input: JSON.stringify({ context_window: { total_input_tokens: 160000, context_window_size: 1000000, used_percentage: 16 } }),
    encoding: "utf8",
  });
  assert.match(out, /80% ctx/);
});
