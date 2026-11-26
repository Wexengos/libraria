import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { MediaCacheService } from './media-cache.service.js'
import type { MediaCategory, MediaProvider, MediaSearchResult } from './media.types.js'

const SEARCH_CACHE_MS = 5 * 60_000
const DETAIL_CACHE_MS = 30 * 60_000
const REQUEST_TIMEOUT_MS = 12_000

function yearFrom(value?: string | null): number | null {
  const match = value?.match(/^(\d{4})/)
  return match ? Number(match[1]) : null
}

function imagePath(provider: string, id: string): string {
  return `/api/images/${provider}/${encodeURIComponent(id)}`
}

@Injectable()
export class MediaProvidersService {
  private readonly logger = new Logger(MediaProvidersService.name)
  private lastMusicBrainzRequest = 0
  private musicBrainzQueue: Promise<void> = Promise.resolve()
  private lastOpenLibraryRequest = 0
  private openLibraryQueue: Promise<void> = Promise.resolve()

  constructor(private readonly cache: MediaCacheService) {}

  search(category: MediaCategory, query: string) {
    const providers: Record<MediaCategory, MediaProvider> = {
      film: { search: (q) => this.searchFilms(q), get: (id) => this.getFilm(id) },
      music: { search: (q) => this.searchMusic(q), get: (id) => this.getMusic(id) },
      book: { search: (q) => this.searchBooks(q), get: (id) => this.getBook(id) },
    }
    const normalized = query.trim()
    if (normalized.length < 2) return Promise.resolve([])
    if (normalized.length > 120) throw new BadRequestException('Search terms must be 120 characters or fewer.')
    return providers[category].search(normalized)
  }

  get(category: MediaCategory, externalId: string) {
    const providers: Record<MediaCategory, MediaProvider> = {
      film: { search: (q) => this.searchFilms(q), get: (id) => this.getFilm(id) },
      music: { search: (q) => this.searchMusic(q), get: (id) => this.getMusic(id) },
      book: { search: (q) => this.searchBooks(q), get: (id) => this.getBook(id) },
    }
    return providers[category].get(externalId)
  }

  async image(provider: string, id: string): Promise<{ body: ArrayBuffer; contentType: string }> {
    let url: string
    if (provider === 'tmdb') {
      const path = decodeURIComponent(id)
      if (!/^\/[A-Za-z0-9_./-]+$/.test(path) || path.includes('..')) throw new BadRequestException('Invalid image path.')
      url = `https://image.tmdb.org/t/p/w500${path}`
    } else if (provider === 'openlibrary') {
      if (!/^\d{1,12}$/.test(id)) throw new BadRequestException('Invalid cover identifier.')
      url = `https://covers.openlibrary.org/b/id/${id}-M.jpg`
    } else if (provider === 'coverart') {
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Invalid MusicBrainz identifier.')
      url = `https://coverartarchive.org/release-group/${id}/front-250`
    } else {
      throw new BadRequestException('Unknown image provider.')
    }

    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    if (!response.ok) throw new ServiceUnavailableException('Cover image is not available.')
    const contentType = response.headers.get('content-type') ?? 'image/jpeg'
    if (!contentType.startsWith('image/')) throw new BadGatewayException('Image provider returned an invalid response.')
    return { body: await response.arrayBuffer(), contentType }
  }

  private async fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
      if (!response.ok) {
        if (response.status === 404) throw new NotFoundException('The requested item was not found at its provider.')
        throw new Error(`Provider returned HTTP ${response.status}`)
      }
      return await response.json() as T
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ServiceUnavailableException) throw error
      this.logger.warn(`Metadata provider request failed: ${error instanceof Error ? error.message : 'unknown error'}`)
      throw new BadGatewayException('A metadata provider is temporarily unavailable.')
    }
  }

  private async searchFilms(query: string): Promise<MediaSearchResult[]> {
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN?.trim()
    const apiKey = process.env.TMDB_API_KEY?.trim()
    if (!token && !apiKey) throw new ServiceUnavailableException('Film search is not configured. Add a TMDB API credential to the backend environment.')
    return this.cache.getOrLoad(`film:search:${query.toLowerCase()}`, SEARCH_CACHE_MS, async () => {
      const url = new URL('https://api.themoviedb.org/3/search/movie')
      url.searchParams.set('query', query)
      url.searchParams.set('include_adult', 'false')
      if (!token) url.searchParams.set('api_key', apiKey!)
      const data = await this.fetchJson<{ results?: Array<{ id: number; title: string; overview?: string; release_date?: string; poster_path?: string | null; original_language?: string }> }>(url.toString(), token ? { Authorization: `Bearer ${token}` } : undefined)
      return (data.results ?? []).slice(0, 20).map((item) => ({
        category: 'film', externalId: String(item.id), provider: 'tmdb', title: item.title,
        description: item.overview || null, releaseYear: yearFrom(item.release_date),
        coverImagePath: item.poster_path ? imagePath('tmdb', item.poster_path) : null,
        details: { originalLanguage: item.original_language ?? null },
      }))
    })
  }

  private async getFilm(id: string): Promise<MediaSearchResult> {
    if (!/^\d+$/.test(id)) throw new BadRequestException('Invalid TMDB movie identifier.')
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN?.trim()
    const apiKey = process.env.TMDB_API_KEY?.trim()
    if (!token && !apiKey) throw new ServiceUnavailableException('Film search is not configured. Add a TMDB API credential to the backend environment.')
    return this.cache.getOrLoad(`film:detail:${id}`, DETAIL_CACHE_MS, async () => {
      const url = new URL(`https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}`)
      url.searchParams.set('append_to_response', 'credits')
      if (!token) url.searchParams.set('api_key', apiKey!)
      const item = await this.fetchJson<{ id: number; title: string; overview?: string; release_date?: string; poster_path?: string | null; original_language?: string; runtime?: number; credits?: { crew?: Array<{ job: string; name: string }> } }>(url.toString(), token ? { Authorization: `Bearer ${token}` } : undefined)
      return { category: 'film', externalId: String(item.id), provider: 'tmdb', title: item.title, description: item.overview || null, releaseYear: yearFrom(item.release_date), coverImagePath: item.poster_path ? imagePath('tmdb', item.poster_path) : null, details: { runtime: item.runtime ?? null, director: item.credits?.crew?.find((person) => person.job === 'Director')?.name ?? null, originalLanguage: item.original_language ?? null } }
    })
  }

  private musicHeaders() {
    const userAgent = process.env.MUSICBRAINZ_USER_AGENT?.trim()
    if (!userAgent || userAgent.includes('YOUR_')) throw new ServiceUnavailableException('Music search is not configured. Set MUSICBRAINZ_USER_AGENT in the backend environment.')
    const accessToken = process.env.MUSICBRAINZ_ACCESS_TOKEN?.trim()
    return {
      'User-Agent': userAgent,
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }
  }

  private async musicRequest<T>(url: string): Promise<T> {
    const previous = this.musicBrainzQueue
    let unlock!: () => void
    this.musicBrainzQueue = new Promise((resolve) => { unlock = resolve })
    await previous
    try {
      const delay = Math.max(0, 1_050 - (Date.now() - this.lastMusicBrainzRequest))
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
      this.lastMusicBrainzRequest = Date.now()
      return await this.fetchJson<T>(url, this.musicHeaders())
    } finally {
      unlock()
    }
  }

  private async searchMusic(query: string): Promise<MediaSearchResult[]> {
    this.musicHeaders()
    return this.cache.getOrLoad(`music:search:${query.toLowerCase()}`, SEARCH_CACHE_MS, async () => {
      const url = new URL('https://musicbrainz.org/ws/2/release-group')
      url.searchParams.set('query', query)
      url.searchParams.set('fmt', 'json')
      url.searchParams.set('limit', '20')
      const data = await this.musicRequest<{ 'release-groups'?: Array<{ id: string; title: string; 'first-release-date'?: string; 'artist-credit'?: Array<{ name?: string; artist?: { name?: string } }> }> }>(url.toString())
      return (data['release-groups'] ?? []).map((item) => {
        const artist = item['artist-credit']?.map((credit) => credit.name ?? credit.artist?.name).filter(Boolean).join(', ') || null
        return { category: 'music', externalId: item.id, provider: 'musicbrainz', title: item.title, description: null, releaseYear: yearFrom(item['first-release-date']), coverImagePath: imagePath('coverart', item.id), details: { artist, releaseDate: item['first-release-date'] ?? null } }
      })
    })
  }

  private async getMusic(id: string): Promise<MediaSearchResult> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Invalid MusicBrainz release-group identifier.')
    return this.cache.getOrLoad(`music:detail:${id}`, DETAIL_CACHE_MS, async () => {
      const url = `https://musicbrainz.org/ws/2/release-group/${encodeURIComponent(id)}?fmt=json&inc=artists+releases`
      const item = await this.musicRequest<{ id: string; title: string; 'first-release-date'?: string; 'artist-credit'?: Array<{ name?: string; artist?: { name?: string } }>; releases?: Array<{ media?: Array<{ 'track-count'?: number }> }> }>(url)
      const artist = item['artist-credit']?.map((credit) => credit.name ?? credit.artist?.name).filter(Boolean).join(', ') || null
      const trackCount = item.releases?.flatMap((release) => release.media ?? []).reduce((sum, medium) => sum + (medium['track-count'] ?? 0), 0) || null
      return { category: 'music', externalId: item.id, provider: 'musicbrainz', title: item.title, description: null, releaseYear: yearFrom(item['first-release-date']), coverImagePath: imagePath('coverart', item.id), details: { artist, trackCount, releaseDate: item['first-release-date'] ?? null } }
    })
  }

  private openLibraryHeaders() {
    const userAgent = process.env.OPEN_LIBRARY_USER_AGENT?.trim()
    if (!userAgent || userAgent.includes('YOUR_')) throw new ServiceUnavailableException('Book search is not configured. Set OPEN_LIBRARY_USER_AGENT in the backend environment.')
    return { 'User-Agent': userAgent }
  }

  private async searchBooks(query: string): Promise<MediaSearchResult[]> {
    const headers = this.openLibraryHeaders()
    return this.cache.getOrLoad(`book:search:${query.toLowerCase()}`, SEARCH_CACHE_MS, async () => {
      const url = new URL('https://openlibrary.org/search.json')
      url.searchParams.set('q', query)
      url.searchParams.set('fields', 'key,title,author_name,first_publish_year,cover_i,edition_count')
      url.searchParams.set('limit', '20')
      const data = await this.openLibraryRequest<{ docs?: Array<{ key: string; title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number; edition_count?: number }> }>(url.toString(), headers)
      return (data.docs ?? []).map((item) => {
        const externalId = item.key.replace('/works/', '')
        if (item.first_publish_year) this.cache.set(`book:year:${externalId}`, item.first_publish_year, DETAIL_CACHE_MS)
        return { category: 'book', externalId, provider: 'openlibrary', title: item.title, description: null, releaseYear: item.first_publish_year ?? null, coverImagePath: item.cover_i ? imagePath('openlibrary', String(item.cover_i)) : null, details: { author: item.author_name?.join(', ') ?? null, editionCount: item.edition_count ?? null } }
      })
    })
  }

  private async getBook(id: string): Promise<MediaSearchResult> {
    if (!/^OL\d+W$/.test(id)) throw new BadRequestException('Invalid Open Library work identifier.')
    const headers = this.openLibraryHeaders()
    return this.cache.getOrLoad(`book:detail:${id}`, DETAIL_CACHE_MS, async () => {
      const item = await this.openLibraryRequest<{ title: string; description?: string | { value: string }; covers?: number[]; first_publish_date?: string; authors?: Array<{ author?: { key?: string } }> }>(`https://openlibrary.org/works/${encodeURIComponent(id)}.json`, headers)
      const description = typeof item.description === 'string' ? item.description : item.description?.value ?? null
      let author: string | null = null
      const authorKey = item.authors?.[0]?.author?.key
      if (authorKey) {
        const authorData = await this.openLibraryRequest<{ name?: string }>(`https://openlibrary.org${authorKey}.json`, headers)
        author = authorData.name ?? null
      }
      return { category: 'book', externalId: id, provider: 'openlibrary', title: item.title, description, releaseYear: yearFrom(item.first_publish_date) ?? this.cache.get<number>(`book:year:${id}`) ?? null, coverImagePath: item.covers?.[0] ? imagePath('openlibrary', String(item.covers[0])) : null, details: { author } }
    })
  }

  private async openLibraryRequest<T>(url: string, headers: Record<string, string>): Promise<T> {
    const previous = this.openLibraryQueue
    let unlock!: () => void
    this.openLibraryQueue = new Promise((resolve) => { unlock = resolve })
    await previous
    try {
      const delay = Math.max(0, 350 - (Date.now() - this.lastOpenLibraryRequest))
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
      this.lastOpenLibraryRequest = Date.now()
      return await this.fetchJson<T>(url, headers)
    } finally {
      unlock()
    }
  }
}
