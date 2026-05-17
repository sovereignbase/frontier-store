import type { CRMapAck } from '@sovereignbase/convergent-replicated-map'

import type { CRSetAck } from '@sovereignbase/convergent-replicated-set'

import type { CRListAck } from '@sovereignbase/convergent-replicated-list'

import type { CRTextAck } from '@sovereignbase/convergent-replicated-text'

import type { CRStructAck } from '@sovereignbase/convergent-replicated-struct'

export type AcknowledgedGarbageCollectionFrontierMap = {
  set: CRSetAck
  map: CRMapAck
  text: CRTextAck
  list: CRListAck
  struct: CRStructAck<Record<string, unknown>>
}

export type FrontierStoreSnapshot = {
  [K in keyof AcknowledgedGarbageCollectionFrontierMap]?: Record<
    string,
    Record<string, AcknowledgedGarbageCollectionFrontierMap[K]>
  >
}
