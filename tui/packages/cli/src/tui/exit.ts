let renderer: { destroy(): void } | null = null;

export function setExitRenderer(r: { destroy(): void }) {
  renderer = r;
}

export function exitApp() {
  renderer?.destroy();
  process.exit(0);
}
