# Working on this project

How this codebase is meant to be organised. Nothing here is specific to it, so
it survives being copied into another repo — read against one, the gap between
this and what is there is the work.

## Organisation

Fold the code into zones by which way dependencies run, and let the folder name
say which zone a file is in.

```
src/
  shared/      imported by every zone, depends on none
  <zone>/      one per process, tier, or side of a boundary
test/          mirrors src/ folder for folder
```

### Group by domain, not by kind of file

`contract/contract.types.ts`, not `types/contract.ts`. Everything about one
subject sits together, and a new subject is one folder. Grouping by kind splits
every subject across two folders and makes a change touch both.

Keep the domain on the filename. A tab called `types.ts` says nothing when three
are open.

### Generic before specific

Reusable pieces live in their own zone, and the test is portability: if you
copied that folder into another project with the same dependencies, it would
work. No domain types, no app state, no feature knowledge.

### One folder per feature

Everything else is grouped by the feature it serves, composed from the generic
zone. Features may reference each other.

A feature holds everything only it needs: its supporting components under
`components/<Name>/`, its hooks, and its pure logic in one `<feature>.utils.ts`.
Those exports are public so they can be unit tested, but nothing outside the
feature imports them — private functions with a test seam.

When a second feature needs the same helper, it moves to `shared/utils/` and
keeps its own name, `<thing>.utils.ts`.

### Wrappers that add an element

A wrapper that puts its child inside a new element makes that element the one
the parent lays out. Layout properties have to move onto the wrapper, or the
child stops obeying the parent it appears to be in.

### A thin entry point

The top-level component wires the parts together and does nothing else. A reader
starts there and can see where to go next.

### Everything is a folder

A component folder holds its markup, its stylesheet, and an `index.ts` that
re-exports the default. Callers import the folder, so the path never stutters
and the component can grow a second file without touching them.

A service folder is named for its domain and holds `<domain>.service.ts`. Its
types and constants land beside it as `<domain>.types.ts` and
`<domain>.constants.ts` when they appear, and nothing has to move.

### Naming

- Name the thing, not the category. A folder called `components/` describes
  every folder in the project; one called `features/` says what is in it.
- Two words for every component, wrappers included. A one-word name is usually
  the category, and it collides with the library type it wraps.
- Never pick a name one character from another name in the same import list.
- A value belongs in one place. If a default is written twice, one of them is
  about to be wrong.

## Boundaries

Folders encapsulate nothing on their own. If a boundary matters, make it a lint
rule.

- The platform or host library may be imported from exactly one folder.
  Everything else stays testable without it.
- A component library may be imported only from the generic zone. A feature that
  needs a control writes a wrapper there first.
- Zones on either side of a process boundary never import each other. Both may
  import `shared/`.
- A global escape hatch is named in one file and nowhere else. Imports rules
  cannot see a global, so restrict the property too.

Write these as disjoint lint scopes. `no-restricted-imports` does not merge
options across configs, so overlapping scopes silently drop a restriction.

## Crossing a process boundary

Describe the whole surface once, as a type, and derive both sides from it.
Anything hand-kept-in-sync will drift, and the drift only shows up at run time.

- Each domain owns its slice. The composed type lists the slices and no
  signatures.
- The runtime half — channel names, keys — is checked against the type, with a
  compile-time assertion that fails when something is missing from it.
- The implementation declares itself against its slice, so a mismatch is
  reported where the code is, not three files away.
- One typed accessor is the only route across. Nothing else names the transport.

Adding a method should touch the type, the runtime list, and the implementation.
Never the wiring.

## Types

- Enums over string unions.
- No casts where a parameter type will do the narrowing. Erasing a type at a
  function boundary is usually enough. If a cast is unavoidable, it lives in one
  place and carries a comment saying what backs it.
- Signatures show the resolved type. Await inside rather than handing back a
  promise.

## Style

- C-style braces. Always.
- No arrow functions outside `filter`, `map` and `reduce`. Named function
  expressions everywhere else.
- No inner functions, except callbacks that must close over something.

## Styling

- Stylesheets, not CSS-in-JS. No `styled()`, no `sx`, no style objects in markup.
- One stylesheet per component, beside it in its folder, named after it.
- BEM names. The block is the component, in camelCase; parts of it are
  `block__element`; variations are `block--modifier`. Scoping already isolates
  the file, so the value is that a class says what it belongs to when you meet
  it in markup or in a devtools inspector.
- Overriding a component library needs a stronger selector than its own. A
  library injects its styles after yours, so equal specificity loses. Add the
  element to the selector and say in a comment why it is there.
- Scoped, not global. In a bundler that means the `.module` infix —
  `Name.module.scss` — which is what makes the import return a class-name object
  instead of leaking the names into the page. Dropping it gives a silent
  undefined lookup, so it is not decoration.
- Colours are written once, in the stylesheets, and reach code from there rather
  than being retyped.
- Themes change colours. Spacing is not themed.
- Names describe the job, not the appearance. Swapping an icon or colour library
  should be a change to one mapping and nothing else.

## Comments

Two kinds only:

1. Doc comments on functions. One sentence, carrying nothing the code already
   says.
2. Explanations of truly unusual behaviour.

Not comments: status notes ("canned until X is wired in"), references to
external documents, or anything restating the line below it.

Nor the story of how the code got here — what a library does, what broke before
this line was written, why one selector beat another. That is temporal: true on
the day it was written, unread later, and wrong once the library changes. A
comment describes the code as it is. If the reasoning is worth keeping, the
place for it is the commit message.

## Tests

- `test/` mirrors `src/`. Naming is `.test.ts` / `.test.tsx`.
- Group `it`s under a `describe` that states a requirement in plain language,
  not an implementation detail. The `describe` titles alone should read as a
  spec of what the app promises — a future agent should be able to skim them
  and know what would break, before reading a single `it`.
- Classical style, expected/actual. Do not mock what you own.
- Pure logic lives apart from the view and is tested by calling it. If answering
  a question needs a rendered component, the logic is in the wrong place.
- Replace the one accessor at a boundary, never the boundary itself.
- Assert the requirement, not the mechanism. If the platform blocks an action,
  test the state that blocks it.

## What may be committed

- No canned or sample data in a service. A service with nothing yet returns
  nothing.
- Nothing in `src/` may reference an ignored path. A fresh clone must build.
- Delete code whose purpose is gone. A module kept alive only by its own test is
  dead.
- An exported symbol with no caller outside its own folder is either dead or in
  the wrong folder.
