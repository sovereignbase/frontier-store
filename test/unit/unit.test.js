import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import test from 'node:test'

import * as api from '../../dist/index.js'
import { ensurePassing, runFrontierStoreSuite } from '../e2e/shared/suite.mjs'

const root = process.cwd()

test('FrontierStore core runtime suite passes', async () => {
  const results = await runFrontierStoreSuite(api, { label: 'unit' })
  ensurePassing(results)
})

test('package root exports FrontierStore and public types only', async () => {
  const mod = await import('../../dist/index.js')

  assert.equal(typeof mod.FrontierStore, 'function')
  assert.deepEqual(Object.keys(mod).sort(), ['FrontierStore'])
})

test('src directories keep the one-root-file unit shape', () => {
  for (const entry of readdirSync(join(root, 'src'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = join(root, 'src', entry.name)
    const rootTsFiles = readdirSync(dir, { withFileTypes: true }).filter(
      (child) => child.isFile() && child.name.endsWith('.ts')
    )
    assert.ok(
      rootTsFiles.length <= 1,
      `${relative(root, dir)} has ${rootTsFiles.length} root TypeScript files`
    )
  }
})
