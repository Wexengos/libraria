import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Eye, EyeOff, Star, UserRoundPlus, UserRoundMinus } from 'lucide-react'
import { followUser, unfollowUser, type SocialActivity, type SocialList } from './social-api'

export function FollowButton({ username, isFollowing }: { username: string; isFollowing: boolean }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => isFollowing ? unfollowUser(username) : followUser(username),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['social-summary', username] })
      await queryClient.invalidateQueries({ queryKey: ['community'] })
      await queryClient.invalidateQueries({ queryKey: ['activity-feed'] })
      await queryClient.invalidateQueries({ queryKey: ['user-activity', username] })
    },
  })
  return <div className="follow-control">
    <button type="button" className={`follow-button ${isFollowing ? 'following' : ''}`} onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {isFollowing ? <UserRoundMinus size={15} /> : <UserRoundPlus size={15} />}{mutation.isPending ? 'Saving…' : isFollowing ? 'Following' : 'Follow'}
    </button>
    {mutation.isError && <span className="follow-error" role="alert">{mutation.error.message}</span>}
  </div>
}

export function ActivityFeed({ entries, emptyMessage = 'No recent activity.' }: { entries: SocialActivity[]; emptyMessage?: string }) {
  if (!entries.length) return <p className="media-hint">{emptyMessage}</p>
  return <div className="activity-feed">{entries.map((entry) => {
    const media = entry.mediaItem
    const identifier = media?.externalIdentifiers[0]
    const category = media?.type === 'FILM' ? 'films' : media?.type === 'ALBUM' ? 'music' : 'books'
    const mediaHref = media && identifier ? `/${category}/${encodeURIComponent(identifier.externalId)}` : null
    const message: Record<SocialActivity['activityType'], string> = {
      MEDIA_ADDED: 'added to their library', RATING_SET: 'rated', LIBRARY_STATUS_CHANGED: 'updated the status of',
      REVIEW_POSTED: 'reviewed', LIST_CREATED: 'created a list', LIST_ITEM_ADDED: 'added to a list',
    }
    return <article className="activity-card" key={entry.id}>
      <div className="activity-avatar">{entry.user.avatarUrl ? <img src={entry.user.avatarUrl} alt="" /> : entry.user.displayName.slice(0, 1).toUpperCase()}</div>
      <div className="activity-copy">
        <p><Link to={`/u/${encodeURIComponent(entry.user.username)}`}>{entry.user.displayName}</Link> {message[entry.activityType]}{media && <> <Link className="activity-media-link" to={mediaHref ?? '#'}>{media.title}</Link></>}{entry.list && <> in <Link className="activity-list-link" to={`/lists/${entry.list.id}`}>{entry.list.title}</Link></>}</p>
        {entry.rating != null && (entry.activityType === 'RATING_SET' || entry.activityType === 'REVIEW_POSTED') && <span className="activity-rating"><Star size={13} fill="currentColor" /> {entry.rating.toFixed(1)} / 5</span>}
        {entry.review && <blockquote>{entry.review.title && <strong>{entry.review.title} · </strong>}{entry.review.content}</blockquote>}
        <time dateTime={entry.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(entry.createdAt))}</time>
      </div>
      {media?.coverImageUrl && mediaHref && <Link className="activity-cover" to={mediaHref}><img src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}${media.coverImageUrl.replace(/^\/api/, '')}`} alt="" /></Link>}
    </article>
  })}</div>
}

export function PublicListCards({ lists }: { lists: SocialList[] }) {
  if (!lists.length) return <p className="media-hint">No public lists yet.</p>
  return <div className="public-lists">{lists.map((list) => <Link className="public-list-card" to={`/lists/${list.id}`} key={list.id}>
    <span>{list.visibility === 'PUBLIC' ? <Eye size={14} /> : <EyeOff size={14} />} {list.visibility}</span><h3>{list.title}</h3><small>{list._count.items} TITLES <ArrowUpRight size={14} /></small>
  </Link>)}</div>
}
