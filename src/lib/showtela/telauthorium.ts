import type { AuthorshipTrace, AuthorshipSurface } from './types'

export type { AuthorshipTrace, AuthorshipSurface }

export function createAuthorshipTrace(params: {
  author?: string
  surface: AuthorshipSurface
  capturedAt?: string
}): AuthorshipTrace {
  return {
    author: params.author ?? 'unknown',
    surface: params.surface,
    capturedAt: params.capturedAt ?? new Date().toISOString(),
  }
}
