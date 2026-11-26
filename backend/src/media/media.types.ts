export type MediaCategory = 'film' | 'music' | 'book'

export interface MediaSearchResult {
  category: MediaCategory
  externalId: string
  provider: 'tmdb' | 'musicbrainz' | 'openlibrary'
  title: string
  description: string | null
  releaseYear: number | null
  coverImagePath: string | null
  details: Record<string, string | number | null>
}

export interface MediaProvider {
  search(query: string): Promise<MediaSearchResult[]>
  get(externalId: string): Promise<MediaSearchResult>
}
