import { describe, it, expect } from 'vitest'
import { validateUpload, sanitizeFilename } from './fileValidation'

function createMockFile(name: string, size: number, type: string): File {
  const content = new Uint8Array(size)
  return new File([content], name, { type })
}

describe('validateUpload', () => {
  describe('valid files', () => {
    it('accepts a valid JPEG image', () => {
      const file = createMockFile('photo.jpg', 1024, 'image/jpeg')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts a valid PNG image', () => {
      const file = createMockFile('screenshot.png', 2048, 'image/png')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts a valid GIF image', () => {
      const file = createMockFile('animation.gif', 512, 'image/gif')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts a valid WebP image', () => {
      const file = createMockFile('photo.webp', 1024, 'image/webp')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts a valid PDF attachment', () => {
      const file = createMockFile('manual.pdf', 5000, 'application/pdf')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts a valid DOC attachment', () => {
      const file = createMockFile('report.doc', 3000, 'application/msword')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts a valid DOCX attachment', () => {
      const file = createMockFile(
        'report.docx',
        4000,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      )
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts a valid TXT attachment', () => {
      const file = createMockFile('notes.txt', 100, 'text/plain')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts .jpeg extension for image/jpeg type', () => {
      const file = createMockFile('photo.jpeg', 1024, 'image/jpeg')
      expect(validateUpload(file)).toEqual({ valid: true })
    })
  })

  describe('file size validation', () => {
    it('rejects files exceeding 10 MB', () => {
      const file = createMockFile('huge.jpg', 11 * 1024 * 1024, 'image/jpeg')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('10 MB')
    })

    it('accepts files at exactly 10 MB', () => {
      const file = createMockFile('large.jpg', 10 * 1024 * 1024, 'image/jpeg')
      expect(validateUpload(file)).toEqual({ valid: true })
    })
  })

  describe('MIME type validation', () => {
    it('rejects disallowed MIME types', () => {
      const file = createMockFile('script.js', 100, 'application/javascript')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('rejects executable files', () => {
      const file = createMockFile('app.exe', 1024, 'application/x-msdownload')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('rejects files with empty MIME type', () => {
      const file = createMockFile('unknown', 100, '')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })
  })

  describe('MIME-extension mismatch', () => {
    it('rejects when extension does not match MIME type', () => {
      const file = createMockFile('image.png', 1024, 'image/jpeg')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('does not match')
    })

    it('rejects a .txt file with PDF MIME type', () => {
      const file = createMockFile('document.txt', 500, 'application/pdf')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('does not match')
    })
  })
})

describe('sanitizeFilename', () => {
  it('preserves safe filenames', () => {
    expect(sanitizeFilename('report.pdf')).toBe('report.pdf')
  })

  it('removes path separators', () => {
    expect(sanitizeFilename('/etc/passwd')).toBe('passwd')
    expect(sanitizeFilename('C:\\Windows\\system32\\config')).toBe('config')
  })

  it('removes special characters', () => {
    expect(sanitizeFilename('file<>name|here?.txt')).toBe('filenamehere.txt')
  })

  it('preserves hyphens and underscores', () => {
    expect(sanitizeFilename('my-file_name.txt')).toBe('my-file_name.txt')
  })

  it('collapses multiple dots', () => {
    expect(sanitizeFilename('file...name.txt')).toBe('file.name.txt')
  })

  it('collapses multiple spaces', () => {
    expect(sanitizeFilename('my   file.txt')).toBe('my file.txt')
  })

  it('returns "unnamed" for empty or fully-stripped filenames', () => {
    expect(sanitizeFilename('')).toBe('unnamed')
    expect(sanitizeFilename('<<<>>>')).toBe('unnamed')
  })

  it('handles directory traversal attempts', () => {
    const result = sanitizeFilename('../../etc/passwd')
    expect(result).not.toContain('..')
    expect(result).not.toContain('/')
  })
})
