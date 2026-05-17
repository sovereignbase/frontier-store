import type { AcknowledgedGarbageCollectionFrontierMap } from '../.types/type.js'

export class FrontierStore {
  private readonly state: Record<
    string,
    [
      keyof AcknowledgedGarbageCollectionFrontierMap,
      AcknowledgedGarbageCollectionFrontierMap[keyof AcknowledgedGarbageCollectionFrontierMap],
    ]
  > = {}
  constructor(snapshot?: FrontierStore['state']) {}

  get<K extends keyof AcknowledgedGarbageCollectionFrontierMap>(
    crdtType: K,
    targetId: string
  ): Array<AcknowledgedGarbageCollectionFrontierMap[K]> {
    return []
  }

  set<K extends keyof AcknowledgedGarbageCollectionFrontierMap>(
    crdtType: K,
    targetId: string,
    acknowledgement: AcknowledgedGarbageCollectionFrontierMap[K],
    acknowledgingEntityId: string
  ): void {
    return
  }
}
