import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnArgs } from "../lib/detect.mjs";
import * as I from "../lib/install.mjs";

test("on Windows, commands go through a shell so .cmd shims like npm can start", () => {
  assert.deepEqual(spawnArgs("npm", ["root", "-g"], "win32"), ["npm root -g", [], { shell: true }]);
  assert.deepEqual(spawnArgs("npm", ["root", "-g"], "linux"), ["npm", ["root", "-g"], {}]);
  assert.equal(spawnArgs("qmd", ["add", "C:\\Users\\Jane Doe\\brain"], "win32")[0], 'qmd add "C:\\Users\\Jane Doe\\brain"');
});

test("copySkill registers a skill shipped inside a package, and warns when it is missing", () => {
  const box = mkdtempSync(join(tmpdir(), "gr-test-"));
  process.env.CLAUDE_CONFIG_DIR = join(box, ".claude");
  const src = join(box, "pkg", "SKILL.md");
  mkdirSync(join(box, "pkg"));
  writeFileSync(src, "# playwright\n");

  I.copySkill(src, "playwright-cli");
  const dest = join(box, ".claude", "skills", "playwright-cli", "SKILL.md");
  assert.equal(readFileSync(dest, "utf8"), "# playwright\n");

  I.copySkill(join(box, "nope", "SKILL.md"), "ghost");
  assert.equal(existsSync(join(box, ".claude", "skills", "ghost")), false, "a missing source must not create a skill");
  delete process.env.CLAUDE_CONFIG_DIR;
  rmSync(box, { recursive: true, force: true });
});
