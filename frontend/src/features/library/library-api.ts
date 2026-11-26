import { supabase } from '../../lib/supabase'
import type { MediaCategory, MediaResult } from '../media/media-api'

export type LibraryStatus =
  | 'WATCHLIST' | 'WATCHING' | 'WATCHED'
  | 'WANT_TO_LISTEN' | 'LISTENING' | 'LISTENED' | 'OWNED'
  | 'WANT_TO_READ' | 'READING' | 'READ'

export interface LibraryEntry {
  id: string
  status: LibraryStatus
  rating: number | null
  isFavorite: boolean
  notes: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  mediaItem: {
    id: string
    title: string
    type: 'FILM' | 'ALBUM' | 'BOOK'
    description: string | null
    releaseYear: number | null
    coverImageUrl: string | null
    externalIdentifiers: Array<{ provider: MediaResult['provider']; externalId: string }>
    filmDetails: { runtime: number | null; director: string | null; originalLanguage: string | null } | null
    albumDetails: { artist: string | null; trackCount: number | null; releaseDate: string | null } | null
    bookDetails: { author: string | null; pageCount: number | null; publisher: string | null; isbn: string | null } | null
  }
}

export type LibraryCategory = MediaCategory

export const statusOptions: Record<LibraryCategory, Array<{ value: LibraryStatus; label: string }>> = {
  films: [
    { value: 'WATCHLIST', label: 'Want to watch' },
    { value: 'WATCHING', label: 'Watching' },
    { value: 'WATCHED', label: 'Watched' },
  ],
  music: [
    { value: 'WANT_TO_LISTEN', label: 'Want to listen' },
    { value: 'LISTENING', label: 'Listening' },
    { value: 'LISTENED', label: 'Listened' },
    { value: 'OWNED', label: 'Owned' },
  ],
  books: [
    { value: 'WANT_TO_READ', label: 'Want to read' },
    { value: 'READING', label: 'Reading' },
    { value: 'READ', label: 'Read' },
    { value: 'OWNED', label: 'Owned' },
  ],
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function accessToken() {
  if (!supabase) throw new Error('Sign in to manage your library.')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('Your session has expired. Sign in again.')
  return data.session.access_token
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await accessToken()
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
  const responseText = await response.text()
  let payload: unknown = null
  if (responseText) {
    try { payload = JSON.parse(responseText) as unknown } catch { /* Keep the normal request error for non-JSON responses. */ }
  }
  if (!response.ok) {
    const errorPayload = payload as { message?: string } | null
    throw new Error(errorPayload?.message ?? 'Your library request could not be completed.')
  }
  if (response.status === 204) return undefined as T
  return (payload ?? undefined) as T
}

export interface LibraryFilters {
  category?: LibraryCategory
  status?: LibraryStatus | ''
  favorite?: boolean
  sort?: 'addedAt' | 'title' | 'releaseYear' | 'rating'
  direction?: 'asc' | 'desc'
}

export function fetchLibrary(filters: LibraryFilters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.status) params.set('status', filters.status)
  if (filters.favorite !== undefined) params.set('favorite', String(filters.favorite))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.direction) params.set('direction', filters.direction)
  const query = params.size ? `?${params.toString()}` : ''
  return request<LibraryEntry[]>(`/library${query}`)
}

export function fetchLibraryEntry(provider: MediaResult['provider'], externalId: string) {
  return request<LibraryEntry | null>(`/library/item/${encodeURIComponent(provider)}/${encodeURIComponent(externalId)}`).then((entry) => entry ?? null)
}

export function saveLibraryEntry(item: MediaResult, category: LibraryCategory, payload: { status: LibraryStatus; isFavorite: boolean; rating?: number }, entryId?: string) {
  if (entryId) return request<LibraryEntry>(`/library/${entryId}`, { method: 'PATCH', body: payload })
  return request<LibraryEntry>('/library', {
    method: 'POST',
    body: { category, provider: item.provider, externalId: item.externalId, ...payload },
  })
}

export function updateLibraryEntry(id: string, payload: Partial<Pick<LibraryEntry, 'status' | 'isFavorite' | 'rating' | 'notes' | 'startedAt' | 'completedAt'>>) {
  return request<LibraryEntry>(`/library/${id}`, { method: 'PATCH', body: payload })
}

export function removeLibraryEntry(id: string) {
  return request<void>(`/library/${id}`, { method: 'DELETE' })
}
