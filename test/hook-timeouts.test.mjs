import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

// Claude Code hook timeouts are seconds (default 600). A millisecond value
// such as 10000 would let a hung hook block a session for hours.
test("every hook timeout in the shipped settings is in seconds", () => {
  for (const file of ["settings.template.json", "settings.graft.json"]) {
    const { hooks = {} } = JSON.parse(readFileSync(join(repo, "config", file), "utf8"));
    for (const [event, blocks] of Object.entries(hooks)) {
      for (const h of blocks.flatMap((b) => b.hooks)) {
        assert.ok(h.timeout > 0 && h.timeout <= 600, `${file} ${event}: timeout ${h.timeout} is not seconds`);
      }
    }
  }
});
