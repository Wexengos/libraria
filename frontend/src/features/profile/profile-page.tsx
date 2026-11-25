import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/auth-context'

type Profile = {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  createdAt: string
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function fetchProfile(token: string | undefined, username: string | undefined) {
  const url = username
    ? `${apiUrl}/users/${encodeURIComponent(username)}`
    : `${apiUrl}/users/me`
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message ?? 'Could not load this profile.')
  }
  return response.json() as Promise<Profile>
}

export function ProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const ownProfile = !username
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: '', displayName: '', bio: '', avatarUrl: '' })
  const profileQuery = useQuery({
    queryKey: ['profile', username ?? 'me', session?.user.id],
    queryFn: () => fetchProfile(session?.access_token, username),
    enabled: !ownProfile || Boolean(session),
  })

  useEffect(() => {
    if (profileQuery.data) {
      setForm({
        username: profileQuery.data.username,
        displayName: profileQuery.data.displayName,
        bio: profileQuery.data.bio ?? '',
        avatarUrl: profileQuery.data.avatarUrl ?? '',
      })
    }
  }, [profileQuery.data])

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!session || !supabase) throw new Error('Sign in to update your profile.')
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) throw new Error('Your session expired. Sign in again.')
      const response = await fetch(`${apiUrl}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.access_token}` },
        body: JSON.stringify({ ...form, avatarUrl: form.avatarUrl || null }),
      })
      const result = await response.json().catch(() => null) as Profile | { message?: string } | null
      if (!response.ok) throw new Error(result && 'message' in result ? result.message : 'Could not update your profile.')
      return result as Profile
    },
    onSuccess: async (profile) => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      setEditing(false)
      if (profile) navigate(`/u/${profile.username}`, { replace: true })
    },
  })

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateProfile.mutate()
  }

  if (profileQuery.isLoading) return <main className="profile-page"><p className="eyebrow">LIBRARIA PROFILE</p><h1>Opening your page…</h1></main>
  if (profileQuery.isError) return <main className="profile-page"><p className="eyebrow">LIBRARIA PROFILE</p><h1>Profile unavailable.</h1><p className="form-message error">{profileQuery.error.message}</p><Link className="text-link" to="/">Back to the beginning <ArrowUpRight size={16} /></Link></main>

  const profile = profileQuery.data
  if (!profile) return null

  return <main className="profile-page">
    <p className="eyebrow">A LIFE IN CULTURE</p>
    <section className="profile-card">
      {profile.avatarUrl
        ? <img className="profile-avatar" src={profile.avatarUrl} alt={`${profile.displayName}'s avatar`} />
        : <div className="profile-avatar profile-avatar-fallback" aria-hidden="true">{profile.displayName.slice(0, 1).toUpperCase()}</div>}
      <div className="profile-copy">
        <span className="profile-handle">@{profile.username}</span>
        <h1>{profile.displayName}</h1>
        {profile.bio ? <p>{profile.bio}</p> : <p className="muted-copy">No biography yet.</p>}
        <span className="profile-since">ARCHIVIST SINCE {new Date(profile.createdAt).getFullYear()}</span>
      </div>
      {ownProfile && <button className="outline-button" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel edit' : 'Edit profile'}</button>}
    </section>
    {editing && ownProfile && <form className="profile-edit-form" onSubmit={save}>
      <label>Display name<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} minLength={1} maxLength={80} required /></label>
      <label>Username<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })} pattern="[a-z0-9]+([_-][a-z0-9]+)*" minLength={3} maxLength={24} required /><span className="field-hint">Your public profile URL uses this name.</span></label>
      <label>Biography<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} maxLength={500} rows={4} /></label>
      <label>Avatar URL<input type="url" value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} placeholder="https://…" /></label>
      {updateProfile.isError && <p className="form-message error" role="alert">{updateProfile.error.message}</p>}
      <button className="primary-button" disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving…' : 'Save profile'}</button>
    </form>}
    <section className="profile-placeholder">
      <h2>Your archive is taking shape.</h2>
      <p>Films, music, books, reviews, and lists will gather here as those features arrive.</p>
    </section>
  </main>
}
