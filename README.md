[![npm version](https://img.shields.io/npm/v/@sovereignbase/frontier-store)](https://www.npmjs.com/package/@sovereignbase/frontier-store)
[![CI](https://github.com/sovereignbase/frontier-store/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/sovereignbase/frontier-store/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/sovereignbase/frontier-store/branch/master/graph/badge.svg)](https://codecov.io/gh/sovereignbase/frontier-store)
[![license](https://img.shields.io/npm/l/@sovereignbase/frontier-store)](LICENSE)

# frontier-store

A small runtime for storing garbage-collection acknowledgement frontiers for
Sovereignbase CRDT replicas.

- [JSR](https://jsr.io/@sovereignbase/frontier-store)
- [NPM](https://www.npmjs.com/package/@sovereignbase/frontier-store)
- [Typedoc](https://sovereignbase.dev/frontier-store/)

## Compatibility

- Runtimes: Node >= 22, modern browsers, Bun, Deno, Cloudflare Workers, Edge Runtime.
- Module format: ESM + CommonJS.
- Required globals / APIs: none beyond the target JavaScript runtime.
- TypeScript: bundled types.

## Goals

- Keep acknowledgement frontiers separated by CRDT kind, CRDT target, and acknowledging entity.
- Provide the exact frontier arrays expected by `garbageCollect(frontiers)`.
- Support `CRSet`, `CRMap`, `CRList`, `CRText`, and `CRStruct` acknowledgement types.
- Stay storage-adapter-neutral: persist the JSON snapshot wherever the application already stores metadata.
- Keep the runtime small and explicit; callers that need defensive copies can clone snapshots at the storage boundary.

## Installation

```sh
npm install @sovereignbase/frontier-store
# or
pnpm add @sovereignbase/frontier-store
# or
yarn add @sovereignbase/frontier-store
# or
bun add @sovereignbase/frontier-store
# or
deno add jsr:@sovereignbase/frontier-store
# or
vlt install jsr:@sovereignbase/frontier-store
```

## Usage

### Copy-paste example

```ts
import { CRSet } from '@sovereignbase/convergent-replicated-set'
import { FrontierStore } from '@sovereignbase/frontier-store'

const alice = new CRSet<string>()
const bob = new CRSet<string>()
const frontiers = new FrontierStore()

alice.addEventListener('delta', (event) => {
  bob.merge(event.detail)
})

bob.addEventListener('delta', (event) => {
  alice.merge(event.detail)
})

alice.addEventListener('ack', (event) => {
  frontiers.setFrontier('set', 'shopping-list', 'alice', event.detail)
})

bob.addEventListener('ack', (event) => {
  frontiers.setFrontier('set', 'shopping-list', 'bob', event.detail)
})

alice.add('milk')
alice.delete('milk')
bob.add('coffee')

alice.acknowledge()
bob.acknowledge()

const acknowledged = frontiers.getFrontiers('set', 'shopping-list')

alice.garbageCollect(acknowledged)
bob.garbageCollect(acknowledged)
```

### Persisting frontier state

```ts
import { FrontierStore } from '@sovereignbase/frontier-store'

const store = new FrontierStore(
  JSON.parse(localStorage.getItem('frontiers') ?? '{}')
)

store.setFrontier(
  'text',
  'article:homepage',
  'device:laptop',
  '0198f0a8-1357-7c00-8000-000000000001'
)

localStorage.setItem('frontiers', JSON.stringify(store))
```

Snapshots are plain structured-clone-compatible objects:

```ts
type FrontierStoreSnapshot = {
  set?: Record<string, Record<string, CRSetAck>>
  map?: Record<string, Record<string, CRMapAck>>
  list?: Record<string, Record<string, CRListAck>>
  text?: Record<string, Record<string, CRTextAck>>
  struct?: Record<string, Record<string, CRStructAck<Record<string, unknown>>>>
}
```

### Multiple CRDT kinds

```ts
import { FrontierStore } from '@sovereignbase/frontier-store'

const store = new FrontierStore()

store.setFrontier('map', 'profile:alice', 'phone', mapAck)
store.setFrontier('text', 'profile:alice/name', 'phone', textAck)
store.setFrontier('struct', 'profile:alice/settings', 'phone', structAck)

profileMap.garbageCollect(store.getFrontiers('map', 'profile:alice'))
nameText.garbageCollect(store.getFrontiers('text', 'profile:alice/name'))
settingsStruct.garbageCollect(
  store.getFrontiers('struct', 'profile:alice/settings')
)
```

The `kind` and `targetId` are application-level routing keys. Keep them stable
for the lifetime of the CRDT object whose acknowledgements they describe.

### Removing stale entities

```ts
import { FrontierStore } from '@sovereignbase/frontier-store'

const store = new FrontierStore(snapshot)

store.deleteFrontier('set', 'shopping-list', 'old-phone')
store.deleteFrontier('text', 'article:homepage')
```

Passing an `entityId` removes one acknowledging entity. Omitting it removes all
frontiers for the target. Empty target and kind buckets are cleaned up.

## Runtime behavior

### Snapshot semantics

- The constructor uses the provided snapshot as the backing state.
- `setFrontier()` stores the provided acknowledgement value.
- `getFrontiers()` returns the currently stored acknowledgement values.
- `toJSON()`, `JSON.stringify()`, inspection symbols, and iteration expose the current snapshot model.
- `deleteFrontier()` is idempotent for missing kinds, targets, and entities.
- The store does not validate CRDT frontier internals; the corresponding CRDT package remains the authority for accepting or ignoring a frontier.
- Clone snapshots before passing them to or reading them from the store when your application needs mutation isolation.

### Convergence and compaction

- `FrontierStore` does not decide when a CRDT may compact history.
- It records the latest acknowledgement frontier per `(kind, targetId, entityId)`.
- Callers should pass the complete frontier set for the target to that target's `garbageCollect()`.
- A partial frontier set is caller misuse for Sovereignbase CRDTs that require every active replica's acknowledgement before compacting safely.
- Store snapshots can be replicated or persisted independently of the CRDT snapshots they describe.

## Tests

```sh
npm run test
```

The test suite covers:

- Core `FrontierStore` storage, replacement, deletion, cleanup, iteration, inspection, and serialization behavior.
- Snapshot/frontier exposure semantics for constructor input, `getFrontiers()`, `toJSON()`, and iteration.
- ESM and CommonJS package interop through JSON snapshots.
- End-to-end runtime matrix for Node ESM/CJS, Bun ESM/CJS, Deno ESM, Cloudflare Workers ESM, Edge Runtime ESM, and browsers via Playwright.
- Integration with `CRSet`, `CRMap`, `CRList`, `CRText`, and `CRStruct`: collect `ack` events, store them by target/entity, retrieve complete frontier arrays, run `garbageCollect()`, settle replicas, and hydrate snapshots.
- Coverage on built `dist/**/*.js` with `100%` statements, branches, functions, and lines via `c8`.

Current status on Node `v22.14.0` (`win32 x64`): `npm run test` passes.

## Benchmarks

```sh
npm run bench
```

The benchmark suite measures `FrontierStore` orchestration paths:

- constructor hydration
- `setFrontier()` for string and struct acknowledgements
- `getFrontiers()`
- entity and target deletion
- `toJSON()`
- iteration

Last measured on Node `v22.14.0` (`win32 x64`):

| group   | scenario                         |   n |     ops |   ms | ms/op |       ops/sec |
| ------- | -------------------------------- | --: | ------: | ---: | ----: | ------------: |
| `class` | `constructor / hydrate snapshot` | 200 |     100 | 0.06 |  0.00 |  1,675,041.88 |
| `class` | `setFrontier / string ack`       | 200 |     100 | 0.40 |  0.00 |    247,647.35 |
| `class` | `setFrontier / struct ack`       | 200 |     100 | 0.29 |  0.00 |    350,877.19 |
| `class` | `getFrontiers`                   | 200 |     100 | 0.24 |  0.00 |    422,832.98 |
| `class` | `deleteFrontier / entity`        | 200 |     100 | 0.63 |  0.01 |    158,027.81 |
| `class` | `deleteFrontier / target`        | 200 |     100 | 1.22 |  0.01 |     81,913.50 |
| `class` | `toJSON`                         | 200 |     100 | 0.05 |  0.00 |  1,862,197.39 |
| `class` | `iterator`                       | 200 | 100,000 | 5.42 |  0.00 | 18,448,482.61 |

## License

Apache-2.0
