import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { BlockingLoader } from '../../components/blocking-loader'
import { getImageUrl } from '../media/media-api'
import { useAuth } from '../auth/auth-context'
import type { MediaCategory, MediaResult } from '../media/media-api'
import {
  addListItem, createList, deleteList, fetchList, fetchLists, removeListItem, reorderList,
  updateList, type ListVisibility, type MediaListSummary,
} from './lists-api'

export function ListsPage() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<ListVisibility>('PRIVATE')
  const lists = useQuery({ queryKey: ['lists'], queryFn: fetchLists, retry: false })
  const create = useMutation({
    mutationFn: () => createList({ title: title.trim(), description: description.trim() || null, visibility }),
    onSuccess: async () => { setTitle(''); setDescription(''); await queryClient.invalidateQueries({ queryKey: ['lists'] }) },
  })
  return <main className="media-page section-wrap lists-page">
    {(lists.isFetching || create.isPending) && <BlockingLoader label={create.isPending ? 'Creating your list…' : 'Opening your lists…'} />}
    <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to Libraria</Link>
    <p className="eyebrow">GATHERED WITH INTENTION</p><h1>My lists<em>.</em></h1>
    <form className="list-create-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); create.mutate() }}>
      <p className="eyebrow">START A COLLECTION</p>
      <label>List title<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={1} maxLength={100} required placeholder="Films for a rainy Sunday" /></label>
      <label>Description <span>OPTIONAL</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} placeholder="What connects these works?" /></label>
      <label>Visibility<select value={visibility} onChange={(event) => setVisibility(event.target.value as ListVisibility)}><option value="PRIVATE">Private</option><option value="PUBLIC">Public</option></select></label>
      {create.isError && <p className="form-message error" role="alert">{create.error.message}</p>}
      <button className="primary-button" disabled={create.isPending || !title.trim()}><Plus size={15} /> Create list</button>
    </form>
    <section className="list-collection"><div className="reviews-heading"><div><p className="eyebrow">YOUR COLLECTIONS</p><h2>Lists<em>.</em></h2></div><span>{lists.data?.length ?? 0} LISTS</span></div>
      {lists.isError && <p className="media-error">{lists.error.message}</p>}
      <div className="lists-grid">{lists.data?.map((list) => <ListCard list={list} key={list.id} />)}</div>
      {lists.data?.length === 0 && <p className="media-hint">Your first list is ready to take shape.</p>}
    </section>
  </main>
}

function ListCard({ list }: { list: MediaListSummary }) {
  return <Link className="list-card" to={`/lists/${list.id}`}>
    <span className="list-card-visibility">{list.visibility === 'PUBLIC' ? <Eye size={15} /> : <EyeOff size={15} />} {list.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE'}</span>
    <h3>{list.title}</h3><p>{list.description || 'A collection of works worth keeping close.'}</p>
    <span className="list-card-count">{list._count?.items ?? 0} TITLES <ArrowUpRight size={15} /></span>
  </Link>
}

export function ListDetailPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const queryKey = ['list', id]
  const list = useQuery({ queryKey, queryFn: () => fetchList(id), enabled: Boolean(id), retry: false })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<ListVisibility>('PRIVATE')
  useEffect(() => {
    if (!list.data) return
    setTitle(list.data.title); setDescription(list.data.description ?? ''); setVisibility(list.data.visibility)
  }, [list.data?.id, list.data?.updatedAt])
  const owner = Boolean(session && list.data?.user.id === session.user.id)
  const update = useMutation({ mutationFn: () => updateList(id, { title: title.trim(), description: description.trim() || null, visibility }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey }) } })
  const remove = useMutation({ mutationFn: () => deleteList(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['lists'] }); navigate('/lists') } })
  const reorder = useMutation({ mutationFn: (itemIds: string[]) => reorderList(id, itemIds), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey }) } })
  const removeItem = useMutation({ mutationFn: (itemId: string) => removeListItem(id, itemId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey }); await queryClient.invalidateQueries({ queryKey: ['lists'] }) } })

  if (list.isPending) return <main className="media-page section-wrap"><BlockingLoader label="Opening this list…" /></main>
  if (list.isError || !list.data) return <main className="media-page section-wrap"><p className="media-error">{list.error?.message ?? 'List not found.'}</p><Link className="text-link" to="/lists">Back to lists</Link></main>

  const data = list.data
  return <main className="media-page section-wrap list-detail-page">
    {(list.isFetching || update.isPending || remove.isPending || reorder.isPending || removeItem.isPending) && <BlockingLoader label={update.isPending ? 'Saving list details…' : remove.isPending ? 'Removing list…' : reorder.isPending || removeItem.isPending ? 'Updating your list…' : 'Refreshing this list…'} />}
    <Link className="back-link" to="/lists"><ArrowLeft size={15} /> All lists</Link>
    <p className="eyebrow">{data.visibility === 'PUBLIC' ? 'PUBLIC COLLECTION' : 'PRIVATE COLLECTION'} · BY {data.user.displayName.toUpperCase()}</p>
    <h1>{data.title}<em>.</em></h1>{data.description && <p className="list-detail-description">{data.description}</p>}
    <p className="list-detail-count">{data.items.length} TITLES · ORDERED BY YOU</p>
    {owner && <details className="list-edit-panel"><summary>Edit list details</summary><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); update.mutate() }}>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={1} maxLength={100} required /></label>
      <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} /></label>
      <label>Visibility<select value={visibility} onChange={(event) => setVisibility(event.target.value as ListVisibility)}><option value="PRIVATE">Private</option><option value="PUBLIC">Public</option></select></label>
      {update.isError && <p className="media-error">{update.error.message}</p>}<div><button className="primary-button" disabled={update.isPending}>Save details</button><button type="button" className="library-remove-button" onClick={() => remove.mutate()} disabled={remove.isPending}><Trash2 size={15} /> Delete list</button></div>
    </form></details>}
    <div className="list-items">{data.items.map((entry, index) => {
      const category = entry.mediaItem.type === 'FILM' ? 'films' : entry.mediaItem.type === 'ALBUM' ? 'music' : 'books'
      const identifier = entry.mediaItem.externalIdentifiers[0]
      const href = identifier ? `/${category}/${encodeURIComponent(identifier.externalId)}` : `/${category}`
      return <article className="list-item" key={entry.id}>
        <span className="list-item-position">{String(index + 1).padStart(2, '0')}</span><Link className="list-item-main" to={href}><div className={`list-item-cover ${category === 'music' ? 'square' : ''}`}>{entry.mediaItem.coverImageUrl ? <img src={getImageUrl(entry.mediaItem.coverImageUrl)} alt="" /> : entry.mediaItem.title.slice(0, 1)}</div><div><span>{entry.mediaItem.releaseYear ?? 'YEAR UNKNOWN'}</span><h2>{entry.mediaItem.title}</h2><p>{entry.mediaItem.filmDetails?.director ?? entry.mediaItem.albumDetails?.artist ?? entry.mediaItem.bookDetails?.author ?? ''}</p></div></Link>
        {owner && <div className="list-item-controls"><button type="button" aria-label={`Move ${entry.mediaItem.title} up`} disabled={index === 0 || reorder.isPending} onClick={() => reorder.mutate(data.items.map((item) => item.id).map((itemId, position, ids) => position === index ? ids[index - 1] : position === index - 1 ? ids[index + 1] : itemId))}><ArrowUp size={16} /></button><button type="button" aria-label={`Move ${entry.mediaItem.title} down`} disabled={index === data.items.length - 1 || reorder.isPending} onClick={() => reorder.mutate(data.items.map((item) => item.id).map((itemId, position, ids) => position === index ? ids[index + 1] : position === index + 1 ? ids[index - 1] : itemId))}><ArrowDown size={16} /></button><button type="button" aria-label={`Remove ${entry.mediaItem.title} from this list`} onClick={() => removeItem.mutate(entry.id)}><Trash2 size={15} /></button></div>}
      </article>
    })}</div>
    {data.items.length === 0 && <p className="media-hint">This list is empty. Add works from their detail pages.</p>}
    {owner && (reorder.isError || removeItem.isError || remove.isError) && <p className="media-error">{reorder.error?.message ?? removeItem.error?.message ?? remove.error?.message}</p>}
    {!owner && <p className="list-owner-credit">A list by <Link to={`/u/${encodeURIComponent(data.user.username)}`}>{data.user.displayName}</Link></p>}
  </main>
}

export function ListActions({ item, category }: { item: MediaResult; category: MediaCategory }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [listId, setListId] = useState('')
  const lists = useQuery({ queryKey: ['lists'], queryFn: fetchLists, enabled: Boolean(session), staleTime: 30_000, retry: false })
  const add = useMutation({
    mutationFn: () => addListItem(listId, category, item.externalId),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['list', listId] }); await queryClient.invalidateQueries({ queryKey: ['lists'] }) },
  })
  if (!session) return null
  return <aside className="list-actions">
    {add.isPending && <BlockingLoader label="Adding title to your list…" />}
    <div><p className="eyebrow">CUSTOM LISTS</p><h2>Keep it in a collection.</h2></div>
    {lists.isError && <p className="media-error">{lists.error.message}</p>}
    {lists.data?.length ? <div className="list-action-row"><select aria-label="Choose a list" value={listId} onChange={(event) => setListId(event.target.value)}><option value="">Choose a list</option>{lists.data.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}</select><button type="button" className="outline-button" disabled={!listId || add.isPending} onClick={() => add.mutate()}><Plus size={15} /> Add title</button></div> : <Link className="text-link" to="/lists">Create your first list <ArrowUpRight size={14} /></Link>}
    {add.isError && <p className="media-error" role="alert">{add.error.message}</p>}{add.isSuccess && <p className="library-success">Added to your list.</p>}
  </aside>
}
