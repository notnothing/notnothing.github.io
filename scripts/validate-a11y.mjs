import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const baseUrl = "http://127.0.0.1:4173";
const pages = [
  "/",
  "/contact.html",
  "/marketplace/marketplace.html",
  "/books/aesthetics.html",
  "/books/anthology.html",
  "/books/elmorado.html",
  "/books/lavento.html",
  "/books/lookhowgoodyouare.html",
  "/books/surrogation.html",
  "/books/trilce.html",
  "/books/warmfeelings.html",
];

const pa11yBin = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "pa11y.cmd" : "pa11y",
);

if (!existsSync(pa11yBin)) {
  console.error("pa11y is not installed. Run `bun install` first.");
  process.exit(1);
}

let failures = 0;

for (const page of pages) {
  const url = `${baseUrl}${page}`;
  console.log(`\npa11y ${url}`);
  const result = await run(pa11yBin, ["--config", "pa11y.json", url]);
  if (result !== 0) {
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`\nAccessibility validation failed for ${failures} page(s).`);
  process.exit(1);
}

console.log("\nAccessibility validation passed.");

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("close", resolve);
  });
}
