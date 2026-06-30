#!/usr/bin/env bun

/**
 * DevEnv Build Script
 * Builds self-contained TUI binaries with embedded Go server
 */

import { $ } from "bun";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

function patchOpenTUISolidTransform(tuiDir: string) {
	// Work around Bun 1.3.14 loading @opentui/solid/preload before build script code runs.
	// babel-plugin-module-resolver is CommonJS and may not expose synthetic default.
	const candidates = [
		path.join(tuiDir, "node_modules/@opentui/solid/scripts/solid-transform.js"),
		...Array.from(new Bun.Glob("node_modules/.bun/@opentui+solid@*/node_modules/@opentui/solid/scripts/solid-transform.js").scanSync({ cwd: tuiDir })).map((p) => path.join(tuiDir, p)),
	];
	const cjsHeader = 'import { transformAsync } from "@babel/core";\n// @ts-expect-error - Types not important.\nimport ts from "@babel/preset-typescript";\nimport { createRequire } from "module";\nconst require = createRequire(import.meta.url);\n// @ts-expect-error - Types not important.\nconst moduleResolver = require("babel-plugin-module-resolver");\n// @ts-expect-error - Types not important.\nimport solid from "babel-preset-solid";';
	for (const file of candidates) {
		if (!fs.existsSync(file)) continue;
		const source = fs.readFileSync(file, "utf8");
		const marker = "const nodeModulesPattern";
		const markerIndex = source.indexOf(marker);
		if (markerIndex < 0) continue;
		fs.writeFileSync(file, cjsHeader + "\n" + source.slice(markerIndex));
	}
}

console.log("Building DevEnv...");
console.log("");

// Parse arguments
const args = process.argv.slice(2);

try {
	// Clean dist directory
	console.log("🧹 Cleaning dist directory...");
	await $`rm -rf ${rootDir}/dist`;
	await $`mkdir -p ${rootDir}/dist/tui`;

	console.log("─".repeat(50));

	const tuiDir = path.join(rootDir, "tui");

	console.log("📦 Running bun install...");
	await $`cd ${tuiDir} && bun install --force`;
	patchOpenTUISolidTransform(tuiDir);

	console.log("");
	console.log(
		"Building self-contained TUI binaries (with embedded Go server)...",
	);

	// Build TUI (compiles Go server + bundles TypeScript into self-contained binaries).
	// Temporarily hide tui/bunfig.toml so @opentui/solid/preload does not run before build patching.
	const buildArgs = args.includes("--single") ? ["--single"] : [];
	const bunfigPath = path.join(tuiDir, "bunfig.toml");
	const bunfigTmpPath = path.join(tuiDir, ".bunfig.toml.devenv-build-tmp");
	if (fs.existsSync(bunfigPath)) fs.renameSync(bunfigPath, bunfigTmpPath);
	try {
		await $`cd ${tuiDir} && bun run scripts/build.ts ${buildArgs}`;
	} finally {
		if (fs.existsSync(bunfigTmpPath)) fs.renameSync(bunfigTmpPath, bunfigPath);
	}

	// Copy TUI dist to root dist
	await $`cp -r ${tuiDir}/dist/* ${rootDir}/dist/tui/`;

	console.log("TUI binaries built successfully (with embedded Go server)");

	console.log("");
	console.log("Build complete!");
	console.log("");
	console.log("Output:");
	console.log("  Self-contained binaries: dist/tui/");
	console.log("");
	await $`ls -d ${rootDir}/dist/tui/devenv-*`;
	console.log("");
	console.log("Each binary includes both the Go server and TypeScript TUI.");
	console.log("Run with: ./dist/tui/devenv-<platform>-<arch>/bin/devenv");
} catch (error) {
	console.error("");
	console.error("Build failed:");
	console.error(error);
	process.exit(1);
}
