import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowUpRight, Heart, Star, Trash2 } from 'lucide-react'
import { getImageUrl } from '../media/media-api'
import type { MediaResult } from '../media/media-api'
import { useAuth } from '../auth/auth-context'
import { BlockingLoader } from '../../components/blocking-loader'
import {
  fetchLibrary,
  fetchLibraryEntry,
  removeLibraryEntry,
  saveLibraryEntry,
  statusOptions,
  updateLibraryEntry,
  type LibraryCategory,
  type LibraryEntry,
  type LibraryStatus,
} from './library-api'

const categories: Array<{ key: LibraryCategory | 'all'; label: string; href: string }> = [
  { key: 'all', label: 'Everything', href: '/library' },
  { key: 'films', label: 'Films', href: '/library/films' },
  { key: 'music', label: 'Music', href: '/library/music' },
  { key: 'books', label: 'Books', href: '/library/books' },
]

const defaults: Record<LibraryCategory, LibraryStatus> = {
  films: 'WATCHLIST', music: 'WANT_TO_LISTEN', books: 'WANT_TO_READ',
}

function categoryFromParam(value: string | undefined): LibraryCategory | undefined {
  return value === 'films' || value === 'music' || value === 'books' ? value : undefined
}

function categoryForItem(item: LibraryEntry['mediaItem']): LibraryCategory {
  return item.type === 'FILM' ? 'films' : item.type === 'ALBUM' ? 'music' : 'books'
}

function mediaHref(item: LibraryEntry['mediaItem']) {
  const category = categoryForItem(item)
  const identifier = item.externalIdentifiers[0]
  return identifier ? `/${category}/${encodeURIComponent(identifier.externalId)}` : `/${category}`
}

function statusLabel(category: LibraryCategory, status: LibraryStatus) {
  return statusOptions[category].find((option) => option.value === status)?.label ?? status
}

export function LibraryActions({ item, category }: { item: MediaResult; category: LibraryCategory }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LibraryStatus>(defaults[category])
  const [favorite, setFavorite] = useState(false)
  const savedEntries = useQuery({
    queryKey: ['library-entry', item.provider, item.externalId],
    queryFn: () => fetchLibraryEntry(item.provider, item.externalId),
    enabled: Boolean(session),
    staleTime: 30_000,
    retry: false,
  })
  const existing = savedEntries.data ?? undefined

  useEffect(() => {
    setStatus((existing?.status as LibraryStatus | undefined) ?? defaults[category])
    setFavorite(existing?.isFavorite ?? false)
  }, [existing?.id, existing?.status, existing?.isFavorite, category])

  const save = useMutation({
    mutationFn: () => saveLibraryEntry(item, category, { status, isFavorite: favorite }, existing?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] })
      await queryClient.invalidateQueries({ queryKey: ['library-entry'] })
    },
  })
  const remove = useMutation({
    mutationFn: () => removeLibraryEntry(existing!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] })
      await queryClient.invalidateQueries({ queryKey: ['library-entry'] })
    },
  })

  if (!session) return <aside className="library-actions"><p className="eyebrow">YOUR LIBRARY</p><p>Sign in to save this {category === 'films' ? 'film' : category === 'music' ? 'album' : 'book'} to your collection.</p><Link className="text-link" to="/sign-in">Sign in to continue <ArrowUpRight size={15} /></Link></aside>

  return <aside className="library-actions">
    {(savedEntries.isFetching || save.isPending || remove.isPending) && <BlockingLoader label={savedEntries.isFetching ? 'Checking your library…' : save.isPending ? 'Saving your changes…' : 'Updating your library…'} />}
    <div className="library-actions-heading"><div><p className="eyebrow">YOUR LIBRARY</p><h2>{existing ? 'In your collection' : 'Keep this one.'}</h2></div><Link to="/library">View library <ArrowUpRight size={14} /></Link></div>
    {savedEntries.isError && <p className="media-error">{savedEntries.error.message}</p>}
    {save.isError && <p className="media-error">{save.error.message}</p>}
    {remove.isError && <p className="media-error">{remove.error.message}</p>}
    {save.isSuccess && <p className="library-success">Saved to your library.</p>}
    {remove.isSuccess && <p className="library-success">Removed from your library.</p>}
    <div className="library-action-controls">
      <label className="library-select-label">STATUS<select value={status} onChange={(event) => setStatus(event.target.value as LibraryStatus)} disabled={savedEntries.isPending}>
        {statusOptions[category].map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select></label>
      <button type="button" className={`favorite-toggle ${favorite ? 'selected' : ''}`} onClick={() => setFavorite((current) => !current)} aria-pressed={favorite} disabled={savedEntries.isFetching || save.isPending || remove.isPending}><Heart size={16} fill={favorite ? 'currentColor' : 'none'} /> {favorite ? 'Favorite' : 'Add favorite'}</button>
      <button type="button" className="library-save-button" onClick={() => save.mutate()} disabled={save.isPending || remove.isPending || savedEntries.isFetching}>{save.isPending ? 'Saving…' : existing ? 'Save changes' : 'Add to library'}</button>
      {existing && <button type="button" className="library-remove-button" onClick={() => remove.mutate()} disabled={remove.isPending || save.isPending || savedEntries.isFetching}><Trash2 size={15} /> Remove</button>}
    </div>
  </aside>
}

export function LibraryRating({ item, category }: { item: MediaResult; category: LibraryCategory }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<number | null>(null)
  const savedEntries = useQuery({
    queryKey: ['library-entry', item.provider, item.externalId],
    queryFn: () => fetchLibraryEntry(item.provider, item.externalId),
    enabled: Boolean(session),
    staleTime: 30_000,
    retry: false,
  })
  const existing = savedEntries.data ?? undefined
  const mutation = useMutation({
    mutationFn: (rating: number) => saveLibraryEntry(item, category, {
      status: (existing?.status as LibraryStatus | undefined) ?? defaults[category],
      isFavorite: existing?.isFavorite ?? false,
      rating,
    }, existing?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] })
      await queryClient.invalidateQueries({ queryKey: ['library-entry'] })
    },
  })
  const rating = existing?.rating ?? null
  const shownRating = preview ?? rating ?? 0
  const disabled = !session || savedEntries.isPending || mutation.isPending

  return <section className="media-rating" onMouseLeave={() => setPreview(null)} aria-label="Your rating">
    {session && mutation.isPending && <BlockingLoader label="Saving your rating…" />}
    <p className="eyebrow">YOUR RATING</p>
    <div className="rating-row">
      <div className="rating-stars" role="group" aria-label="Rate this media from zero to five stars">
        {Array.from({ length: 5 }, (_, index) => {
          const fill = Math.max(0, Math.min(1, shownRating - index))
          const halfValue = index + 0.5
          const fullValue = index + 1
          return <span className="rating-star" key={index}>
            <Star className="rating-star-outline" size={25} aria-hidden="true" />
            <span className="rating-star-fill" style={{ width: `${fill * 100}%` }} aria-hidden="true"><Star size={25} fill="currentColor" /></span>
            <button type="button" className="rating-hit rating-hit-half" aria-label={`Rate ${halfValue.toFixed(1)} out of 5 stars`} aria-pressed={rating === halfValue} disabled={disabled} onMouseEnter={() => setPreview(halfValue)} onFocus={() => setPreview(halfValue)} onBlur={() => setPreview(null)} onClick={() => mutation.mutate(halfValue)} />
            <button type="button" className="rating-hit rating-hit-full" aria-label={`Rate ${fullValue.toFixed(1)} out of 5 stars`} aria-pressed={rating === fullValue} disabled={disabled} onMouseEnter={() => setPreview(fullValue)} onFocus={() => setPreview(fullValue)} onBlur={() => setPreview(null)} onClick={() => mutation.mutate(fullValue)} />
          </span>
        })}
      </div>
      <button type="button" className={`rating-zero ${rating === 0 ? 'selected' : ''}`} aria-label="Rate zero stars" aria-pressed={rating === 0} disabled={disabled} onMouseEnter={() => setPreview(0)} onFocus={() => setPreview(0)} onBlur={() => setPreview(null)} onClick={() => mutation.mutate(0)}>0</button>
      <span className="rating-value" aria-live="polite">{preview !== null ? `Preview ${preview.toFixed(1)} / 5` : rating === null ? 'Not rated' : `${rating.toFixed(1)} / 5`}</span>
    </div>
    {!session && <Link className="rating-sign-in" to="/sign-in">Sign in to rate this title</Link>}
    {session && !existing && <p className="rating-hint">Rating adds this title to your library with its default status.</p>}
    {mutation.isError && <p className="media-error">{mutation.error.message}</p>}
    {mutation.isSuccess && <p className="library-success">Rating saved.</p>}
  </section>
}

export function LibraryPage() {
  const { category: categoryParam } = useParams()
  const category = categoryFromParam(categoryParam)
  const [status, setStatus] = useState<LibraryStatus | ''>('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<'addedAt' | 'title' | 'releaseYear' | 'rating'>('addedAt')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const library = useQuery({
    queryKey: ['library', category ?? 'all', status, favoritesOnly, sort, direction, session?.user.id],
    queryFn: () => fetchLibrary({ category, status, favorite: favoritesOnly ? true : undefined, sort, direction }),
    enabled: Boolean(session),
    staleTime: 30_000,
    retry: false,
  })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<LibraryEntry, 'status' | 'isFavorite'>> }) => updateLibraryEntry(id, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] })
      await queryClient.invalidateQueries({ queryKey: ['library-entry'] })
    },
  })
  const remove = useMutation({
    mutationFn: removeLibraryEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] })
      await queryClient.invalidateQueries({ queryKey: ['library-entry'] })
    },
  })

  const availableStatuses = category ? statusOptions[category] : [...statusOptions.films, ...statusOptions.music, ...statusOptions.books]

  const busy = Boolean(session) && (library.isFetching || update.isPending || remove.isPending)
  return <main className="media-page section-wrap library-page">
    {busy && <BlockingLoader label={library.isFetching ? 'Opening your archive…' : update.isPending ? 'Saving your changes…' : 'Updating your archive…'} />}
    <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to Libraria</Link>
    <p className="eyebrow">YOUR PERSONAL ARCHIVE</p>
    <div className="library-title-row"><h1>My library<em>.</em></h1><span>{library.data?.length ?? 0} ITEMS</span></div>
    <nav className="library-tabs" aria-label="Library category">
      {categories.map((tab) => <Link key={tab.key} to={tab.href} className={(tab.key === 'all' ? !category : category === tab.key) ? 'active' : ''}>{tab.label}</Link>)}
    </nav>
    <div className="library-filters">
      <label>STATUS<select value={status} onChange={(event) => setStatus(event.target.value as LibraryStatus | '')}>
        <option value="">All statuses</option>{availableStatuses.map((option) => <option key={`${option.value}-${option.label}`} value={option.value}>{option.label}</option>)}
      </select></label>
      <label>SORT BY<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="addedAt">Date added</option><option value="title">Title</option><option value="releaseYear">Release year</option><option value="rating">Rating</option></select></label>
      <label>ORDER<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="desc">Newest / highest</option><option value="asc">Oldest / lowest</option></select></label>
      <button type="button" className={`favorite-filter ${favoritesOnly ? 'selected' : ''}`} onClick={() => setFavoritesOnly((current) => !current)} aria-pressed={favoritesOnly}><Heart size={15} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites</button>
    </div>
    {library.isPending && <p className="media-hint">Opening your archive…</p>}
    {library.isError && <p className="media-error">{library.error.message}</p>}
    {update.isError && <p className="media-error">{update.error.message}</p>}
    {remove.isError && <p className="media-error">{remove.error.message}</p>}
    {library.data?.length === 0 && <div className="library-empty"><p className="eyebrow">A PLACE TO BEGIN</p><h2>Your archive is waiting.</h2><p>Add a film, album, or book from its detail page.</p><div><Link to="/films">Explore films</Link><Link to="/music">Explore music</Link><Link to="/books">Explore books</Link></div></div>}
    {library.data && library.data.length > 0 && <div className="library-grid">{library.data.map((entry) => {
      const itemCategory = categoryForItem(entry.mediaItem)
      const statusValues = statusOptions[itemCategory]
      const cover = entry.mediaItem.coverImageUrl
      const artistOrAuthor = entry.mediaItem.albumDetails?.artist ?? entry.mediaItem.bookDetails?.author ?? entry.mediaItem.filmDetails?.director
      return <article className="library-card" key={entry.id}>
        <Link className="library-card-main" to={mediaHref(entry.mediaItem)}>
          <div className="library-card-cover">{cover ? <img src={getImageUrl(cover)} alt="" loading="lazy" /> : <span>{entry.mediaItem.title.slice(0, 1)}</span>}</div>
          <div className="library-card-copy"><span>{entry.mediaItem.releaseYear ?? 'YEAR UNKNOWN'}</span><h2>{entry.mediaItem.title}</h2>{artistOrAuthor && <p>{artistOrAuthor}</p>}<small>{statusLabel(itemCategory, entry.status)}</small>{entry.rating !== null && <small className="library-card-rating">★ {entry.rating.toFixed(1)}</small>}</div>
        </Link>
        <div className="library-card-actions">
          <select aria-label={`Status for ${entry.mediaItem.title}`} value={entry.status} onChange={(event) => update.mutate({ id: entry.id, patch: { status: event.target.value as LibraryStatus } })} disabled={update.isPending}>
            {statusValues.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button type="button" className={`library-heart ${entry.isFavorite ? 'selected' : ''}`} aria-label={entry.isFavorite ? `Remove ${entry.mediaItem.title} from favorites` : `Add ${entry.mediaItem.title} to favorites`} aria-pressed={entry.isFavorite} onClick={() => update.mutate({ id: entry.id, patch: { isFavorite: !entry.isFavorite } })}><Heart size={16} fill={entry.isFavorite ? 'currentColor' : 'none'} /></button>
          <button type="button" className="library-delete" aria-label={`Remove ${entry.mediaItem.title} from library`} onClick={() => remove.mutate(entry.id)}><Trash2 size={15} /></button>
        </div>
      </article>
    })}</div>}
    {library.data && library.data.length === 100 && <p className="library-limit-note">Showing the latest 100 entries. Narrow your filters to find older items.</p>}
  </main>
}
