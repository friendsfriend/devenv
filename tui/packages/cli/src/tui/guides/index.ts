export interface Guide {
  key: string;
  title: string;
  description: string;
  import: () => Promise<string>;
}

// ponytail: flat registry, extend by adding entries. Switch to file‑system
// scan if guides ever exceed ~20.
export const guides: Guide[] = [
  {
    key: "config-repository",
    title: "Configuration Repository",
    description: "Share DevEnv config across machines or with a team",
    import: () => import("./config-repository.md").then((m) => m.default),
  },
];

export function getGuide(key: string): Guide | undefined {
  return guides.find((g) => g.key === key);
}
