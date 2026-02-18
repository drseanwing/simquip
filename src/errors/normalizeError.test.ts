import { describe, it, expect } from 'vitest'
import { normalizeError } from './normalizeError'
import {
  AppError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  TransientDependencyError,
  ValidationError,
} from './AppError'

describe('normalizeError', () => {
  it('returns AppError instances unchanged', () => {
    const original = new ValidationError('bad input', 'name')
    expect(normalizeError(original)).toBe(original)
  })

  it('maps 401 errors to AuthorizationError', () => {
    const err = normalizeError(new Error('HTTP 401 Unauthorized'))
    expect(err).toBeInstanceOf(AuthorizationError)
  })

  it('maps 404 errors to NotFoundError', () => {
    const err = normalizeError(new Error('HTTP 404 Not Found'))
    expect(err).toBeInstanceOf(NotFoundError)
  })

  it('maps 409 errors to ConflictError', () => {
    const err = normalizeError(new Error('HTTP 409 Conflict'))
    expect(err).toBeInstanceOf(ConflictError)
  })

  it('maps 429 errors to TransientDependencyError', () => {
    const err = normalizeError(new Error('HTTP 429 Too Many Requests'))
    expect(err).toBeInstanceOf(TransientDependencyError)
  })

  it('maps unknown errors to AppError', () => {
    const err = normalizeError(new Error('Something went wrong'))
    expect(err).toBeInstanceOf(AppError)
    expect(err.code).toBe('UNKNOWN_ERROR')
  })

  it('handles non-Error values', () => {
    const err = normalizeError('string error')
    expect(err).toBeInstanceOf(AppError)
    expect(err.message).toBe('string error')
  })
})
