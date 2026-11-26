import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowUpRight, Search } from 'lucide-react'
import { format, isValid, parseISO } from 'date-fns'
import { getImageUrl, getMedia, searchMedia } from './media-api'
import type { MediaCategory } from './media-api'
import { LibraryActions, LibraryRating } from '../library/library-pages'
import { ReviewSection } from '../reviews/review-section'
import { ListActions } from '../lists/lists-pages'

function regionFlag(region: string | undefined) {
  if (!region || !/^[A-Z]{2}$/.test(region)) return ''
  return String.fromCodePoint(...[...region].map((letter) => 127397 + letter.charCodeAt(0)))
}

function languageLabel(value: string) {
  const raw = value.trim()
  try {
    // Provider language values use lowercase language tags (such as "sv"); uppercase
    // two-letter values are country codes (such as "BR").
    if (/^[A-Z]{2}$/.test(raw)) {
      const display = new Intl.DisplayNames(undefined, { type: 'region' }).of(raw)
      return `${regionFlag(raw)} ${display ?? raw}`
    }
    const locale = new Intl.Locale(raw.replace('_', '-'))
    const language = new Intl.DisplayNames(undefined, { type: 'language' }).of(locale.language) ?? raw
    const region = locale.region ?? locale.maximize().region
    const regionName = region ? new Intl.DisplayNames(undefined, { type: 'region' }).of(region) : undefined
    return `${regionFlag(region)} ${language}${regionName ? ` · ${regionName}` : ''}`.trim()
  } catch {
    return raw
  }
}

function formatDetail(key: string, value: unknown) {
  if (key === 'runtime' && typeof value === 'number') return `${value} minutes`
  if (key === 'originalLanguage' && typeof value === 'string') return languageLabel(value)
  if (key === 'releaseDate' && typeof value === 'string') {
    if (/^\d{4}$/.test(value)) return value
    if (/^\d{4}-\d{2}$/.test(value)) {
      const date = parseISO(`${value}-01`)
      return isValid(date) ? format(date, 'MMMM yyyy') : value
    }
    const date = parseISO(value)
    return isValid(date) ? format(date, 'PPP') : value
  }
  return String(value)
}

const labels: Record<MediaCategory, { title: string; intro: string; noun: string }> = {
  films: { title: 'Films', intro: 'Find the stories that stay with you.', noun: 'film' },
  music: { title: 'Music', intro: 'Explore albums, artists, and the soundtracks of your life.', noun: 'album' },
  books: { title: 'Books', intro: 'Search the shelves for your next world.', noun: 'book' },
}

export function MediaSearchPage({ category }: { category: MediaCategory }) {
  const [query, setQuery] = useState('')
  const [settledQuery, setSettledQuery] = useState('')
  const config = labels[category]
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledQuery(query.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [query])
  const results = useQuery({
    queryKey: ['media-search', category, settledQuery],
    queryFn: () => searchMedia(category, settledQuery),
    enabled: settledQuery.length >= 2,
    staleTime: 60_000,
    retry: false,
  })
  return <main className="media-page section-wrap">
    <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to Libraria</Link>
    <p className="eyebrow">THE LIBRARIA CATALOGUE</p>
    <h1>{config.title}<em>.</em></h1>
    <p className="media-intro">{config.intro}</p>
    <label className="media-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}…`} aria-label={`Search ${config.title}`} /><span>ENTER A TITLE</span></label>
    {query.trim().length < 2 ? <p className="media-hint">Search by title to discover a {config.noun}.</p> : results.isPending ? <p className="media-hint">Searching the catalogue…</p> : results.isError ? <p className="media-error">{results.error.message}</p> : results.data?.length ? <div className="media-results">{results.data.map((item) => <Link className="media-card" to={`/${category}/${encodeURIComponent(item.externalId)}`} key={item.externalId}>
      <div className={`media-cover ${category === 'music' ? 'square' : ''}`}>{item.coverImagePath ? <img src={getImageUrl(item.coverImagePath)} alt="" loading="lazy" /> : <span>{item.title.slice(0, 1)}</span>}</div>
      <div className="media-card-copy"><span className="media-year">{item.releaseYear ?? 'YEAR UNKNOWN'}</span><h2>{item.title}</h2><p>{String(item.details.artist ?? item.details.author ?? '')}</p></div><ArrowUpRight className="media-card-arrow" size={18} />
    </Link>)}</div> : <p className="media-hint">No matches yet. Try another title.</p>}
    {category === 'films' && <p className="provider-credit">Film data provided by TMDB. <Link to="/credits">About our data sources</Link>.</p>}
  </main>
}

export function MediaDetailPage({ category }: { category: MediaCategory }) {
  const { id = '' } = useParams()
  const config = labels[category]
  const item = useQuery({ queryKey: ['media-detail', category, id], queryFn: () => getMedia(category, id), enabled: Boolean(id), retry: false })
  return <main className="media-page section-wrap">
    <Link className="back-link" to={`/${category}`}><ArrowLeft size={15} /> Back to {config.title}</Link>
    {item.isPending ? <p className="media-hint">Loading details…</p> : item.isError ? <p className="media-error">{item.error.message}</p> : item.data && <article className="media-detail">
      <div className="detail-cover">{item.data.coverImagePath ? <img src={getImageUrl(item.data.coverImagePath)} alt="" /> : <span>{item.data.title.slice(0, 1)}</span>}</div>
      <div className="detail-copy"><p className="eyebrow">{config.noun.toUpperCase()} · {item.data.releaseYear ?? 'YEAR UNKNOWN'}</p><h1>{item.data.title}<em>.</em></h1><LibraryRating item={item.data} category={category} /><p className="detail-byline">{String(item.data.details.artist ?? item.data.details.author ?? item.data.details.director ?? '')}</p>{item.data.description && <p className="detail-description">{item.data.description}</p>}
      <dl className="detail-facts">{Object.entries(item.data.details).filter(([, value]) => value !== null && value !== '').map(([key, value]) => <div key={key}><dt>{key.replace(/[A-Z]/g, (letter) => ` ${letter}`).toUpperCase()}</dt><dd className={key === 'originalLanguage' ? 'language-value' : undefined}>{formatDetail(key, value)}</dd></div>)}</dl>
      <LibraryActions item={item.data} category={category} />
      <ListActions item={item.data} category={category} />
      </div>
    </article>}
    {!item.isPending && !item.isError && item.data && <ReviewSection item={item.data} category={category} />}
  </main>
}

export function CreditsPage() {
  return <main className="media-page section-wrap credits-page"><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to Libraria</Link><p className="eyebrow">CREDITS</p><h1>Data with <em>roots.</em></h1><p>Metadata and cover art are provided by the services below. Libraria is an independent project and is not endorsed by them.</p><section><h2>Film</h2><a className="tmdb-logo-link" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer"><img className="tmdb-logo" src="/tmdb-logo.svg" alt="TMDB" /></a><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section><section><h2>Music</h2><p>Music metadata is provided by MusicBrainz. Cover art is served by the Cover Art Archive.</p><a href="https://musicbrainz.org/" target="_blank" rel="noreferrer">MusicBrainz <ArrowUpRight size={14} /></a></section><section><h2>Books</h2><p>Book metadata and cover images are provided by Open Library.</p><a href="https://openlibrary.org/" target="_blank" rel="noreferrer">Open Library <ArrowUpRight size={14} /></a></section></main>
}
