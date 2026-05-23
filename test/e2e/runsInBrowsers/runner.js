import * as api from '/dist/index.js'
import { printResults, runFrontierStoreSuite } from '../shared/suite.mjs'

const results = await runFrontierStoreSuite(api, { label: 'browser esm' })
printResults(results)
window.__FRONTIER_STORE_RESULTS__ = results
const status = document.getElementById('status')
if (status)
  status.textContent = results.ok ? 'ok' : 'failed: ' + results.errors.length
