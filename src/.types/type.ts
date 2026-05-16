import type {
  CRMapSnapshot,
  CRMapAck,
} from '@sovereignbase/convergent-replicated-map'

import type { CRSetAck } from '@sovereignbase/convergent-replicated-set'

import type { CRListAck } from '@sovereignbase/convergent-replicated-list'

import type { CRTextAck } from '@sovereignbase/convergent-replicated-text'

import type { CRStructAck } from '@sovereignbase/convergent-replicated-struct'

export type AcknowledgedGarbageCollectionFrontier =
  | CRMapAck
  | CRSetAck
  | CRListAck
  | CRTextAck
  | CRStructAck<Record<string, unknown>>
