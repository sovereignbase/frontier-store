import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

import { CRList } from '@sovereignbase/convergent-replicated-list'
import { CRMap } from '@sovereignbase/convergent-replicated-map'
import { CRSet } from '@sovereignbase/convergent-replicated-set'
import { CRStruct } from '@sovereignbase/convergent-replicated-struct'
import { CRText } from '@sovereignbase/convergent-replicated-text'
import * as esmApi from '../../dist/index.js'

const require = createRequire(import.meta.url)
const cjsApi = require('../../dist/index.cjs')

function readAck(replica) {
  let ack
  replica.addEventListener(
    'ack',
    (event) => {
      ack = event.detail
    },
    { once: true }
  )
  assert.equal(replica.acknowledge(), undefined)
  assert.notEqual(ack, undefined)
  return ack
}

function settle(left, right) {
  left.merge(right.toJSON())
  right.merge(left.toJSON())
}

const cases = [
  {
    kind: 'set',
    create: (snapshot) => new CRSet(snapshot),
    mutate(replica) {
      replica.add({ id: 'alpha' })
      replica.delete({ id: 'alpha' })
      replica.add({ id: 'beta' })
    },
    project: (replica) =>
      replica
        .values()
        .map((value) => JSON.stringify(value))
        .sort(),
  },
  {
    kind: 'map',
    create: (snapshot) => new CRMap(snapshot),
    mutate(replica) {
      replica.set('title', 'draft')
      replica.delete('title')
      replica.set('title', 'published')
    },
    project: (replica) =>
      replica.entries().sort(([left], [right]) => left.localeCompare(right)),
  },
  {
    kind: 'list',
    create: (snapshot) => new CRList(snapshot),
    mutate(replica) {
      replica.append('draft')
      replica.remove(0)
      replica.append('published')
    },
    project: (replica) => [...replica],
  },
  {
    kind: 'text',
    create: (snapshot) => new CRText(snapshot),
    mutate(replica) {
      replica.insertAfter(-1, 'draft')
      replica.removeAfter(0, replica.size)
      replica.insertAfter(-1, 'published')
    },
    project: (replica) => replica.valueOf(),
  },
  {
    kind: 'struct',
    create: (snapshot) => new CRStruct({ title: '', count: 0 }, snapshot),
    mutate(replica) {
      replica.title = 'draft'
      replica.title = 'published'
      replica.count = 1
      replica.count = 2
    },
    project: (replica) => replica.clone(),
  },
]

test('FrontierStore supplies complete acknowledgement sets to every Sovereignbase CRDT garbage collector', () => {
  for (const { kind, create, mutate, project } of cases) {
    const store = new esmApi.FrontierStore()
    const alice = create()
    mutate(alice)
    const bob = create(alice.toJSON())

    settle(alice, bob)
    store.setFrontier(kind, 'document-1', 'alice', readAck(alice))
    store.setFrontier(kind, 'document-1', 'bob', readAck(bob))

    const frontiers = store.getFrontiers(kind, 'document-1')
    assert.equal(frontiers.length, 2, `${kind} frontier count`)

    const beforeAlice = project(alice)
    const beforeBob = project(bob)
    alice.garbageCollect(frontiers)
    bob.garbageCollect(frontiers)
    settle(alice, bob)

    assert.deepEqual(project(alice), beforeAlice, `${kind} alice projection`)
    assert.deepEqual(project(bob), beforeBob, `${kind} bob projection`)
    assert.deepEqual(
      project(create(alice.toJSON())),
      beforeAlice,
      `${kind} hydrate`
    )
  }
})

test('frontier snapshots interoperate between ESM and CommonJS builds', () => {
  const esm = new esmApi.FrontierStore()
  esm.setFrontier('set', 'document-1', 'alice', 'frontier-a')
  esm.setFrontier('struct', 'document-1', 'alice', { title: 'frontier-b' })

  const cjs = new cjsApi.FrontierStore(esm.toJSON())
  cjs.setFrontier('set', 'document-1', 'bob', 'frontier-c')

  assert.deepEqual(cjs.getFrontiers('set', 'document-1'), [
    'frontier-a',
    'frontier-c',
  ])
  assert.deepEqual(cjs.getFrontiers('struct', 'document-1'), [
    { title: 'frontier-b' },
  ])
})

test('JSON cloned snapshots roundtrip across package builds', () => {
  const source = new esmApi.FrontierStore()
  source.setFrontier('map', 'document-1', 'alice', 'frontier-a')
  source.setFrontier('map', 'document-1', 'bob', 'frontier-b')

  const snapshot = JSON.parse(JSON.stringify(source))
  const restored = new cjsApi.FrontierStore(snapshot)

  assert.deepEqual(restored.toJSON(), source.toJSON())
})
