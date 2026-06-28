import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setActiveThemeName, themeNames } from "@devenv/ui";

const configDir = () => process.env.DEVENV_CONFIG_DIR || path.join(os.homedir(), ".config", "devenv");
const settingsPath = () => path.join(configDir(), "tui.json");

export function loadThemeName(): string {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw) as { theme?: unknown };
    return typeof parsed.theme === "string" && themeNames.includes(parsed.theme) ? parsed.theme : "catppuccin";
  } catch {
    return "catppuccin";
  }
}

export function applyTheme(name: string): boolean {
  return setActiveThemeName(name);
}

export function saveThemeName(name: string) {
  fs.mkdirSync(configDir(), { recursive: true });
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(fs.readFileSync(settingsPath(), "utf8")) as Record<string, unknown>;
  } catch {}
  fs.writeFileSync(settingsPath(), `${JSON.stringify({ ...existing, theme: name }, null, 2)}\n`, "utf8");
}
