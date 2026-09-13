# Local Supergraph Dev Tool

An Electron app that runs a federated supergraph on your machine. Point any
subgraph at a service running locally instead of the deployed one, and see which
subgraphs are answering.

## Requirements

- Node, the version in `.nvmrc`.
- [rover](https://www.apollographql.com/docs/rover/getting-started), on your
  PATH or installed in its default location.
- An Apollo API key that can read your graph.

## Setup

```bash
cp .env.template .env
```

Fill in `.env`:

- `APOLLO_KEY` — a personal key from studio.apollographql.com.
- `APOLLO_GRAPH_REF` — the graph to run, as `name@variant`.

`.env` is gitignored. Put any credentials your local subgraphs need in it too.

Which variants the header dropdown offers is a setting, not an env var —
open it from the gear icon (Settings -> Variants). Leave nothing checked to
offer every variant on the graph, or check a subset to narrow the list.

## Run

```bash
npm install
npm start
```

The header shows the graph and the variant you are on. The table lists every
subgraph in that variant. Flip a subgraph to local and give it a port to point
the supergraph at your machine. A failing row opens the error behind it.

## Working on the code

`AGENTS.md` says how the code is organised. Install the recommended VS Code
extensions when prompted; `.vscode/` holds the settings the project needs and a
Chrome launch configuration for debugging against `npm start`.
