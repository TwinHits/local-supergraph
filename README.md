# Local Supergraph Dev Tool

Runs a federated supergraph locally. Point any subgraph at a service on
your machine instead of the deployed one.

## Dependencies

- [Node](https://nodejs.org/en/download)
- [nvm](https://github.com/nvm-sh/nvm)
- [rover](https://www.apollographql.com/docs/rover/getting-started)

## Environment Variables

```bash
cp .env.template .env
```

- `APOLLO_KEY` — a personal key from studio.apollographql.com.
- `APOLLO_GRAPH_REF` — the graph to run, as `name@variant`.

## Run

```bash
npm install
npm start
```

The header shows the graph and the variant you are on. The table lists every
subgraph in that variant. Flip a subgraph to local and give it a port to point
the supergraph at your machine.

## Development

`AGENTS.md` says how the code is organised. Install the recommended VS Code
extensions when prompted; `.vscode/` holds the settings the project needs and a
Chrome launch configuration for debugging against `npm start`.

## Troubleshooting

`npm start` fails with `nvm: command not found` — `prestart` runs `nvm use`
to switch to the version in `.nvmrc`, which requires `nvm` to be loaded in
the shell npm invokes the script in. If your shell doesn't source `nvm.sh`
non-interactively, load it in your shell profile.
