import { isDevelopment } from '../config'

export interface LogEntry {
  level: 'info' | 'warn' | 'error'
  message: string
  correlationId?: string
  context?: Record<string, unknown>
  timestamp: string
  module: string
}

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: unknown, context?: Record<string, unknown>): void
}

function formatEntry(entry: LogEntry): string {
  const parts = [`[${entry.timestamp}]`, `[${entry.level.toUpperCase()}]`, `[${entry.module}]`]
  if (entry.correlationId) {
    parts.push(`[${entry.correlationId}]`)
  }
  parts.push(entry.message)
  return parts.join(' ')
}

function buildEntry(
  module: string,
  level: LogEntry['level'],
  message: string,
  context?: Record<string, unknown>,
): LogEntry {
  return {
    level,
    message,
    module,
    timestamp: new Date().toISOString(),
    correlationId: context?.['correlationId'] as string | undefined,
    context,
  }
}

function emit(entry: LogEntry, error?: unknown): void {
  if (isDevelopment()) {
    const formatted = formatEntry(entry)
    switch (entry.level) {
      case 'info':
        console.info(formatted, entry.context ?? '')
        break
      case 'warn':
        console.warn(formatted, entry.context ?? '')
        break
      case 'error':
        console.error(formatted, error ?? '', entry.context ?? '')
        break
    }
  } else {
    // In production, emit structured JSON for log aggregation (e.g. Application Insights)
    const payload = { ...entry, ...(error instanceof Error ? { error: error.message } : {}) }
    switch (entry.level) {
      case 'info':
        console.info(JSON.stringify(payload))
        break
      case 'warn':
        console.warn(JSON.stringify(payload))
        break
      case 'error':
        console.error(JSON.stringify(payload))
        break
    }
  }
}

export function createLogger(module: string): Logger {
  return {
    info(message: string, context?: Record<string, unknown>): void {
      const entry = buildEntry(module, 'info', message, context)
      emit(entry)
    },

    warn(message: string, context?: Record<string, unknown>): void {
      const entry = buildEntry(module, 'warn', message, context)
      emit(entry)
    },

    error(message: string, error?: unknown, context?: Record<string, unknown>): void {
      const entry = buildEntry(module, 'error', message, context)
      emit(entry, error)
    },
  }
}
