export interface FileValidationResult {
  valid: boolean
  error?: string
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

const ALLOWED_TYPES = new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_ATTACHMENT_TYPES])

/**
 * Map of MIME types to their expected file extensions.
 * Used to validate that a file's extension matches its declared MIME type.
 */
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Sanitize a filename by removing path separators and special characters.
 * Preserves alphanumeric characters, hyphens, underscores, periods, and spaces.
 */
export function sanitizeFilename(filename: string): string {
  // Strip path separators and directory traversal
  const basename = filename.replace(/^.*[\\/]/, '')

  // Remove special characters, keeping safe ones
  const sanitized = basename.replace(/[^a-zA-Z0-9\-_. ]/g, '')

  // Collapse multiple spaces or dots
  const collapsed = sanitized.replace(/\.{2,}/g, '.').replace(/ {2,}/g, ' ')

  return collapsed.trim() || 'unnamed'
}

/**
 * Validate a file for upload.
 * Checks file size, MIME type, and that the extension matches the declared MIME type.
 */
export function validateUpload(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed size of 10 MB.`,
    }
  }

  // Check MIME type is allowed
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type || 'unknown'}" is not allowed. Accepted types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT.`,
    }
  }

  // Validate MIME type matches extension
  const extension = getExtension(file.name)
  const allowedExtensions = MIME_TO_EXTENSIONS[file.type]
  if (allowedExtensions && extension && !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension "${extension}" does not match the declared type "${file.type}". Expected: ${allowedExtensions.join(', ')}.`,
    }
  }

  return { valid: true }
}
