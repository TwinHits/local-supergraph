# Local Supergraph Dev Tool

A desktop toolkit for local development against shared infrastructure. It
contains no project-specific code or values. Each tool reads its targets from
a configuration file that you supply, so the same app works for any team.

## Tools

- **Supergraph**: runs a federated supergraph locally from any Apollo graph
  variant. Point any subgraph at a service on your machine instead of the
  deployed one.
- **Databases**: opens tunnels to databases through AWS Session Manager so
  local clients can connect to them.

## Dependencies

- [Node](https://nodejs.org/en/download)
- [rover](https://www.apollographql.com/docs/rover/getting-started)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

The app checks for these on start up and walks you through anything missing.

## Configuration

Configuration files are gitignored. Each has a committed `.template` copy that
shows its shape. Copy the template and fill in the values for your project.

| File             | Template                  | Used by    |
| ---------------- | ------------------------- | ---------- |
| `.env`           | `.env.template`           | Supergraph |
| `databases.json` | `databases.json.template` | Databases  |

### `.env`

- `APOLLO_KEY`: a personal key from studio.apollographql.com.
- `APOLLO_GRAPH_REF`: the graph to run, as `name@variant`.
- `AWS_REGION`: the region for the Databases tool. Optional, defaults to
  `us-east-1`.

### `databases.json`

Lists each database by name and environment, with the instance to tunnel
through, the host and ports, and the AWS profile to connect with. Set each
`aws_profile` to the matching profile name in your AWS SSO configuration. The
app reads this file on every call, so edits apply without a restart.

## Run

```bash
npm install
npm start
```

## Development

`AGENTS.md` says how the code is organised. Install the recommended VS Code
extensions when prompted; `.vscode/` holds the settings the project needs and a
Chrome launch configuration for debugging against `npm start`.
