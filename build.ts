#!/usr/bin/env bun

/**
 * DevEnv Build Script
 * Builds self-contained TUI binaries with embedded Go server
 */

import { $ } from "bun";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

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
	await $`cd ${tuiDir} && bun install`;

	console.log("");
	console.log(
		"Building self-contained TUI binaries (with embedded Go server)...",
	);

	// Build TUI (compiles Go server + bundles TypeScript into self-contained binaries)
	const buildArgs = args.includes("--single") ? ["--single"] : [];
	await $`cd ${tuiDir} && bun run scripts/build.ts ${buildArgs}`;

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
