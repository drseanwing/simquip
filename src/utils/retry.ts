import { TransientDependencyError } from '../errors/AppError'
import { createLogger } from './logger'

const logger = createLogger('retry')

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
}

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 200

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err

      const isTransient = err instanceof TransientDependencyError
      const isRetryable = attempt < maxRetries && isTransient

      if (!isRetryable) {
        throw err
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt)
      logger.warn(
        `Transient failure, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`,
        {
          correlationId: err instanceof TransientDependencyError ? err.correlationId : undefined,
          attempt: attempt + 1,
          maxRetries,
          delayMs,
        },
      )

      await delay(delayMs)
    }
  }

  // This should not be reachable, but TypeScript needs it for exhaustiveness
  throw lastError
}
