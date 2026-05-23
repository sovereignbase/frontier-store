import type {
  FrontierStoreEntry,
  FrontierStoreSnapshot,
  AcknowledgedGarbageCollectionFrontierMap,
} from '../.types/type.js'

/**
 * Stores acknowledged garbage-collection frontiers by CRDT kind, CRDT target,
 * and acknowledging entity.
 *
 * A `FrontierStore` collects acknowledgement frontiers emitted by CRDT
 * replicas. Each method receives the CRDT kind so the corresponding frontier
 * type can be inferred for that operation.
 */
export class FrontierStore {
  private readonly state: FrontierStoreSnapshot

  /**
   * Creates a new frontier store.
   *
   * @param snapshot - Optional snapshot used to initialize the store.
   */
  constructor(snapshot?: FrontierStoreSnapshot) {
    this.state = snapshot ?? {}
  }

  /**
   * Returns the acknowledgement frontiers stored for a CRDT target.
   *
   * @typeParam K - CRDT acknowledgement kind used to infer the returned frontier type.
   * @param kind - CRDT acknowledgement kind.
   * @param targetId - Identifier of the CRDT target.
   * @returns The acknowledgement frontiers stored for the target.
   */
  getFrontiers<K extends keyof AcknowledgedGarbageCollectionFrontierMap>(
    kind: K,
    targetId: string
  ): Array<AcknowledgedGarbageCollectionFrontierMap[K]> {
    return Object.values(this.state[kind]?.[targetId] ?? {})
  }

  /**
   * Stores an acknowledgement frontier for an entity and CRDT target.
   *
   * If the target does not exist for the CRDT kind, it is created. If the entity
   * already has a frontier for the target, it is replaced.
   *
   * @typeParam K - CRDT acknowledgement kind used to infer the acknowledgement type.
   * @param kind - CRDT acknowledgement kind.
   * @param targetId - Identifier of the CRDT target.
   * @param entityId - Identifier of the acknowledging entity.
   * @param acknowledgement - Acknowledgement frontier emitted by a CRDT replica.
   */
  setFrontier<K extends keyof AcknowledgedGarbageCollectionFrontierMap>(
    kind: K,
    targetId: string,
    entityId: string,
    acknowledgement: AcknowledgedGarbageCollectionFrontierMap[K]
  ): void {
    this.state[kind] ||= {}
    this.state[kind][targetId] ||= {}
    this.state[kind][targetId][entityId] = acknowledgement
  }

  /**
   * Deletes acknowledgement frontiers from the store.
   *
   * If `entityId` is provided, only that entity's frontier is deleted from the
   * target. If the target becomes empty, the target entry is removed.
   *
   * If `entityId` is omitted, all frontiers for the target are deleted. If the
   * CRDT kind becomes empty, the kind entry is removed.
   *
   * @typeParam K - CRDT acknowledgement kind.
   * @param kind - CRDT acknowledgement kind.
   * @param targetId - Identifier of the CRDT target.
   * @param entityId - Optional identifier of the acknowledging entity.
   */
  deleteFrontier<K extends keyof AcknowledgedGarbageCollectionFrontierMap>(
    kind: K,
    targetId: string,
    entityId?: string
  ): void {
    if (typeof kind !== 'string' || typeof targetId !== 'string') return

    const kindState = this.state[kind]
    if (!kindState) return

    if (typeof entityId === 'string') {
      const targetState = kindState[targetId]
      if (!targetState) return

      delete targetState[entityId]

      if (Object.keys(targetState).length > 0) return

      delete kindState[targetId]

      if (Object.keys(kindState).length > 0) return

      delete this.state[kind]
      return
    }

    delete kindState[targetId]

    if (Object.keys(kindState).length > 0) return

    delete this.state[kind]
  }

  /**
   * Returns the current frontier store snapshot.
   *
   * Called automatically by `JSON.stringify`.
   *
   * @returns The current snapshot.
   */
  toJSON(): FrontierStoreSnapshot {
    return this.state
  }

  /**
   * Return this snapshot as a JSON string.
   */
  toString(): string {
    return JSON.stringify(this)
  }
  /**
   * Returns the Node.js console inspection representation.
   */
  [Symbol.for('nodejs.util.inspect.custom')](): FrontierStoreSnapshot {
    return this.toJSON()
  }
  /**
   * Returns the Deno console inspection representation.
   */
  [Symbol.for('Deno.customInspect')](): FrontierStoreSnapshot {
    return this.toJSON()
  }
  /**
   * Iterates over current entries.
   */
  *[Symbol.iterator](): IterableIterator<FrontierStoreEntry> {
    for (const entry of Object.entries(this.state)) {
      yield entry as FrontierStoreEntry
    }
  }
}
