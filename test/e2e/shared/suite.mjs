const TEST_TIMEOUT_MS = 5_000

const ACKS = {
  set: '0198f0a8-1357-7c00-8000-000000000001',
  map: '0198f0a8-1357-7c00-8000-000000000002',
  list: '0198f0a8-1357-7c00-8000-000000000003',
  text: '0198f0a8-1357-7c00-8000-000000000004',
  struct: {
    title: '0198f0a8-1357-7c00-8000-000000000005',
    count: '0198f0a8-1357-7c00-8000-000000000006',
  },
}

export async function runFrontierStoreSuite(api, options = {}) {
  const { label = 'runtime', verbose = false } = options
  const results = { label, ok: true, errors: [], tests: [] }
  const { FrontierStore } = api

  function assert(condition, message) {
    if (!condition) throw new Error(message || 'assertion failed')
  }

  function assertEqual(actual, expected, message) {
    if (!Object.is(actual, expected)) {
      throw new Error(message || `expected ${actual} to equal ${expected}`)
    }
  }

  function normalize(value) {
    if (Array.isArray(value)) return value.map(normalize)
    if (!value || typeof value !== 'object') return value
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])])
    )
  }

  function assertJsonEqual(actual, expected, message) {
    const actualJson = JSON.stringify(normalize(actual))
    const expectedJson = JSON.stringify(normalize(expected))
    if (actualJson !== expectedJson) {
      throw new Error(
        message || `expected ${actualJson} to equal ${expectedJson}`
      )
    }
  }

  async function withTimeout(promise, ms, name) {
    let timer
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`timeout after ${ms}ms${name ? `: ${name}` : ''}`))
      }, ms)
    })
    return Promise.race([promise.finally(() => clearTimeout(timer)), timeout])
  }

  async function runTest(name, fn) {
    try {
      if (verbose) console.log(`${label}: ${name}`)
      await withTimeout(Promise.resolve().then(fn), TEST_TIMEOUT_MS, name)
      results.tests.push({ name, ok: true })
    } catch (error) {
      results.ok = false
      results.tests.push({ name, ok: false })
      results.errors.push({ name, message: String(error) })
    }
  }

  await runTest('exports shape', () => {
    assert(typeof FrontierStore === 'function', 'FrontierStore export missing')
  })

  await runTest('empty store reads and serializes as an empty snapshot', () => {
    const store = new FrontierStore()

    assertJsonEqual(store.getFrontiers('set', 'missing'), [])
    assertJsonEqual(store.toJSON(), {})
    assertEqual(store.toString(), '{}')
    assertJsonEqual([...store], [])
    assertJsonEqual(store[Symbol.for('nodejs.util.inspect.custom')](), {})
    assertJsonEqual(store[Symbol.for('Deno.customInspect')](), {})
  })

  await runTest(
    'stores and replaces frontiers by kind target and entity',
    () => {
      const store = new FrontierStore()

      for (const [kind, acknowledgement] of Object.entries(ACKS)) {
        store.setFrontier(kind, 'document-1', 'alice', acknowledgement)
        store.setFrontier(kind, 'document-1', 'bob', acknowledgement)
        store.setFrontier(kind, 'document-2', 'alice', acknowledgement)
      }
      store.setFrontier('set', 'document-1', 'alice', ACKS.map)

      assertJsonEqual(store.getFrontiers('set', 'document-1'), [
        ACKS.map,
        ACKS.set,
      ])
      assertJsonEqual(store.getFrontiers('map', 'document-1'), [
        ACKS.map,
        ACKS.map,
      ])
      assertJsonEqual(store.getFrontiers('text', 'document-2'), [ACKS.text])
      assertJsonEqual(store.getFrontiers('list', 'missing'), [])
    }
  )

  await runTest('deleteFrontier removes entity target and kind entries', () => {
    const store = new FrontierStore()

    store.setFrontier('set', 'document-1', 'alice', ACKS.set)
    store.setFrontier('set', 'document-1', 'bob', ACKS.map)
    store.setFrontier('set', 'document-2', 'alice', ACKS.list)
    store.setFrontier('set', 'document-3', 'alice', ACKS.text)
    store.setFrontier('map', 'document-1', 'alice', ACKS.map)

    store.deleteFrontier('list', 'missing', 'alice')
    store.deleteFrontier('set', 'missing', 'alice')
    store.deleteFrontier('set', 'document-1', 'ghost')
    assertJsonEqual(store.getFrontiers('set', 'document-1'), [
      ACKS.set,
      ACKS.map,
    ])

    store.deleteFrontier('set', 'document-1', 'alice')
    assertJsonEqual(store.getFrontiers('set', 'document-1'), [ACKS.map])

    store.deleteFrontier('set', 'document-1', 'bob')
    assertJsonEqual(store.getFrontiers('set', 'document-1'), [])
    assertJsonEqual(store.getFrontiers('set', 'document-2'), [ACKS.list])

    store.deleteFrontier('set', 'document-2')
    assertJsonEqual(store.getFrontiers('set', 'document-2'), [])
    assertJsonEqual(store.getFrontiers('set', 'document-3'), [ACKS.text])

    store.deleteFrontier('set', 'document-3')

    store.deleteFrontier('map', 'document-1')
    store.setFrontier('text', 'document-1', 'alice', ACKS.text)
    store.deleteFrontier('text', 'document-1', 'alice')
    assertJsonEqual(store.toJSON(), {})
    store.deleteFrontier(false, 'document-1')
    store.deleteFrontier('set', false)
    assertJsonEqual(store.toJSON(), {})
  })

  await runTest('constructor and reads expose the live snapshot model', () => {
    const snapshot = {
      struct: {
        'document-1': {
          alice: { title: ACKS.struct.title },
        },
      },
    }
    const store = new FrontierStore(snapshot)

    snapshot.struct['document-1'].alice.title = 'mutated-before-read'
    assertJsonEqual(store.getFrontiers('struct', 'document-1'), [
      { title: 'mutated-before-read' },
    ])

    const frontiers = store.getFrontiers('struct', 'document-1')
    frontiers[0].title = 'mutated-returned-frontier'
    assertJsonEqual(store.getFrontiers('struct', 'document-1'), [
      { title: 'mutated-returned-frontier' },
    ])

    const json = store.toJSON()
    json.struct['document-1'].alice.title = 'mutated-returned-json'
    assertJsonEqual(store.toJSON(), {
      struct: {
        'document-1': {
          alice: { title: 'mutated-returned-json' },
        },
      },
    })
  })

  await runTest('iteration yields current kind snapshots', () => {
    const store = new FrontierStore()
    store.setFrontier('struct', 'document-1', 'alice', ACKS.struct)

    const entries = [...store]
    assertEqual(entries.length, 1)
    entries[0][1]['document-1'].alice.title = 'mutated-entry'

    assertJsonEqual(store.getFrontiers('struct', 'document-1'), [
      { ...ACKS.struct, title: 'mutated-entry' },
    ])
    assertJsonEqual(JSON.parse(store.toString()), store.toJSON())
  })

  return results
}

export function printResults(results) {
  const passed = results.tests.filter((test) => test.ok).length
  console.log(`${results.label}: ${passed}/${results.tests.length} passed`)
  if (!results.ok) {
    for (const error of results.errors) {
      console.error(`  - ${error.name}: ${error.message}`)
    }
  }
}

export function ensurePassing(results) {
  if (results.ok) return
  throw new Error(
    `${results.label} failed with ${results.errors.length} failing tests`
  )
}
