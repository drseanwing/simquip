import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withRetry } from './retry'
import { TransientDependencyError } from '../errors/AppError'

// Suppress console output during tests
beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('withRetry', () => {
  it('returns the result on first successful call', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await withRetry(fn)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on TransientDependencyError and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TransientDependencyError('Service unavailable'))
      .mockRejectedValueOnce(new TransientDependencyError('Service unavailable'))
      .mockResolvedValue('recovered')

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 })
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after max retries exceeded for transient errors', async () => {
    const transientError = new TransientDependencyError('Still down')
    const fn = vi.fn().mockRejectedValue(transientError)

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow(
      TransientDependencyError,
    )
    // Initial attempt + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does not retry on non-transient errors', async () => {
    const regularError = new Error('Something broke')
    const fn = vi.fn().mockRejectedValue(regularError)

    await expect(withRetry(fn, { maxRetries: 3, baseDelayMs: 1 })).rejects.toThrow(
      'Something broke',
    )
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('uses default options when none provided', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TransientDependencyError('Timeout'))
      .mockResolvedValue('ok')

    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('applies exponential backoff delays', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TransientDependencyError('Retry 1'))
      .mockRejectedValueOnce(new TransientDependencyError('Retry 2'))
      .mockResolvedValue('done')

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    await withRetry(fn, { maxRetries: 3, baseDelayMs: 100 })

    // First retry: 100 * 2^0 = 100ms, Second retry: 100 * 2^1 = 200ms
    const delayCallArgs = setTimeoutSpy.mock.calls
      .filter((call) => typeof call[1] === 'number' && call[1] > 0)
      .map((call) => call[1])

    expect(delayCallArgs).toContain(100)
    expect(delayCallArgs).toContain(200)

    setTimeoutSpy.mockRestore()
  })

  it('retries exactly once with maxRetries=1', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TransientDependencyError('Down'))
      .mockResolvedValue('up')

    const result = await withRetry(fn, { maxRetries: 1, baseDelayMs: 1 })
    expect(result).toBe('up')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
