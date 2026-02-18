import {
  AppError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  TransientDependencyError,
} from './AppError'

export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err
  }

  if (err instanceof Error) {
    const message = err.message.toLowerCase()

    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      return new AuthorizationError(err.message)
    }
    if (message.includes('404') || message.includes('not found')) {
      return new NotFoundError('Resource', 'unknown')
    }
    if (message.includes('409') || message.includes('conflict')) {
      return new ConflictError(err.message)
    }
    if (message.includes('429') || message.includes('503') || message.includes('retry')) {
      return new TransientDependencyError(err.message)
    }

    return new AppError('UNKNOWN_ERROR', err.message)
  }

  return new AppError('UNKNOWN_ERROR', String(err))
}
