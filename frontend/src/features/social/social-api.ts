import { supabase } from '../../lib/supabase'

export interface SocialProfile {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  createdAt: string
  _count?: { followers: number; following: number }
  isFollowing?: boolean
}

export interface SocialActivity {
  id: string
  activityType: 'MEDIA_ADDED' | 'RATING_SET' | 'LIBRARY_STATUS_CHANGED' | 'REVIEW_POSTED' | 'LIST_CREATED' | 'LIST_ITEM_ADDED'
  createdAt: string
  user: Pick<SocialProfile, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  mediaItem: { id: string; title: string; type: 'FILM' | 'ALBUM' | 'BOOK'; releaseYear: number | null; coverImageUrl: string | null; externalIdentifiers: Array<{ provider: string; externalId: string }> } | null
  review: { id: string; title: string | null; content: string } | null
  list: { id: string; title: string; visibility: 'PRIVATE' | 'PUBLIC' } | null
  rating: number | null
}

export interface SocialList { id: string; title: string; description: string | null; visibility: 'PRIVATE' | 'PUBLIC'; _count: { items: number } }

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function currentToken(required: boolean) {
  const { data, error } = await supabase?.auth.getSession() ?? { data: { session: null }, error: null }
  if (required && (error || !data.session)) throw new Error('Sign in to continue.')
  return data.session?.access_token
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}, auth: 'optional' | 'required' = 'optional') {
  const token = await currentToken(auth === 'required')
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
  const text = await response.text()
  let payload: unknown = null
  if (text) { try { payload = JSON.parse(text) as unknown } catch { /* Use the normal API error below. */ } }
  if (!response.ok) throw new Error((payload as { message?: string } | null)?.message ?? 'The community request failed.')
  return payload as T
}

export function fetchCommunity(search: string) { return request<SocialProfile[]>(`/community${search ? `?q=${encodeURIComponent(search)}` : ''}`) }
export function fetchSocialSummary(username: string) { return request<{ followersCount: number; followingCount: number; isFollowing: boolean }>(`/users/${encodeURIComponent(username)}/social`) }
export function fetchUserActivity(username: string) { return request<SocialActivity[]>(`/users/${encodeURIComponent(username)}/activity`) }
export function fetchUserLists(username: string) { return request<SocialList[]>(`/users/${encodeURIComponent(username)}/lists`) }
export function fetchActivityFeed() { return request<SocialActivity[]>('/activity', {}, 'required') }
export function followUser(username: string) { return request<{ following: boolean }>(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST' }, 'required') }
export function unfollowUser(username: string) { return request<{ following: boolean }>(`/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' }, 'required') }
