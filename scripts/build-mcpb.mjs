#!/usr/bin/env node
/**
 * Build the Claude Desktop extension bundle (.mcpb) for this server.
 *
 * Steps:
 *   1. Sync manifest.json with package.json (version) and src/tools (tool list)
 *   2. Validate the manifest with the mcpb CLI
 *   3. Stage a production-only copy of the server in build/mcpb/
 *   4. Pack it into release/<name>-<version>.mcpb
 *
 * Run through `npm run build:mcpb`, which compiles TypeScript first.
 * No arguments. Exits non-zero on the first failure.
 */

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const manifestPath = join(root, "manifest.json");
const stagingDir = join(root, "build", "mcpb");
const releaseDir = join(root, "release");
const outFile = join(releaseDir, `${pkg.name}-${pkg.version}.mcpb`);

// Files copied verbatim into the staging directory. dist/ is copied as a tree.
// package.json must ship: dist/index.js reads its version at startup.
// icon.png is referenced by manifest.json ("icon") and must sit next to it.
const stagedFiles = ["manifest.json", "package.json", "package-lock.json", "LICENSE", "icon.png", ".mcpbignore"];

function fail(message) {
  console.error(`[build-mcpb] ${message}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (result.error) fail(`${cmd} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${cmd} ${args.join(" ")} exited with ${result.status ?? result.signal}`);
}

function mcpbCliPath() {
  const mcpbPkgPath = join(root, "node_modules", "@anthropic-ai", "mcpb", "package.json");
  if (!existsSync(mcpbPkgPath)) fail("@anthropic-ai/mcpb is not installed; run npm install first");
  const mcpbPkg = JSON.parse(readFileSync(mcpbPkgPath, "utf8"));
  const bin = typeof mcpbPkg.bin === "string" ? mcpbPkg.bin : mcpbPkg.bin.mcpb;
  return join(dirname(mcpbPkgPath), bin);
}

/** First paragraph of a tool description, collapsed to one line and capped. */
function summarise(description) {
  let text = description.trim().split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  text = text.replace(/\s+[\u2013\u2014]\s+/g, ": ");
  if (text.length > 160) {
    const sentence = text.match(/^(.{20,160}?[.!?])(\s|$)/);
    text = sentence ? sentence[1] : `${text.slice(0, 157).trimEnd()}...`;
  }
  return text;
}

/**
 * Every registerTool call in src/tools, in the order the modules are imported
 * by src/index.ts. Throws if a module has registrations the pattern missed, so
 * a new tool written in a different shape cannot silently drop out of the manifest.
 */
function collectTools() {
  const indexSrc = readFileSync(join(root, "src", "index.ts"), "utf8");
  const modules = [...indexSrc.matchAll(/from\s+"\.\/tools\/([a-z0-9-]+)\.js"/g)].map((m) => m[1]);
  if (modules.length === 0) fail("no tool modules found in src/index.ts");

  const pattern =
    /registerTool\(\s*"([a-z0-9_]+)"\s*,\s*\{\s*title:\s*"[^"]*"\s*,\s*description:\s*`([\s\S]*?)`/g;
  const tools = [];
  const seen = new Set();

  for (const mod of modules) {
    const src = readFileSync(join(root, "src", "tools", `${mod}.ts`), "utf8");
    const registrations = (src.match(/registerTool\(/g) ?? []).length;
    let parsed = 0;
    for (const match of src.matchAll(pattern)) {
      parsed += 1;
      const [, name, description] = match;
      if (seen.has(name)) fail(`duplicate tool name ${name} in ${mod}.ts`);
      seen.add(name);
      tools.push({ name, description: summarise(description) });
    }
    if (parsed !== registrations) {
      fail(`${mod}.ts has ${registrations} registerTool calls but ${parsed} matched the expected shape`);
    }
  }
  return tools;
}

// 1. Sync manifest.json from package.json and the tool sources
if (!existsSync(manifestPath)) fail("manifest.json not found at repo root");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const tools = collectTools();
manifest.version = pkg.version;
manifest.tools = tools;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[build-mcpb] manifest.json synced: version ${pkg.version}, ${tools.length} tools`);

// 2. Validate
const mcpb = mcpbCliPath();
run(process.execPath, [mcpb, "validate", manifestPath]);

// 3. Stage a production-only tree
if (!existsSync(join(root, "dist", "index.js"))) fail("dist/index.js is missing; run npm run build first");
rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });
for (const file of stagedFiles) {
  const src = join(root, file);
  if (!existsSync(src)) fail(`${file} is missing from the repo root`);
  cpSync(src, join(stagingDir, file));
}
cpSync(join(root, "dist"), join(stagingDir, "dist"), { recursive: true });

// npm ci needs no path arguments, so the shell fallback on Windows is safe
// even when the checkout lives under a path with spaces.
const isWindows = process.platform === "win32";
run(isWindows ? "npm.cmd" : "npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
  cwd: stagingDir,
  shell: isWindows,
});

// 4. Pack
mkdirSync(releaseDir, { recursive: true });
rmSync(outFile, { force: true });
run(process.execPath, [mcpb, "pack", stagingDir, outFile]);

const megabytes = (statSync(outFile).size / (1024 * 1024)).toFixed(1);
console.log(`[build-mcpb] wrote ${relative(root, outFile)} (${megabytes} MB)`);
