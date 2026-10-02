#!/usr/bin/env node
// golden-rules - a starting skeleton for a Claude Code setup.
//
//   npx golden-rules            interactive setup
//   npx golden-rules --dry-run  show what it would do, change nothing
//   npx golden-rules --yes      accept every default, no questions
//   npx golden-rules project    add the project files to the repo you are in
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import * as ask from "../lib/ask.mjs";
import { osName, has, claudeDir } from "../lib/detect.mjs";
import * as I from "../lib/install.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const templates = join(repo, "templates");

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);

// --with=brain,production makes an install scriptable and reproducible: CI, a
// dotfiles repo, or a team that wants everyone on the same modules.
const withArg = argv.find((a) => a.startsWith("--with="));
const picked = withArg ? withArg.slice(7).split(",").map((s) => s.trim()).filter(Boolean) : null;
const MODULES = ["brain", "codemaps", "docker", "browser", "production"];
const unknown = (picked ?? []).filter((m) => !MODULES.includes(m));
if (unknown.length) {
  console.error(`unknown module: ${unknown.join(", ")} (valid: ${MODULES.join(" ")})`);
  process.exit(2);
}
I.state.dryRun = flag("--dry-run");
const auto = flag("--yes") || flag("-y") || !ask.interactive();

if (flag("--help") || flag("-h")) {
  ask.say(`golden-rules - a starting skeleton for a Claude Code setup

  npx golden-rules              interactive setup
  npx golden-rules --dry-run    show what it would do, change nothing
  npx golden-rules --yes        accept every default, no questions
  npx golden-rules --with=brain,codemaps
                                pick modules without being asked
                                (brain codemaps docker browser production)
  npx golden-rules project      add project files to the repo you are in
                                (add a pack: data | n8n | frontend | agents)

Everything is idempotent: run it again any time to update.`);
  process.exit(0);
}

// ---------------------------------------------------------------- project mode
if (argv[0] === "project") {
  const { projectInit } = await import("../lib/project.mjs");
  await projectInit(repo, argv.slice(1).filter((a) => !a.startsWith("-")));
  ask.close();
  process.exit(0);
}

// --------------------------------------------------------------------- setup
const os = osName();
ask.head("golden-rules");
ask.note(`${os} - config goes to ${claudeDir()}${I.state.dryRun ? " - DRY RUN, nothing will change" : ""}`);

if (!has("claude")) {
  ask.note("Claude Code was not found on PATH. The files will still be written; install Claude Code to use them.");
}

// 1. voice -------------------------------------------------------------------
ask.head("1. How should Claude talk to you?");
const voice = auto || picked
  ? "10-voice-plain.md"
  : await ask.choose("", [
      { label: "Plain English, explain as you go", hint: "good if the stack is new to you", value: "10-voice-plain.md" },
      { label: "Direct and concise, assume I know the stack", value: "10-voice-direct.md" },
      { label: "Neither - I will write my own", value: null },
    ]);

// 2. modules -----------------------------------------------------------------
ask.head("2. Which rules apply to you?");
if (picked) ask.note(`modules from --with: ${picked.join(", ") || "(none)"}`);
const on = (name, question, fallback) =>
  picked ? picked.includes(name) : auto ? fallback : ask.confirm(question, fallback);

const brain = await on("brain", "Keep an Obsidian notes vault that Claude reads and writes (synced through a private GitHub repo)?", false);
const codemaps = await on("codemaps", "Use code maps (graft / graphify) instead of grepping first?", true);
const docker = await on("docker", "Do your projects ship in containers, where staging must equal production?", false);
const browser = await on("browser", "Do you automate a browser from Claude?", false);
const production = await on("production", "Do you have a production server Claude can reach (strict do-not-touch rules)?", false);

const fragments = ["00-header.md"];
if (voice) fragments.push(voice);
fragments.push("20-work.md", "30-context.md", "40-subagents.md");
if (brain) fragments.push("60-brain.md");
if (codemaps) fragments.push("61-codemaps.md");
if (docker) fragments.push("62-docker.md");
if (browser) fragments.push("63-browser.md");
if (production) fragments.push("64-production.md");
fragments.push("50-tools.md");

// 3. write the core ----------------------------------------------------------
ask.head("3. Writing the core");
I.writeRules(templates, fragments);
I.installRuntime(templates, "statusline.mjs");

const settings = {
  autoCompactWindow: 80,
  statusLine: { type: "command", command: `node "${join(claudeDir(), "statusline.mjs")}"` },
};

if (brain) {
  I.installRuntime(templates, join("hooks", "_git.mjs"));
  I.installRuntime(templates, join("hooks", "brain-pull.mjs"));
  I.installRuntime(templates, join("hooks", "brain-push.mjs"));
  settings.hooks = {
    SessionStart: [{ hooks: [{ type: "command", command: `node "${join(claudeDir(), "hooks", "brain-pull.mjs")}"`, timeout: 30 }] }],
    SessionEnd: [{ hooks: [{ type: "command", command: `node "${join(claudeDir(), "hooks", "brain-push.mjs")}"`, timeout: 60 }] }],
  };
}
I.mergeSettings(settings);
I.installSkill(repo, "golden-rules");

// 4. the vault ---------------------------------------------------------------
if (brain) {
  ask.head("4. Your vault");
  const guess = join(homedir(), "brain");
  if (existsSync(join(process.env.BRAIN_DIR || guess, ".git"))) {
    I.ok(`vault already at ${process.env.BRAIN_DIR || guess}`);
  } else {
    ask.note("The hooks pull your vault when a session starts and push it when one ends.");
    ask.note(`They look in ${guess}, or wherever BRAIN_DIR points.`);
    ask.note("Clone your vault there - a private repo - and it starts syncing. Nothing else to configure.");
    ask.note("No vault yet? Any Obsidian folder with a git remote works; obsidian-mind is one ready-made option.");
  }
}

// 5. optional tools ----------------------------------------------------------
ask.head("5. Optional tools");
ask.note("None of these are required. Each one costs context in every session.");
const tools = [];
if (!auto) {
  if (codemaps && !has("graft") && (await ask.confirm("Install graft? (code wiring map, no model calls, free to run)", true))) tools.push(["npm", ["install", "-g", "@nanonets/graft"], "graft"]);
  if (codemaps && !has("graphify") && has("uv") && (await ask.confirm("Install graphify? (meaning-level code graph, uses a model)", false))) tools.push(["uv", ["tool", "install", "graphifyy"], "graphify"]);
}
for (const [cmd, args, label] of tools) I.run(cmd, args, label);
if (!tools.length) I.skip("no optional tools selected");

// ----------------------------------------------------------------------------
ask.head("Done");
if (I.state.dryRun) ask.note("Dry run - nothing was changed. Run again without --dry-run to apply.");
else {
  ask.note(`${I.state.changed} change(s). Restart Claude Code to pick them up.`);
  ask.note("Inside a repo, run: npx golden-rules project");
}
ask.close();
