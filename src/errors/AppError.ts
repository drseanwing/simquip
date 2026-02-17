export class AppError extends Error {
  readonly code: string
  readonly correlationId: string

  constructor(code: string, message: string, correlationId?: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.correlationId = correlationId ?? crypto.randomUUID()
  }
}

export class ValidationError extends AppError {
  readonly field?: string

  constructor(message: string, field?: string, correlationId?: string) {
    super('VALIDATION_ERROR', message, correlationId)
    this.name = 'ValidationError'
    this.field = field
  }
}

export class NotFoundError extends AppError {
  readonly entity: string
  readonly id: string

  constructor(entity: string, id: string, correlationId?: string) {
    super('NOT_FOUND', `${entity} with id '${id}' not found`, correlationId)
    this.name = 'NotFoundError'
    this.entity = entity
    this.id = id
  }
}

export class ConflictError extends AppError {
  constructor(message: string, correlationId?: string) {
    super('CONFLICT', message, correlationId)
    this.name = 'ConflictError'
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = 'You do not have permission to perform this action',
    correlationId?: string,
  ) {
    super('AUTHORIZATION_ERROR', message, correlationId)
    this.name = 'AuthorizationError'
  }
}

export class TransientDependencyError extends AppError {
  readonly retryable: boolean

  constructor(message: string, correlationId?: string) {
    super('TRANSIENT_DEPENDENCY_ERROR', message, correlationId)
    this.name = 'TransientDependencyError'
    this.retryable = true
  }
}
