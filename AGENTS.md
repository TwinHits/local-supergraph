# Working on this project

These rules set how the code is organised and written. None of them are
specific to this project, so they work the same when copied into another repo.

## Organisation

Split the code into zones by the direction of their dependencies. The folder
name tells you which zone a file is in.

```
src/
  shared/      imported by every zone, imports no zone
  <zone>/      one per process, tier, or side of a boundary
test/          mirrors src/ folder for folder
```

### Group by domain

Put everything about one subject in one folder: `contract/contract.types.ts`.
A new subject is a new folder, and a change to a subject touches one folder.

Keep the domain in the file name. Three open tabs called `types.ts` are
indistinguishable.

### Generic zone

Reusable code lives in its own zone, the generic zone. Code belongs there if
its folder works unchanged in another project with the same dependencies. It
holds no domain types, app state or feature logic.

Before writing a component, hook or helper, look in the generic zone first.
If something close exists, add a prop or a parameter to it.

### Features

All other code is grouped by the feature it serves, built from the generic
zone. A feature may use another feature.

A feature folder holds everything only that feature needs:

- supporting components in `components/<Name>/`
- hooks
- pure logic in one `<feature>.utils.ts`

These are exported so tests can import them. Only the feature and its tests
import them.

When a second feature needs a helper, move the helper to the zone's `utils/`
folder as `<thing>.utils.ts`. If both sides of a boundary need it, move it to
`shared/utils/`. When a second feature needs a component, move the component
to the generic zone.

### Entry point

The top-level component wires the parts together and does nothing else. A
reader starts there and sees where to go next.

### Wrappers

A wrapper that puts its child inside a new element changes which element the
parent lays out. Move the child's layout properties onto the wrapper.

### Naming

- Name the thing. `features/` says what a folder holds; `components/` fits
  every folder in the project.
- Give every component a two-word name, wrappers included. One-word names are
  usually a category, and they collide with the library type being wrapped.
- Keep names in the same import list at least two characters apart.
- Spell words out: `environment`, `response`, `index`. Names fixed by a
  library or the platform are the exception.
- Start event props with `on`: `onSelect`. Name the function passed to one
  for what it does: `selectRow`.
- Write each value once. A default written in two places will drift.

## Components

```
<Name>/
  <Name>.tsx           the component
  <Name>.module.scss   its styles, if any
  <Name>.types.ts      enums and types callers need, if any
  <Name>.constants.ts  values another file needs, if any
  index.ts             export { default } from "./<Name>";
```

Callers import the folder. The component can then add files without changing
any caller.

`<Name>.tsx` contains, in this order:

1. Imports
2. Constants
3. A `<Name>Props` type, unexported
4. One default-exported function with a doc comment

Destructure props in the function signature. Set each optional prop's default
once, at the top of the function, with `??`.

A generic component defines its own enums for its props. It maps them to the
library's values in one `Record` inside the component.

A feature's top-level component calls the feature's hooks and passes data down
as props. Supporting components get everything through props and callbacks.

## Hooks

Name a hook `use<Thing>.ts`, put it beside the component that uses it, and
export it by name. The hook runs effects, polls, and calls across the
boundary. It returns one plain object.

Put sorting, filtering and other data decisions in the feature's
`<feature>.utils.ts`. Tests then call them directly, without rendering.

Name every effect function. An effect that starts a timer or listener returns
a function that stops it.

## Services

```
<domain>/
  <domain>.service.ts     the service
  <domain>.types.ts       its types, if any
  <domain>.constants.ts   its constants, if any
  <domain>.utils.ts       its pure logic, if any
```

`<domain>.service.ts` contains, in this order:

1. Imports
2. Constants
3. State
4. Private functions
5. One exported object, typed as the domain's contract

```ts
export const <domain>: <DomainContract> = {
  methodOne,
  methodTwo,
};
```

The object is the only export of the contract methods. Export another function
by name only when another service calls it.

- Each library, program or file belongs to one service. Other code goes
  through that service, so replacing or faking it changes one file.
- Logic that runs without that library, program or file goes in
  `<domain>.utils.ts`, where tests call it directly.
- Errors stay on their own side of the boundary, because a thrown error loses
  its type in transit. Return a value that describes the outcome, or record
  the error where the other side reads it.
- A config file people edit by hand is gitignored, with a committed
  `.template` copy. Read it on every call, so edits apply without a restart.
  Treat a missing or malformed entry as absent.

## Boundaries

A folder enforces nothing. Enforce each boundary that matters with a lint
rule.

- Import the platform or host library from one folder only. Everything else
  stays testable without it.
- Import the component library from the generic zone only. A feature that
  needs a control gets a wrapper in the generic zone first.
- Zones on opposite sides of a process boundary never import each other.
  Both import `shared/`.
- Name a global escape hatch in one file. Import rules miss globals, so
  restrict the property as well.

Give each lint rule its own file scope, with no overlap.
`no-restricted-imports` replaces its options between configs, so an
overlapping scope drops a restriction without warning.

## Crossing a process boundary

Describe everything that crosses the boundary once, as a TypeScript type
called the contract. Derive both sides from it. Code kept in sync by hand
drifts, and the drift only shows at run time.

- Each domain defines its part of the contract in
  `shared/<domain>/<domain>.contract.ts`, with its types beside it in
  `<domain>.types.ts`. The full contract lists each domain's part and nothing
  else.
- Only plain data crosses: objects, arrays, strings, numbers, booleans, `null`
  and enums. Classes, functions, `Date`, `Map` and `Set` lose their type in
  transit, while the type still claims them.
- The runtime list of channel names is checked against the contract by a
  compile-time assertion that fails when a method is missing.
- Each service declares itself against its domain's contract, so a mismatch
  is reported in the service.
- One typed accessor is the only route across. It is the only code that names
  the transport.

Adding a method changes three things: the contract, the channel list and the
service.

## Types

- Use enums for fixed sets of values.
- Let a parameter type do the narrowing. If a cast is unavoidable, keep it in
  one place, with a comment saying what guarantees it.
- Await inside a function and return the resolved type.

## Style

- Use C-style braces on every block.
- Use arrow functions only inside `filter`, `map` and `reduce`. Use named
  function expressions everywhere else.
- Define inner functions only for callbacks that close over local values.

## Styling

- Write styles in stylesheets. Markup carries class names only: no `styled()`,
  `sx` or style objects.
- Give each component one stylesheet, in its folder, named after it.
- Use BEM class names. The block is the component name in camelCase. Parts are
  `block__element`. Variations are `block--modifier`. A class then names its
  owner wherever you see it, in markup or in the browser inspector.
- Name stylesheets `<Name>.module.scss`. The `.module` part scopes the class
  names and makes the import return them as an object. Without it, every
  lookup returns `undefined` with no error.
- To override the component library, add the element to the selector and
  comment why. The library loads its styles after yours, so a selector of
  equal specificity loses.
- Define each colour once, in a stylesheet. Code reads colours from there.
- Themes change colours only. Spacing stays the same in every theme.
- Name classes, colours and icons by their job. Swapping an icon or colour
  library then changes one mapping.

## Comments

Write two kinds of comment:

1. A one-sentence doc comment on each function, adding what the code does not
   already say.
2. An explanation of unusual behaviour.

Leave out status notes, links to external documents, and restatements of the
next line. Leave out history too: what a library used to do, what broke
before, why one approach beat another. History is true on the day it is
written and wrong after the next change. Put reasoning worth keeping in the
commit message.

## Tests

- Mirror `src/` in `test/`. Name files `.test.ts` or `.test.tsx`.
- Group tests under a `describe` that states a requirement in plain language.
  Reading only the `describe` titles tells a reader what the app promises and
  what a change could break.
- Write each `it` as a sentence describing one behaviour.
- Use the classical style with expected and actual values. Use real
  implementations of your own code.
- Keep pure logic out of components and test it by calling it. Logic that
  needs a rendered component to test belongs in a utils file.
- At a boundary, replace the typed accessor and leave the boundary itself
  alone.
- Assert the requirement. If the platform blocks an action, test the state
  that blocks it.
- Exclude a file from coverage only if it is boundary wiring with no logic,
  with a comment on its first line saying why.
- Ratchet coverage thresholds. When coverage rises, raise the thresholds to
  match. Never lower them.

## Done

A change is done when formatting, lint, type checks and tests pass, including
coverage. The commit hooks run these checks. Let them run.

## What may be committed

- A service returns only real data. With nothing to return, it returns an
  empty result.
- Code in `src/` references tracked paths only. A fresh clone must build.
- Delete code whose purpose is gone. A module used only by its own test is
  dead.
- Every exported symbol has a caller outside its own folder. A feature's
  exports for its tests are the exception. Any other export is dead or in the
  wrong folder.
