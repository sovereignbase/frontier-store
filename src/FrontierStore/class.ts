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

  get(
    acknowledgmentType: keyof AcknowledgedGarbageCollectionFrontierMap,
    acknowledgingEntityId: string,
    garbageCollectionTargetId: string
  ) {
    this
  }

  set(
    acknowledgement: AcknowledgedGarbageCollectionFrontierMap[keyof AcknowledgedGarbageCollectionFrontierMap],
    acknowledgmentType: keyof AcknowledgedGarbageCollectionFrontierMap,
    acknowledgingEntityId: string,
    acknowledgementTargetId: string
  ) {
    this.state[acknowledgementTargetId] = [acknowledgmentType, acknowledgement]
  }
}
