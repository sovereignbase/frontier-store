export type FrontierStoreErrorCode = 'EXAMPLE_ERROR_CODE'

export class FrontierStoreError extends Error {
  readonly code: FrontierStoreErrorCode

  constructor(code: FrontierStoreErrorCode, message?: string) {
    const detail = message ?? code
    super(`{@sovereignbase/frontier-store} ${detail}`)
    this.code = code
    this.name = 'FrontierStoreError'
  }
}
