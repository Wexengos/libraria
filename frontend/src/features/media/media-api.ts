export type MediaCategory = 'films' | 'music' | 'books'

export interface MediaResult {
  category: 'film' | 'music' | 'book'
  externalId: string
  provider: 'tmdb' | 'musicbrainz' | 'openlibrary'
  title: string
  description: string | null
  releaseYear: number | null
  coverImagePath: string | null
  details: Record<string, string | number | null>
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`)
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message ?? 'The catalogue request failed. Please try again.')
  }
  return response.json() as Promise<T>
}

export function searchMedia(category: MediaCategory, query: string) {
  return request<MediaResult[]>(`/${category}/search?q=${encodeURIComponent(query)}`)
}

export function getMedia(category: MediaCategory, id: string) {
  return request<MediaResult>(`/${category}/${encodeURIComponent(id)}`)
}

export function getImageUrl(path: string) {
  return `${apiUrl}${path.replace(/^\/api/, '')}`
}
