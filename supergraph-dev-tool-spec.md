# Local Supergraph Dev Tool — Spec

## 1. Purpose

- Electron app. Runs the full federated supergraph on a developer's machine.
- Per subgraph: point the router at a local process, or at the deployed URL.
- Management tool, not a debugger. Surface enough error detail that a broken
  subgraph is obvious, not silent.
- Lists every subgraph in the graph. Expect a large share to be red at any time
  for reasons outside this tool: VPN, creds, a service that is down. Red is the
  normal resting state, not a failure of the tool. Rover starts the supergraph
  with unreachable subgraphs present, so the UI treats red rows as ordinary and
  never blocks on them.
- Bar: a new hire installs it and is productive the same day. Productive means
  running the graph and developing a subgraph against it.
- Platforms: macOS and Windows.
- Install: clone the repo, `npm install`, `npm start`. No installer, no code
  signing, no notarization.

## 2. Architecture

```
Renderer (React)          Main (Node)                 External
------------------        ----------------------      -----------------
new user experience  IPC  Settings   Overrides        Apollo Studio
subgraph table      <-->  Setup      Environment      rover dev process
env panel                 Studio     SupergraphConfig   -> Apollo Router
settings                  Rover      HealthPoller
error modals              Errors     Platform
                          Bridge
```

### 2.1 Stack

- Starting point: `../react-ex`. React 19, TypeScript strict, Vite, Vitest with
  jsdom, ESLint, Prettier, Husky.
- Keep its conventions: `@/` resolves to `src/`, `test/` mirrors `src/`,
  `.test.tsx` naming.
- One file per component. A folder with an `index.ts` is for a component that
  outgrew one file — `@/renderer/components/Button` resolves to `Button.tsx` or
  to `Button/index.ts`, so growing one costs no caller a change. The same rule
  holds for services.
- One addition to the template: `electron`. The template's `dev` script is
  already renamed to `start` here. Once Electron lands, `npm start` builds the
  renderer with Vite and launches Electron. No packaging, no signing.
- Version starts at `1.0.0` in `package.json`.
- Tests are Vitest, matching the template.

### 2.2 Process split

- Renderer is React only. No filesystem, no child processes, no direct network.
- Main owns every service in §2.3.
- Bridge: a preload script with `contextIsolation: true` and
  `nodeIntegration: false`. No local HTTP server — an open port on a dev machine
  is reachable by anything else running there.
- Preload exposes one typed API object per service. The renderer sees interfaces,
  never implementations.

### 2.3 Main services

Each service is a module behind a named interface. No shared mutable state, no
reaching into another service's internals. Each is constructed once at startup
and injected, so each is testable with no Electron running.

Two layers. `Rover` is an adapter — it knows a command-line tool and nothing
about our rules. `Studio` and `SupergraphConfig` are domain services that decide
things. The dependency runs one way: domain calls adapter, never the reverse.

Two rules that shape every signature below.

- No method takes the graph ref or the current variant as an argument. A service
  that needs either asks for it: `Environment` owns the graph ref, `Settings`
  owns `currentVariant`. Passing them around gives one fact two sources, and
  makes it possible to call a method with a variant the app is not on.
- Signatures show the resolved type. Whether a method is async is an
  implementation concern, and an implementation that needs a promise awaits it
  rather than handing one back. Fewer `Promise<T>` in the types, fewer at the
  call sites.

**Settings and setup**

- `Settings` — owns everything the tool stores: `config.json` in `userData`, and
  the `_generated/` folder (§5, §6).
  - `read(): Config`
  - `update(patch: Partial<Config>): Config`
  - `generatedPath(name): FilePath`
  - `readCache(): StudioResponse | null`
  - `writeCache(response): void`
  - `currentVariant(): VariantName` — the one every other service reads
  - `selectVariant(name): void` — the header's switch (§4.0)
  - `reset(): void` — deletes `_generated/`
- `Overrides` — local/remote state, built on `Settings`. Stored per variant
  (§6), read and written for the current one.
  - `read(): Record<SubgraphName, Override>`
  - `write(subgraph, override): void`
  - `delete(subgraph): void`
  - `orphans(knownSubgraphs): SubgraphName[]` — pure. Overrides for subgraphs
    Studio no longer returns.
  - `prune(knownSubgraphs): void` — deletes those overrides. Never runs on its
    own. The developer runs it from the table (§4.2).
- `Setup` — what is missing and what the new user experience must ask.
  - `status(): SetupStatus` — per requirement: satisfied or not.
  - `isComplete(): boolean`
  - `stepsToShow(): NewUserExperienceStep[]` — omits steps whose value already
    exists.

**Environment**

- `Environment` — the single owner of environment data. Reads `process.env` and
  `.env`, writes `.env`, validates, watches, and builds the environment handed to
  child processes. Nothing else touches either source.
  - `requirements(): EnvRequirement[]`
  - `read(): Record<string, string>`
  - `get(key): string | undefined`
  - `write(key, value): void`
  - `delete(key): void`
  - `validate(): EnvVarStatus[]`
  - `graphRef(): GraphRef` — `APOLLO_GRAPH_REF` as written in `.env`, the one
    source of it. Only `Rover` splits the `name@variant` apart.
  - `variants(): VariantName[]` — the `SUPERGRAPH_VARIANTS` list (§4.0)
  - `childEnv(): Record<string, string>` — merged, re-read at call time (§5)
  - `onChange(handler): Unsubscribe`

**Apollo**

- `Studio` — the graph, as domain data. Calls `Rover` to get it, caches through
  `Settings`, and hands back subgraphs. Swapping the CLI for Studio's HTTP API
  later changes this file and nothing above it.
  - `listSubgraphs(): Subgraph[]` — for the current graph ref and variant
- `SupergraphConfig` — decides what the graph should be, and writes it (§5).
  - `compose(subgraphs, overrides): Entry[]` — pure, no IO. Which URL wins for
    each subgraph. The core rule of the whole tool.
  - `write(entries): FilePath`
  - `read(): Entry[]`
  - `delete(): void`
- `Rover` — everything that touches the CLI. The only module that knows rover
  exists.
  - `find(): BinaryPath | null` — PATH first, then `~/.rover/bin`. The installer
    puts it there and only updates PATH for shells opened afterward, so a
    developer who just installed rover fails a PATH-only check.
  - `version(): SemVer | null`
  - `installCommand(): string`
  - `subgraphList(): Subgraph[]` — builds the ref from `Environment` and
    `Settings`, and is the only module that knows the `name@variant` format
  - `start(configFilePath): void`
  - `stop(): void`
  - `status(): ProcessStatus`
  - `parse(line): OutputEvent` — pure
  - `compositionState(): Record<SubgraphName, CompositionStatus>`
  - `recent(subgraph): string[]` — bounded buffer, feeds the raw text in §4.4
  - `onOutput(handler): Unsubscribe`

**Runtime**

- `HealthPoller` — every reason a subgraph is not usable, including port
  problems. A bad or taken port is a failed check, not a separate concept.
  - `start(targets, intervalMs): void`
  - `stop(): void`
  - `checkNow(subgraph): HealthResult`
  - `isValidPort(port): boolean` — pure
  - `portCollisions(ports, routerPort): Collision[]` — pure
  - `portHolder(port): ProcessInfo | null`
  - `onResult(handler): Unsubscribe`
- `Errors` — owns the §7 table. The only place error text lives. Two files:
  `errors.service.ts` holds the matching logic, `errors.config.ts` holds the
  ordered signature list. Adding a signature is an `errors.config.ts` edit and a
  commit. Both are committed to this repo, not generated and not in `userData`.
  - `list(): Signature[]`
  - `match(raw: unknown): Diagnosis` — highest-priority match, or an
    unknown-error diagnosis when nothing hits.
  - `matchAll(raw: unknown): Diagnosis[]` — priority order, for the modal.
  - `raw` is whatever the caller has: a caught error, a probe response, a line
    of rover output. Narrowing it is this service's job, not the caller's. A
    caller that had to shape its failure into a string first would be writing
    half the matcher, and the interesting fields — a status code, the port that
    was refused — would be gone by the time `match` saw them.
  - `describe(key: ErrorKey): Description`
  - `resolution(key: ErrorKey): ResolutionStep[]`
- `Platform` — every macOS/Windows branch, in one file.
  - `portCommand(port): string`
  - `killTree(pid): void` — `taskkill /pid <pid> /t /f` on Windows, a signal to
    the process group on macOS (§2.4)
  - `roverSearchPaths(): FilePath[]`
  - `roverInstallCommand(): string`
- `Bridge` — the IPC boundary. One channel per service method, one place to see
  the whole renderer-visible surface. No business logic.

### 2.4 Shutdown

Rover is not the process that holds the router port. It downloads a router
binary and runs it as a child — `router-v2.17.0.exe` in the spike. Killing rover
by pid leaves that child alive, reparented, still bound to 4041. Verified: a
plain kill on rover left the router serving queries with no rover in sight.

So stopping is three steps, in order.

- **Kill the tree, never the process.** On Windows,
  `taskkill /pid <rover pid> /t /f` — the `/t` is the whole point. On macOS,
  spawn rover with `detached: true` so it leads its own process group, then
  signal the group: `process.kill(-pid, "SIGTERM")`, wait, then
  `process.kill(-pid, "SIGKILL")`. A negative pid is the group. This is why
  `detached` is true — a grouped child cannot be signalled as a group otherwise.
- **Verify by port, not by exit code.** `stop()` is not finished when the signal
  is sent. It is finished when the router port is free. Poll it, with a timeout.
- **Sweep what is left.** If the port is still held after the timeout, ask
  `HealthPoller.portHolder` who has it and kill that pid's tree. This is the
  same code as the startup orphan check below — one mechanism, two callers.

- On `before-quit`: stop the poller, then run the three steps above.
- Same path on `window-all-closed`, on `render-process-gone`, and on `SIGINT` /
  `SIGTERM` to main.
- On startup: check the router port. If an orphan from a previous run holds it,
  name the process and offer to kill it. `detached: true` makes this case more
  likely, not less — the sweep is what covers it.
- Match the router by prefix, `router-v*`. Its version is in the filename, so an
  exact match on `router` finds nothing. That mistake is what left the orphan in
  the spike.

### 2.5 Two health signals

- Reachability — main probes the subgraph URL directly. Answers "can I reach
  this".
- Composition — parsed from rover's output. Answers "did rover accept this into
  the running graph".
- The two disagree in useful ways. A subgraph can answer an HTTP probe and still
  fail composition. Each combination maps to its own row in §7 with its own fix.
- When the two disagree, the row shows whichever signal is closest to the
  developer's machine. Nearest first: a local port they own, then composition,
  which is rover running on their machine, then a remote URL in someone else's
  environment. The nearest signal is the one they can act on.
- A local subgraph that is not running shows red even if rover is happy with the
  published schema. A remote subgraph that is down shows red, but composition
  wins the tooltip if composition also failed.
- A signal that has not reported yet is not a status. Show the nearest signal
  that has reported. Pending means none has. Composition is not a signal at all
  while rover is stopped, so the table reads normally before launch.
- The tooltip names which signal failed.

### 2.6 UI components

- Component library: MUI. Largest ecosystem, dense table and modal support, works
  with Vite and React 19.
- Each MUI control has one wrapper that decides how it looks and behaves —
  `Button`, `TextField`, `Toggle`, `Select`. Size, variant, and error display are
  chosen there and nowhere else.
- Application code and composed components use the wrapper, never re-decide those
  choices.
- The same MUI component may appear in more than one wrapper when it is being
  composed into a different thing rather than restyled. MUI has no number input,
  so `NumberField` builds on our `TextField` and adds numeric rules.
- Generic primitives — `Box`, `Stack`, `Typography` — are ingredients. Use them
  wherever they are needed.
- The test is not how many files import an MUI component. It is how many files
  decide what it looks like. That answer is one.
- Enforce with an ESLint rule: no import from the library outside
  `src/renderer/components/`.
- Our styles are `.scss` files, next to the component that uses them. Not
  `styled()`, not `sx`, not style objects in TSX. A stylesheet is readable
  without running anything, and it keeps rules out of the render path.
- MUI's own styles still come from Emotion, which injects `<style>` tags at
  runtime. That is internal to MUI and not ours to change. It does decide the
  Content-Security-Policy: `style-src` has to admit those tags.

**Tier 1 — MUI wrappers**

One file each, no application logic. Each owns the styling decisions for its
control.

| Wrapper       | Wraps              | Used by                                               |
| ------------- | ------------------ | ----------------------------------------------------- |
| `Button`      | `Button`           | launch, retry, new user experience nav, settings      |
| `IconButton`  | `IconButton`       | refresh, gear, help, stop, copy                       |
| `Icon`        | icon set           | every status, action, and check                       |
| `Tooltip`     | `Tooltip`          | status reasons, every icon button                     |
| `TextField`   | `TextField`        | key, graph ref, search, port                          |
| `Select`      | `Select`           | variant dropdown                                      |
| `Toggle`      | `Switch`           | local/remote per row                                  |
| `Table`       | `Table*` family    | subgraph table                                        |
| `Modal`       | `Dialog`           | error modal, confirmations, new user experience shell |
| `Stepper`     | `Stepper`          | new user experience                                   |
| `Collapsible` | `Collapse`         | env panel, "More info"                                |
| `Spinner`     | `CircularProgress` | fetch step, launch, recompose                         |
| `Link`        | `Link`             | Confluence, certs, Apollo docs                        |
| `Notice`      | `Alert`            | stale data, restart-to-apply                          |
| `Text`        | `Typography`       | all copy                                              |

**Tier 2 — composed components**

Built from Tier 1 wrappers, plus MUI layout primitives where they help.

| Component               | Built from                                                | Used by                                                                 |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `StatusIndicator`       | Icon, Tooltip                                             | table rows, env rows, rover check, launch                               |
| `NumberField`           | TextField                                                 | port, router port                                                       |
| `SearchField`           | TextField, Icon                                           | table filter                                                            |
| `LocalUrlField`         | Text, NumberField                                         | the merged URL cell (§4.2)                                              |
| `IconAction`            | IconButton, Tooltip                                       | refresh, gear, help, stop                                               |
| `CopyCommand`           | Text, IconButton                                          | resolution steps that carry a command                                   |
| `RawOutput`             | Text, Collapsible                                         | error modal, unknown errors                                             |
| `ErrorDetails`          | Text, CopyCommand, RawOutput                              | error modal **and** new user experience fetch failure                   |
| `HelpLinks`             | Link                                                      | new user experience last step **and** the "?" icon                      |
| `SettingField`          | Text, NumberField, Notice                                 | every settings row                                                      |
| `NewUserExperienceStep` | Text, Button, Stepper                                     | every new user experience step                                          |
| `ConfirmModal`          | Modal, Text, Button                                       | clear orphaned overrides (§4.2), kill the port holder on startup (§2.4) |
| `SubgraphRow`           | StatusIndicator, Toggle, LocalUrlField                    | table                                                                   |
| `SubgraphTable`         | Table, SearchField, IconAction, ConfirmModal, SubgraphRow | main screen                                                             |
| `EnvVarRow`             | StatusIndicator, Text                                     | env panel                                                               |
| `LaunchControl`         | Button, Spinner, Icon, IconAction                         | launch button and its running state (§4.5)                              |

- `StatusIndicator` earns its place four times over. One definition of what
  healthy, failed, and pending look like, so the shapes never drift.
- `ErrorDetails` is the reason the new user experience's failed fetch and the
  row error modal look identical. Same keys, same copy, same layout.

**Tier 3 — screens**

Not reusable, assembled from Tier 2: `Header`, `NewUserExperience`, `Settings`,
`EnvPanel`, `ErrorModal`, `App`.

### 2.7 Renderer modules

A file that imports React holds JSX and little else. Components take data and
emit events. Everything else is a plain `.ts` module with no React import, unit
tested by calling it.

- `api` — typed wrapper over the preload bridge. Components never touch
  `window.*` directly, and tests replace this one file.
- `subgraphRows` — pure. Merges the subgraph list, overrides, reachability, and
  composition state into rows for the table.
- `rowStatus` — pure. Turns the two health signals (§2.5) into one status.
- `tableView` — pure. Sorting and search filtering (§4.2).
- `newUserExperienceFlow` — pure. Which steps to show, which are complete, what
  "next" means. Mirrors `Setup` on the main side.
- `portField` — pure. Turns `HealthPoller`'s validation and collision results
  into the message shown under the port input.
- `models` — shared domain types, used on both sides of the bridge.

Hooks hold subscriptions and state, and call these modules. They do not contain
the logic themselves.

## 3. Data Flow

1. Launch: main reads `config.json` (§6) and scans env vars (§4.3).
2. If `APOLLO_KEY` or `APOLLO_GRAPH_REF` is missing from `.env`, stop here and
   run the new user experience from the first step (§4.1). No Studio call until
   it is complete.
3. Main calls Studio for the subgraph list: name, routing URL, last published
   schema. It asks for no variant — `Studio` reads the current one itself. The
   variants offered in the header come from `.env`, not from Studio (§4.0).
4. Main overlays that variant's saved overrides — which subgraphs are local, on
   which port.
5. Overrides for subgraphs Studio no longer returns are kept, not dropped. They
   have no row, since rows come from Studio. The developer clears them with the
   button in §4.2.
6. `HealthPoller` starts as soon as the subgraph list exists. It runs the whole
   time the app is open, whether or not rover is running, so the table shows
   which local services are up before the graph starts.
7. Main writes a per-variant YAML to the gitignored folder (§5).
8. "Start Server": main spawns `rover dev --supergraph-config <file>`.
9. Main pushes reachability and composition results to the renderer over IPC
   (§2.5). Table shows green/red.
10. Variant switch: stop rover, reload that variant's overrides, regenerate the
    file, restart.

## 4. UI

### 4.0 Header — variant selector

- Shows graph ref and variant: `my-graph@current`.
- The dropdown lists a fixed set of variants, not everything Studio returns. The
  team cares about a subset.
- That subset is `SUPERGRAPH_VARIANTS` in `.env`, read at launch. Example:
  `SUPERGRAPH_VARIANTS=current,staging`. Editing the list is a `.env` edit, not
  a UI action.
- `.env.template` lists the key with no value. No variant name, graph name, or
  key is ever committed — the repo stays agnostic about which graph it runs.
- `APOLLO_GRAPH_REF` is listed in `.env.template` the same way, and collected by
  the new user experience (§4.1), which writes it to `.env`. It is not editable
  from the header.
- On switch: refetch subgraphs, load that variant's overrides, regenerate YAML,
  restart rover if running.
- Refresh: an icon next to the selector, tooltip "Refresh from Studio". Refetches
  the current variant's subgraph list. No label text.

### 4.1 New user experience

Runs from the first step when `APOLLO_KEY` or `APOLLO_GRAPH_REF` is missing from
`.env`. Missing either one means this developer is starting from scratch, so
show every step. There is no `hasOnboarded` flag; presence of the data is the
signal. Steps:

1. Welcome — what the tool does. Nothing to fill in.
2. Auth — paste the `APOLLO_KEY`. The tool writes it to `.env` through
   `Environment`. Live validation, same logic as §4.3.
3. Graph ref — enter `APOLLO_GRAPH_REF`. Also written to `.env`.
4. Rover — check for the `rover` binary. Green if found, with the version. If
   missing, show the install command and a "Check again" button. Cannot be
   passed without it, since every later step shells out to rover.
5. Fetch — a spinner while the subgraph list loads, then one of two results.
   Success shows the count and the subgraph names. Failure shows the matched
   cause from §7, its fix, and "Retry". The step cannot be passed until at least
   one subgraph comes back. Back is allowed so the key or graph ref can be
   fixed.
6. Table tour — callouts on the real table pointing at toggle, port, status.
7. Done — highlight "Start Supergraph". Links live here, where someone who is
   already set up will go looking for them: the team Confluence page, the Apollo
   GraphQL certification courses, and the Apollo documentation.

- The same three links sit behind the "?" icon, so they are reachable without
  reopening the new user experience.

- Two ways in. Missing key or graph ref runs every step, in order, from the
  first. Reopening it by hand from the "?" icon shows only the steps whose value
  is still missing — a rover binary that has gone away, a Studio fetch that has
  never succeeded. `Setup.stepsToShow()` (§2.3) decides which case applies.
- A developer with everything set never sees it unless they open it.
- The new user experience asks for nothing that has a sensible default. Router
  port is defaulted and lives in Settings (§4.1a).
- Re-openable from a "?" icon. Re-running never wipes existing config.

### 4.1a Settings

- Gear icon in the top bar, always visible.
- Holds every defaulted setting. Nothing here is asked for during setup.
- Fields and defaults: router port `4041`.
- Writes `roverConfig` in `config.json` (§6).
- Graph ref and the variant list are not here. They come from `.env` (§4.0).
- Hot-applied where rover allows. Otherwise show "restart server to apply"
  (e.g. router port).

### 4.2 Subgraph table

One row per subgraph. Four columns.

| Status | Name       | URL                                     | Local? |
| ------ | ---------- | --------------------------------------- | ------ |
| ●      | `accounts` | `https://accounts.svc.internal/graphql` | off    |
| ▲      | `billing`  | `localhost:` `[4001]`                   | on     |

**Status**

- Shape carries the meaning, color reinforces it. Never color alone — the table
  has to read in greyscale and to a color blind developer.
- Healthy: filled circle, check glyph, green.
- Failed: filled triangle, X glyph, red.
- Pending: hollow circle, grey.
- Draw it large and high contrast. This is the one thing a developer scans for.
- Tooltip: one line, the highest-priority matched error (§7).
- Click: opens the error modal (§4.4).

**URL column**

- Remote: the Studio routing URL, read-only.
- Local: the same cell becomes `localhost:` followed by a port input. The
  `localhost:` prefix is styled exactly like the URL text, so the row does not
  restyle or shift when toggled.
- No separate port column.
- Port input: numeric, 1–65535. Warn on collision with another row or with the
  router port.

**Toggle**

- Switches the row between remote and local.
- Never disabled, including while the graph is running. See §4.2a.

**Table controls**

- Sortable on Status, Name, and Local.
- Search field above the table, filtering on name and URL.
- No "last checked" timestamp. Polling is continuous and stays invisible.
- Clear-orphans icon button, next to the search field. Tooltip "Clear orphaned
  overrides". It calls `Overrides.prune` for the current variant (§2.3).
  - Hidden when `Overrides.orphans` returns nothing, which is most of the time.
  - Click opens a confirmation modal. The modal names every override about to
    go, and says the subgraph is no longer in this variant. Confirm or cancel.
  - Nothing is deleted without that confirmation. An orphan can be a subgraph
    that was renamed, or one that is briefly absent from a bad Studio fetch, and
    a deleted override takes a port number with it.

### 4.2a Toggling while the graph is running

- The developer must never have to stop the graph to move one subgraph local.
- True hot reload, confirmed on rover 0.41.0. Rewrite the variant YAML and
  `rover dev` picks it up on its own file watch: it logs
  `supergraph.yaml changed. Applying changes to the session.`, drops or adds the
  subgraph, and recomposes. No restart, no dropped router.
- A subgraph whose new URL is unreachable is removed from the session and the
  rest recomposes. Pointing it back at a live URL adds it again. Both directions
  were exercised in the spike.
- Main never restarts rover to move one subgraph. Restart stays for the variant
  switch (§3) and for a router port change (§4.1a).
- The UI behaves the same either way. The row switches instantly and the launch
  control drops back to its loading circle until the graph is back, then to the
  green checkmark. No status sentence, here or anywhere else (§4.5). The
  developer sees a reload, not a stop and start.

### 4.3 Env var panel

- Collapsible. The required keys come from `.env.template`, committed to this
  repo: `APOLLO_KEY`, `APOLLO_GRAPH_REF`, `SUPERGRAPH_VARIANTS`, plus any creds
  subgraphs need. Adding a requirement is a commit.
- The template carries keys and comments only. Every value is empty. Values live
  in the developer's own `.env`, which is gitignored (§4.0).
- Green check if set. Format-check where possible (e.g. `APOLLO_KEY` prefix).
- Red X with a one-line fix if missing.
- `APOLLO_KEY` and `APOLLO_GRAPH_REF` are Apollo's canonical names. Use them
  exactly. Rover reads them from its own environment with no mapping.
- Re-read from `process.env` and `.env`. Never copied into `config.json`.
- Refresh eagerly, not once at launch. Another terminal, another tool, or a hand
  edit can change `.env` while the app is open:
  - Watch `.env` and re-scan on write.
  - Re-scan when the window regains focus.
  - Re-read immediately before every rover spawn, so a running process is never
    started from a stale value.
- A change updates the panel, and the header if the graph ref changed. A changed
  key or graph ref invalidates the cached Studio fetch and refetches.
- `.env` is the only place secrets live, and it is gitignored. `Environment`
  (§2.3) is the only writer — used by the new user experience's paste step and
  nothing else.

### 4.4 Error modal

- Header: subgraph name and the URL that was tried.
- Known error — the matched key's description and resolution steps come first.
  The raw error sits behind "More info", collapsed.
- Unknown error — the raw output shows first, since it is all there is. With it:
  a line saying this error is not recognized, and a link to the Confluence page
  that says who to ask.
- Copy button only where a signature actually defines a command. Most will not.
- One error at a time. When more than one signature matched (§7), the modal
  shows the highest-priority one first and a pair of arrows steps through the
  rest in priority order. A counter says where you are: `2 of 4`.
- Back is disabled on the first error — nothing sits before it — and lights up
  once you are past it.
- Next never disables. On the last error it wraps to the first, so the arrows
  keep working rather than dead-ending on a screen with no way forward.
- With one match there are no arrows and no counter.
- Stepping through changes the error shown. It does not reorder them, and it
  does not change which error the row's tooltip and status use — that stays the
  highest-priority match (§2.5).
- "Retry" reloads the graph. It is the §4.2a path and nothing else: hot reload if
  the pinned rover watches the config file, a background restart dressed as one
  if it does not. Same behavior as flipping a toggle, so there is one reload path
  in the app, not two.
- The button belongs to the modal, not to `ErrorDetails`. The new user
  experience reuses `ErrorDetails` on its fetch step, where retrying means
  running the fetch again — a different action behind the same word.

### 4.5 Launch button

- A normal button: "Start Supergraph". Size and placement decided during build.
- Disabled only until the new user experience is complete — `APOLLO_KEY` and
  `APOLLO_GRAPH_REF` present. In practice it is never disabled, since the app
  opens the new user experience when they are missing.
- Subgraph health never gates it. Starting a graph with red rows is normal (§1).
- On click: write YAML, spawn rover. The button shows a loading circle, which
  becomes a green checkmark when the router is up.
- Running state: the router address and a Stop control. No sentences.
- Rover output is parsed for composition status (§2.5) and error keys (§7). It
  is not shown raw in v1 — see §8.

## 5. Rover Integration

- Rover manages the router only. It never starts or owns a subgraph process.
- Subgraph servers are started by the developer however they normally do it:
  VS Code debugger, terminal, docker-compose. The tool never launches or
  supervises them.
- No committed `rover.yaml` or `supergraph.yaml`. Reading a repo's config file
  would tie the tool to one repo's conventions.
- The graph comes from Studio, the overrides come from us:
  1. Write `_generated/supergraph.<variant>.yaml` holding only the subgraphs the
     developer moved local. A subgraph with no override is not in the file.
  2. Spawn `rover dev` with both the graph ref and that file.
- The invocation, confirmed on rover 0.41.0 against a real graph:

  ```
  rover dev --graph-ref <name>@<variant> --supergraph-config <file> --supergraph-port <router port>
  ```

- `--graph-ref` pulls every subgraph from the registry. `--supergraph-config`
  replaces the ones it names. Verified: a config naming one subgraph, against a
  variant whose other URLs do not resolve, composed and served, with the named
  subgraph polled on localhost.
- This is why a red row does not block anything (§1). A subgraph's schema comes
  from the registry, so composition never introspects it. An unreachable
  subgraph is a query-time error and nothing more.
- Reaching an unreachable subgraph gives one shape, whatever the cause:

  ```json
  {
    "errors": [
      {
        "extensions": {
          "code": "SUBREQUEST_HTTP_ERROR",
          "service": "characters",
          "reason": "HTTP fetch failed from 'characters': dns error"
        }
      }
    ]
  }
  ```

  `reason` is `dns error` for a remote host and `tcp connect error` for a dead
  local port. `service` names the subgraph, so `Errors` needs no parsing (§7).

- `rover subgraph list --format json` is the table's source of remote URLs.
  stdout is pure JSON, chatter goes to stderr:

  ```json
  {
    "json_version": "1",
    "data": {
      "subgraphs": [
        {
          "name": "planets",
          "url": "http://localhost:4003/",
          "updated_at": { "utc": "..." }
        }
      ],
      "success": true
    },
    "error": null
  }
  ```

- A bad key fails the same way, typed. `error.code` is `E004` on a 401, which is
  the whole of `APOLLO_KEY_INVALID` (§7) — no string matching.

- Rover downloads two plugins on first run — the supergraph binary for the
  `federation_version` in the config, and a router. Both land in `~/.rover/bin`.
  A first launch on a new machine is slow and needs the network; later ones are
  not. Show the loading circle and do not treat the wait as a failure.
- `APOLLO_ELV2_LICENSE=accept` goes in the child environment. Without it rover
  prompts for the router license on a terminal that is not there, and hangs.
- `federation_version` is pinned in the generated config. Leaving it out lets
  the plugin version drift between developers.
- `_generated/` holds every generated artifact and lives in the tool's own repo
  directory, not in `userData` and not in any other project. Deleting it is the
  reset button.
- `_generated/` is in this repo's committed `.gitignore`. The tool never edits a
  `.gitignore`.
- Generated files are disposable. Rewritten on every launch and variant switch.
- Rover needs `APOLLO_KEY` in its own environment. Main reads `.env` and passes
  the merged environment into every rover spawn. The developer never exports
  anything in their shell.
- Use `rover dev`, not `rover supergraph compose` plus a hand-run router binary.
  It handles hot recomposition and is the supported local path. Confirmed in the
  spike: one `rover dev` process ran a three-subgraph session and served the
  composed graph, with no Studio credentials in play.
- Refetch from Studio every launch, plus a manual refresh (§4.0), so a subgraph
  another team added shows up on its own.
- Cache the last good Studio response to `_generated/studio.<variant>.json`. If
  Studio is unreachable, open with cached data, clearly labeled stale.

## 6. Persisted Config

- Platforms: macOS and Windows.
- `userData` holds user settings only. Generated artifacts and cached remote data
  go to `_generated/` in the repo (§5).
- Owner: main process. File: `<userData>/config.json`, via `electron-store`.
  `app.getPath("userData")` resolves it per platform — no path logic of our own:
  - macOS: `~/Library/Application Support/<AppName>/config.json`
  - Windows: `%APPDATA%\<AppName>\config.json`
- Reason: the main process is what writes YAML and spawns rover. `localStorage`
  is renderer-scoped, unreadable from main, wiped by a cache clear, and not
  atomic on write.
- Renderer reads and writes it over IPC.
- `localStorage` is for throwaway UI state only: column widths, sort order, the
  search box contents.
- Never stored: env vars, secrets, tokens. Re-read live per §4.3. If a token ever
  must persist, use `safeStorage`, not this file.

- Setup completeness is inferred from data — `APOLLO_KEY` and
  `APOLLO_GRAPH_REF` in `.env`. Either one missing starts the new user
  experience from scratch (§4.1). No `hasOnboarded` flag.
- Graph ref and variant list are not in this file. They live in `.env` (§4.0).

```jsonc
{
  "currentVariant": "current",
  "roverConfig": {
    "routerPort": 4041,
  },
  "subgraphOverrides": {
    "current": {
      "accounts": { "local": true, "port": 4001 },
      "billing": { "local": false },
    },
    "staging": {
      "accounts": { "local": false },
      "billing": { "local": true, "port": 4002 },
    },
  },
}
```

- The cached Studio fetch is not here. It is remote data, not a user setting, so
  it lives in `_generated/studio.<variant>.json` (§5). Deleting `_generated/`
  clears it.

- `subgraphOverrides` is keyed by variant. A subgraph can be local under
  `staging` and remote under `current`.

## 7. Error Signatures

Owned by the `Errors` service (§2.3). Checked against each health-check result
and rover's stderr. Drives the tooltip and the modal (§4.4).

- Every known error has a **key**. The key maps to a description and to
  resolution steps. Nothing else in the app writes error copy.
- A signature may define a copy-paste command. Most will not. Only include one
  when a real command helps.
- Unknown errors get their own treatment: say it is unrecognized, show the raw
  output, and link the Confluence page that says who to ask. No guessing.
- Commands are per platform. Port inspection is `lsof -i :<port>` on macOS and
  `netstat -ano | findstr :<port>` on Windows. The signature holds both; the
  `Errors` service returns the one for the running platform.

Priority order, highest first.

| Key                        | Symptom                                   | Cause                                          | Resolution                                               |
| -------------------------- | ----------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| `APOLLO_KEY_INVALID`       | 401/403 from Studio                       | Key invalid or expired                         | Regenerate at studio.apollographql.com                   |
| `AWS_SSO_EXPIRED`          | Subgraph cannot boot, AWS creds stale     | Expired SSO session                            | `aws sso login --profile <profile>` (command)            |
| `PORT_IN_USE`              | Router or subgraph port already bound     | Another process holds it                       | Name the process, pick another port or kill it (command) |
| `COMPOSITION_FAILED`       | Rover rejected the schema                 | Local schema diverged from the published one   | Show rover's error verbatim, link schema-checks docs     |
| `COMPOSED_BUT_UNREACHABLE` | Rover accepted it, probe fails            | Running on a published schema, service is down | Start the local service                                  |
| `LOCAL_REFUSED`            | `ECONNREFUSED` on a local port            | Service not running, or wrong port             | Check the port (command)                                 |
| `REMOTE_UNREACHABLE`       | `ECONNREFUSED` or timeout on a remote URL | VPN down, or the environment is down           | Check VPN, link the status page                          |
| `UNKNOWN`                  | Nothing matched                           | —                                              | Show raw output, link the Confluence page for who to ask |

- Lives in `errors.config.ts` so the team can add signatures. `errors.service.ts`
  holds the matching logic and no copy (§2.3).
- Each signature has a key and a priority. The file is an ordered list — first
  match wins.
- A signature says what shape it reads and tests it. A status code for
  `APOLLO_KEY_INVALID`, an error code and port for `LOCAL_REFUSED`, a substring
  for anything that only ever arrives as rover output. Callers hand over the
  failure as they got it (§2.3) — no signature depends on someone else having
  flattened it to text first, and the port a signature needs for its command is
  still there when `resolution()` builds it.
- Several signatures can match one failure. The tooltip and the row status show
  the highest-priority one. The modal steps through the rest (§4.4).
- Priority is authored, not computed. Put the root cause above its symptoms: an
  expired `APOLLO_KEY` outranks the connection errors it causes.
- Scope stops at "what broke" and "the one-line fix". No trace inspection, no log
  tailing.

## 8. Not in v1

- Log drawer — collapsible panel streaming raw rover stdout/stderr, with search
  and copy. v1 parses that output but never displays it raw; the error modal
  (§4.4) shows the matched error only.
- DB tunnel launcher — one-click SSH tunnel or SSM port-forward to a shared dev
  DB, with its own status row.
- AWS SSO login button — detect an expired session, offer to run
  `aws sso login --profile <profile>`.
- Per-subgraph health queries — a `subgraph-health.config.json` committed with
  each subgraph defining its own check. Fall back to the generic check when
  absent.
- Apollo certification check — read the developer's certification status and show
  which courses they have finished, next to the course links. Needs a way to
  query it; Apollo may not expose one, so scope this only after checking.
- Local schema drift detection — watch a local subgraph's schema, compare it to
  the variant's published schema, and flag when a local change breaks
  composition. Show which change broke it and which other subgraphs it affects.
  v1 only surfaces the composition error rover already reports (§7).

## 9. Open Questions

Two are settled. The spike ran rover 0.41.0 against three local subgraphs in
`fixtures/`, in the tool's own repo.

- ~~Can `rover dev` run the multi-subgraph session this tool needs?~~ Yes. One
  process, three subgraphs, composed and served (§5).
- ~~Does the pinned `rover dev` watch the supergraph config file?~~ Yes. Real hot
  reload, both adding and removing a subgraph (§4.2a).

~~No real supergraph exists in Studio yet.~~ Tested against a live graph with
four variants.

~~Does `rover dev --graph-ref` let the config override one subgraph?~~ Yes. §5
is rewritten around it, and the generated file now holds only the overrides.

Still open.

- Composition status per subgraph. `Rover.compositionState` (§2.3) assumes
  rover's output names which subgraphs composed. What it actually prints is a
  single `composing supergraph` line and errors when one fails. Watch a real
  composition failure before committing to the two-signal model in §2.5.
