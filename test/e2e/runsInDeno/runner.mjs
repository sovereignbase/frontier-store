import * as api from '../../../dist/index.js'
import {
  ensurePassing,
  printResults,
  runFrontierStoreSuite,
} from '../shared/suite.mjs'

const results = await runFrontierStoreSuite(api, { label: 'deno esm' })
printResults(results)
ensurePassing(results)
