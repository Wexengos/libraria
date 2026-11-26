import { supabase } from '../../lib/supabase'
import type { LibraryEntry } from '../library/library-api'
import type { MediaCategory } from '../media/media-api'

export type ListVisibility = 'PRIVATE' | 'PUBLIC'
export interface MediaListSummary {
  id: string
  userId: string
  title: string
  description: string | null
  visibility: ListVisibility
  createdAt: string
  updatedAt: string
  _count?: { items: number }
}
export interface MediaList extends MediaListSummary {
  user: { id: string; username: string; displayName: string; avatarUrl: string | null }
  items: Array<{ id: string; listId: string; mediaItemId: string; position: number; addedAt: string; mediaItem: LibraryEntry['mediaItem'] }>
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}, authentication: 'required' | 'optional' = 'required'): Promise<T> {
  let token: string | undefined
  if (authentication !== 'optional' || supabase) {
    const { data, error } = await supabase?.auth.getSession() ?? { data: { session: null }, error: null }
    if (authentication === 'required' && (error || !data.session)) throw new Error('Your session expired. Sign in again.')
    token = data.session?.access_token
  }
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
  const text = await response.text()
  let payload: unknown = null
  if (text) { try { payload = JSON.parse(text) as unknown } catch { /* Keep a readable generic API error. */ } }
  if (!response.ok) throw new Error((payload as { message?: string } | null)?.message ?? 'The list request failed.')
  return payload as T
}

export function fetchLists() { return request<MediaListSummary[]>('/lists') }
export function fetchList(id: string) { return request<MediaList>(`/lists/${encodeURIComponent(id)}`, {}, 'optional') }
export function createList(payload: { title: string; description: string | null; visibility: ListVisibility }) { return request<MediaListSummary>('/lists', { method: 'POST', body: payload }) }
export function updateList(id: string, payload: { title: string; description: string | null; visibility: ListVisibility }) { return request<MediaListSummary>(`/lists/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }) }
export function deleteList(id: string) { return request<void>(`/lists/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
export function addListItem(id: string, category: MediaCategory, externalId: string) { return request<{ id: string }>(`/lists/${encodeURIComponent(id)}/items`, { method: 'POST', body: { category, externalId } }) }
export function removeListItem(id: string, itemId: string) { return request<void>(`/lists/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' }) }
export function reorderList(id: string, itemIds: string[]) { return request<void>(`/lists/${encodeURIComponent(id)}/items/order`, { method: 'PUT', body: { itemIds } }) }

