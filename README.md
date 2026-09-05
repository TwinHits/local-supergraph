# Local Supergraph Dev Tool

An Electron app that runs the federated supergraph on a developer's machine and
points individual subgraphs at local services instead of deployed ones.

## Quick Start

```bash
npm install
npm start
```

## Conventions

- **Stack** — React, TypeScript in strict mode, Vite, Vitest with jsdom, ESLint, Prettier, Husky. Electron on top.
- **Components** — one folder each, with an `index.ts` re-exporting the default. Three tiers: MUI wrappers, composed components, screens. See spec §2.6.
- **Services** — main-process logic lives in plain `.ts` modules behind named interfaces, testable without Electron. See spec §2.3.
- **Imports** — `@/` resolves to `src/`. No relative paths that climb.
- **Tests** — `test/` mirrors `src/` folder for folder, `.spec.tsx` naming.
- **Node** — pinned in `.nvmrc` and `engines`, tracking the active LTS line.
- **Hooks** — `check` on commit, `test:coverage` on push. Raise the coverage thresholds as the project grows.

## Configuration

Every configuration line serves a deliberate purpose. Please do not declare default values, add "just in case" settings, or add settings that might be needed in the future. If a line exists in a config file, it's there because the default behavior wasn't suitable for our specific needs.

## Generated Files

`_generated/` holds every artifact the tool writes: the composed supergraph YAML
per variant, and the cached Studio response. It is gitignored and disposable —
delete it to reset. User settings live outside the repo, in Electron's
`userData`.

## VS Code

Install the recommended extensions when prompted. `.vscode/` holds the settings the project requires and a Chrome launch configuration for debugging against `npm start`; keep personal preferences in your user settings.
