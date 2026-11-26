import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity, Search, Users } from 'lucide-react'
import { ActivityFeed, FollowButton } from './social-components'
import { fetchActivityFeed, fetchCommunity } from './social-api'
import { useAuth } from '../auth/auth-context'

export function CommunityPage() {
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [settledSearch, setSettledSearch] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])
  const people = useQuery({ queryKey: ['community', settledSearch, session?.user.id], queryFn: () => fetchCommunity(settledSearch), retry: false })
  return <main className="media-page section-wrap community-page">
    <p className="eyebrow">PEOPLE WHO KEEP CULTURE CLOSE</p><h1>Community<em>.</em></h1>
    <p className="media-intro">Find fellow archivists and follow the things they discover.</p>
    <label className="community-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people by name or username" aria-label="Search community" /></label>
    {people.isFetching && <p className="media-hint">Finding people…</p>}{people.isError && <p className="media-error">{people.error.message}</p>}
    <div className="community-grid">{people.data?.map((person) => <article className="community-card" key={person.id}>
      <Link className="community-person" to={`/u/${encodeURIComponent(person.username)}`}>
        {person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : <span>{person.displayName.slice(0, 1).toUpperCase()}</span>}
        <div><h2>{person.displayName}</h2><small>@{person.username}</small></div>
      </Link>
      {person.bio && <p>{person.bio}</p>}
      <div className="community-stats"><span><Users size={13} /> {person._count?.followers ?? 0} followers</span><span>{person._count?.following ?? 0} following</span></div>
      {session ? <FollowButton username={person.username} isFollowing={person.isFollowing ?? false} /> : <Link className="community-signin" to="/sign-in">Sign in to follow</Link>}
    </article>)}</div>
    {people.data?.length === 0 && <p className="media-hint">No people found. Try a different search.</p>}
  </main>
}

export function ActivityFeedPage() {
  const feed = useQuery({ queryKey: ['activity-feed'], queryFn: fetchActivityFeed, retry: false })
  return <main className="media-page section-wrap activity-page">
    <p className="eyebrow"><Activity size={14} /> FROM THE PEOPLE YOU FOLLOW</p><h1>Recent activity<em>.</em></h1>
    {feed.isPending && <p className="media-hint">Gathering the latest activity…</p>}{feed.isError && <p className="media-error">{feed.error.message}</p>}
    {feed.data && <ActivityFeed entries={feed.data} emptyMessage="Your feed is quiet. Find people in the community to see what they are enjoying." />}
  </main>
}
