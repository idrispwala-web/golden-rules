// Tiny prompt helpers. No dependencies on purpose: this package is installed
// globally, so every dependency is supply-chain surface for everyone who uses it.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const bold = (s) => `\u001b[1m${s}\u001b[0m`;
const dim = (s) => `\u001b[2m${s}\u001b[0m`;

export const say = (s = "") => console.log(s);
export const head = (s) => console.log(`\n${bold(s)}`);
export const note = (s) => console.log(dim(`  ${s}`));

let rl = null;
let closed = false;
const io = () => {
  rl ??= createInterface({ input: stdin, output: stdout });
  rl.once("close", () => (closed = true));
  return rl;
};

// readline rejects once the input stream ends. A half-finished wizard must fall
// back to its defaults rather than crash, so every question funnels through here.
async function askOnce(prompt, fallback) {
  if (closed) return null;
  try {
    return await io().question(prompt);
  } catch {
    closed = true;
    return null;
  }
}
export const close = () => {
  rl?.close();
  rl = null;
};

export const interactive = () => stdin.isTTY === true;

export async function confirm(question, fallback = true) {
  if (!interactive()) return fallback;
  const hint = fallback ? "Y/n" : "y/N";
  const raw = await askOnce(`  ${question} ${dim(`[${hint}]`)} `, fallback);
  if (raw === null) return fallback;
  const a = raw.trim().toLowerCase();
  if (a === "") return fallback;
  return a === "y" || a === "yes";
}

export async function choose(question, options, fallbackIndex = 0) {
  if (!interactive()) return options[fallbackIndex].value;
  say(`  ${question}`);
  options.forEach((o, i) => say(`    ${dim(`${i + 1})`)} ${o.label}${o.hint ? dim(` - ${o.hint}`) : ""}`));
  for (;;) {
    const raw = await askOnce(`  choose 1-${options.length} ${dim(`[${fallbackIndex + 1}]`)} `, null);
    if (raw === null) return options[fallbackIndex].value;
    const a = raw.trim();
    if (a === "") return options[fallbackIndex].value;
    const n = Number(a);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1].value;
  }
}

export async function text(question, fallback = "") {
  if (!interactive()) return fallback;
  const raw = await askOnce(`  ${question}${fallback ? dim(` [${fallback}]`) : ""} `, fallback);
  return (raw ?? "").trim() || fallback;
}
