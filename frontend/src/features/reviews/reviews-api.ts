import { supabase } from '../../lib/supabase'
import type { MediaCategory, MediaResult } from '../media/media-api'

export interface Review {
  id: string
  userId: string
  mediaItemId: string
  title: string | null
  content: string
  rating: number | null
  createdAt: string
  updatedAt: string
  user: { id: string; username: string; displayName: string; avatarUrl: string | null }
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function send<T>(path: string, options: { method?: string; body?: unknown } = {}, authenticated = false): Promise<T> {
  let token: string | undefined
  if (authenticated) {
    const { data, error } = await supabase?.auth.getSession() ?? { data: { session: null }, error: null }
    if (error || !data.session) throw new Error('Your session expired. Sign in again.')
    token = data.session.access_token
  }
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
  const text = await response.text()
  let payload: unknown = null
  if (text) { try { payload = JSON.parse(text) as unknown } catch { /* Use the generic API error below. */ } }
  if (!response.ok) throw new Error((payload as { message?: string } | null)?.message ?? 'The review request failed.')
  return payload as T
}

export function fetchReviews(item: MediaResult) {
  return send<Review[]>(`/media/${encodeURIComponent(item.provider)}/${encodeURIComponent(item.externalId)}/reviews`)
}

export function createReview(item: MediaResult, category: MediaCategory, payload: { title: string | null; content: string }) {
  return send<Review>('/reviews', { method: 'POST', body: { category, externalId: item.externalId, ...payload } }, true)
}

export function updateReview(id: string, payload: { title: string | null; content: string }) {
  return send<Review>(`/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }, true)
}

export function deleteReview(id: string) {
  return send<void>(`/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' }, true)
}
