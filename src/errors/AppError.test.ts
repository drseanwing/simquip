import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  TransientDependencyError,
} from './AppError'

describe('AppError', () => {
  it('sets code, message, and correlationId', () => {
    const err = new AppError('TEST', 'test message', 'corr-123')
    expect(err.code).toBe('TEST')
    expect(err.message).toBe('test message')
    expect(err.correlationId).toBe('corr-123')
    expect(err).toBeInstanceOf(Error)
  })

  it('generates correlationId when not provided', () => {
    const err = new AppError('TEST', 'msg')
    expect(err.correlationId).toBeTruthy()
  })
})

describe('ValidationError', () => {
  it('sets field and code', () => {
    const err = new ValidationError('Name is required', 'name')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.field).toBe('name')
    expect(err.message).toBe('Name is required')
  })
})

describe('NotFoundError', () => {
  it('formats message with entity and id', () => {
    const err = new NotFoundError('Equipment', 'eq-123')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.entity).toBe('Equipment')
    expect(err.id).toBe('eq-123')
    expect(err.message).toContain('Equipment')
    expect(err.message).toContain('eq-123')
  })
})

describe('ConflictError', () => {
  it('sets code correctly', () => {
    const err = new ConflictError('Duplicate entry')
    expect(err.code).toBe('CONFLICT')
  })
})

describe('AuthorizationError', () => {
  it('uses default message', () => {
    const err = new AuthorizationError()
    expect(err.code).toBe('AUTHORIZATION_ERROR')
    expect(err.message).toContain('permission')
  })
})

describe('TransientDependencyError', () => {
  it('is marked as retryable', () => {
    const err = new TransientDependencyError('Service unavailable')
    expect(err.code).toBe('TRANSIENT_DEPENDENCY_ERROR')
    expect(err.retryable).toBe(true)
  })
})
