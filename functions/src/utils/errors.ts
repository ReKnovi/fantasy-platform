/**
 * Marks an error as a client-input problem (→ 400) rather than an
 * unexpected server failure (→ 500, logged). Route handlers check
 * `err instanceof ValidationError` to decide which response/log path to
 * take, instead of matching on error message strings.
 */
export class ValidationError extends Error {}
