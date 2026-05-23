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

export type AcknowledgedGarbageCollectionFrontierKind =
  keyof AcknowledgedGarbageCollectionFrontierMap

export type AcknowledgedGarbageCollectionFrontier<
  K extends AcknowledgedGarbageCollectionFrontierKind,
> = AcknowledgedGarbageCollectionFrontierMap[K]

export type AcknowledgedGarbageCollectionFrontierTargetSnapshot<
  K extends AcknowledgedGarbageCollectionFrontierKind,
> = Record<string, AcknowledgedGarbageCollectionFrontier<K>>

export type AcknowledgedGarbageCollectionFrontierKindSnapshot<
  K extends AcknowledgedGarbageCollectionFrontierKind,
> = Record<string, AcknowledgedGarbageCollectionFrontierTargetSnapshot<K>>

export type FrontierStoreSnapshot = {
  [K in AcknowledgedGarbageCollectionFrontierKind]?: AcknowledgedGarbageCollectionFrontierKindSnapshot<K>
}

export type FrontierStoreEntry = {
  [K in AcknowledgedGarbageCollectionFrontierKind]: [
    K,
    AcknowledgedGarbageCollectionFrontierKindSnapshot<K>,
  ]
}[AcknowledgedGarbageCollectionFrontierKind]
