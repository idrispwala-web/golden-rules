// `golden-rules project [pack...]` - add the base files, and optionally a pack,
// to the repository you are standing in. Never overwrites an existing file.
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as ask from "./ask.mjs";
import * as I from "./install.mjs";

const PACKS = ["data", "n8n", "frontend", "agents"];

function copyMissing(src, dest) {
  if (existsSync(dest)) return I.skip(`${dest} exists`);
  if (!I.state.dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
  }
  I.add(dest);
}

export async function projectInit(repo, packs) {
  const bad = packs.filter((p) => !PACKS.includes(p));
  if (bad.length) {
    I.warn(`unknown pack: ${bad.join(", ")} (valid: ${PACKS.join(" ")})`);
    process.exitCode = 2;
    return;
  }
  if (!existsSync(".git")) {
    I.warn(`not a git repository: ${process.cwd()}`);
    process.exitCode = 1;
    return;
  }

  ask.head(`golden-rules project${packs.length ? ` + ${packs.join(" ")}` : ""}`);
  ask.note(process.cwd());

  copyMissing(join(repo, "packs/base/.gitattributes"), ".gitattributes");
  copyMissing(join(repo, "packs/base/CLAUDE.md"), "CLAUDE.md");
  copyMissing(join(repo, "packs/base/docs/docker-parity.md"), join("docs", "docker-parity.md"));

  // Build output never belongs in history.
  const ignore = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : "";
  for (const pattern of ["graft/", "graphify-out/"]) {
    if (ignore.split(/\r?\n/).includes(pattern)) I.skip(`.gitignore already has ${pattern}`);
    else {
      if (!I.state.dryRun) appendFileSync(".gitignore", `${ignore && !ignore.endsWith("\n") ? "\n" : ""}${pattern}\n`);
      I.add(`.gitignore += ${pattern}`);
    }
  }

  for (const pack of packs) {
    const dir = join(repo, "packs", pack);

    const section = join(dir, "CLAUDE.section.md");
    if (existsSync(section)) {
      const marker = `<!-- golden-rules:${pack} -->`;
      const claude = existsSync("CLAUDE.md") ? readFileSync("CLAUDE.md", "utf8") : "";
      if (claude.includes(marker)) I.skip(`CLAUDE.md already has the ${pack} section`);
      else {
        if (!I.state.dryRun) appendFileSync("CLAUDE.md", `\n${marker}\n${readFileSync(section, "utf8")}`);
        I.add(`CLAUDE.md += ${pack} section`);
      }
    }

    const mcp = join(dir, "mcp.json");
    if (existsSync(mcp)) {
      const incoming = JSON.parse(readFileSync(mcp, "utf8"));
      const current = existsSync(".mcp.json") ? JSON.parse(readFileSync(".mcp.json", "utf8")) : {};
      const servers = { ...(current.mcpServers || {}) };
      const names = Object.keys(incoming.mcpServers);
      if (names.every((n) => n in servers)) I.skip(`.mcp.json already has the ${pack} server`);
      else {
        const merged = { ...current, mcpServers: { ...servers, ...incoming.mcpServers } };
        if (!I.state.dryRun) writeFileSync(".mcp.json", `${JSON.stringify(merged, null, 2)}\n`);
        I.add(`.mcp.json += ${names.join(", ")}`);
      }
      I.warn(`${pack} reads its secrets from environment variables - export them, never commit them`);
    }

    if (pack === "agents") {
      copyMissing(join(dir, "evals/README.md"), join("evals", "README.md"));
      copyMissing(join(dir, "evals/test_evals.py"), join("evals", "test_evals.py"));
      if (!I.state.dryRun) mkdirSync(join("evals", "cases"), { recursive: true });
    }
  }

  ask.say("");
  I.ok("done - fill in the placeholders in CLAUDE.md before asking an agent to work here");
}
