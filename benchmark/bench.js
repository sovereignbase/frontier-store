import { FrontierStore } from '../dist/index.js'

const TARGETS = 200
const ENTITIES = 5
const OPS = 100
const KINDS = ['set', 'map', 'list', 'text', 'struct']

const BENCHMARKS = [
  {
    group: 'class',
    name: 'constructor / hydrate snapshot',
    n: TARGETS,
    ops: OPS,
  },
  { group: 'class', name: 'setFrontier / string ack', n: TARGETS, ops: OPS },
  { group: 'class', name: 'setFrontier / struct ack', n: TARGETS, ops: OPS },
  { group: 'class', name: 'getFrontiers', n: TARGETS, ops: OPS },
  { group: 'class', name: 'deleteFrontier / entity', n: TARGETS, ops: OPS },
  { group: 'class', name: 'deleteFrontier / target', n: TARGETS, ops: OPS },
  { group: 'class', name: 'toJSON', n: TARGETS, ops: OPS },
  { group: 'class', name: 'iterator', n: TARGETS, ops: OPS },
]

function stringAck(index) {
  return `0198f0a8-1357-7c00-8000-${String(index).padStart(12, '0')}`
}

function structAck(index) {
  return {
    title: stringAck(index),
    count: stringAck(index + 1),
  }
}

function createSnapshot(targets = TARGETS) {
  const store = new FrontierStore()
  for (const kind of KINDS) {
    for (let target = 0; target < targets; target++) {
      for (let entity = 0; entity < ENTITIES; entity++) {
        store.setFrontier(
          kind,
          `document-${target}`,
          `entity-${entity}`,
          kind === 'struct'
            ? structAck(target * ENTITIES + entity)
            : stringAck(target * ENTITIES + entity)
        )
      }
    }
  }
  return store.toJSON()
}

function time(fn) {
  const start = process.hrtime.bigint()
  const ops = fn()
  const end = process.hrtime.bigint()
  return { ms: Number(end - start) / 1_000_000, ops }
}

function runBenchmark(definition) {
  switch (`${definition.group}:${definition.name}`) {
    case 'class:constructor / hydrate snapshot': {
      const snapshot = createSnapshot(definition.n)
      return time(() => {
        for (let index = 0; index < definition.ops; index++) {
          new FrontierStore(snapshot)
        }
        return definition.ops
      })
    }
    case 'class:setFrontier / string ack': {
      const store = new FrontierStore(createSnapshot(definition.n))
      return time(() => {
        for (let index = 0; index < definition.ops; index++) {
          store.setFrontier('set', `bench-${index}`, 'entity', stringAck(index))
        }
        return definition.ops
      })
    }
    case 'class:setFrontier / struct ack': {
      const store = new FrontierStore(createSnapshot(definition.n))
      return time(() => {
        for (let index = 0; index < definition.ops; index++) {
          store.setFrontier(
            'struct',
            `bench-${index}`,
            'entity',
            structAck(index)
          )
        }
        return definition.ops
      })
    }
    case 'class:getFrontiers': {
      const store = new FrontierStore(createSnapshot(definition.n))
      return time(() => {
        for (let index = 0; index < definition.ops; index++) {
          store.getFrontiers('set', `document-${index % definition.n}`)
        }
        return definition.ops
      })
    }
    case 'class:deleteFrontier / entity': {
      const stores = Array.from(
        { length: definition.ops },
        () => new FrontierStore(createSnapshot(definition.n))
      )
      return time(() => {
        for (const store of stores) {
          store.deleteFrontier('set', 'document-0', 'entity-0')
        }
        return stores.length
      })
    }
    case 'class:deleteFrontier / target': {
      const stores = Array.from(
        { length: definition.ops },
        () => new FrontierStore(createSnapshot(definition.n))
      )
      return time(() => {
        for (const store of stores) {
          store.deleteFrontier('set', 'document-0')
        }
        return stores.length
      })
    }
    case 'class:toJSON': {
      const store = new FrontierStore(createSnapshot(definition.n))
      return time(() => {
        for (let index = 0; index < definition.ops; index++) store.toJSON()
        return definition.ops
      })
    }
    case 'class:iterator': {
      const store = new FrontierStore(createSnapshot(definition.n))
      return time(() => {
        let count = 0
        for (let index = 0; index < definition.ops; index++) {
          for (const [, targets] of store) count += Object.keys(targets).length
        }
        return count
      })
    }
    default:
      throw new Error(
        `unknown benchmark: ${definition.group}:${definition.name}`
      )
  }
}

function formatNumber(number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    number
  )
}

function pad(value, width) {
  return String(value).padEnd(width, ' ')
}

function printTable(rows) {
  const columns = [
    ['group', (row) => row.group],
    ['scenario', (row) => row.name],
    ['n', (row) => formatNumber(row.n)],
    ['ops', (row) => formatNumber(row.ops)],
    ['ms', (row) => formatNumber(row.ms)],
    ['ms/op', (row) => formatNumber(row.msPerOp)],
    ['ops/sec', (row) => formatNumber(row.opsPerSecond)],
  ]
  const widths = columns.map(([header, getter]) =>
    Math.max(header.length, ...rows.map((row) => getter(row).length))
  )
  console.log(
    columns.map(([header], index) => pad(header, widths[index])).join('  ')
  )
  console.log(widths.map((width) => '-'.repeat(width)).join('  '))
  for (const row of rows) {
    console.log(
      columns
        .map(([, getter], index) => pad(getter(row), widths[index]))
        .join('  ')
    )
  }
}

const rows = BENCHMARKS.map((definition) => {
  const result = runBenchmark(definition)
  return {
    ...definition,
    ops: result.ops,
    ms: result.ms,
    msPerOp: result.ms / result.ops,
    opsPerSecond: result.ops / (result.ms / 1_000),
  }
})

console.log('FrontierStore benchmark')
console.log(
  `node=${process.version} platform=${process.platform} arch=${process.arch}`
)
console.log('')
printTable(rows)
