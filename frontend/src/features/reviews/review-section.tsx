import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Star, Trash2 } from 'lucide-react'
import { BlockingLoader } from '../../components/blocking-loader'
import { useAuth } from '../auth/auth-context'
import type { MediaCategory, MediaResult } from '../media/media-api'
import { fetchLibraryEntry } from '../library/library-api'
import { createReview, deleteReview, fetchReviews, updateReview } from './reviews-api'

export function ReviewSection({ item, category }: { item: MediaResult; category: MediaCategory }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const reviewsKey = ['media-reviews', item.provider, item.externalId]
  const reviews = useQuery({ queryKey: reviewsKey, queryFn: () => fetchReviews(item), staleTime: 30_000, retry: false })
  const libraryEntry = useQuery({
    queryKey: ['library-entry', item.provider, item.externalId],
    queryFn: () => fetchLibraryEntry(item.provider, item.externalId),
    enabled: Boolean(session),
    staleTime: 30_000,
    retry: false,
  })
  const ownReview = reviews.data?.find((review) => review.user.id === session?.user.id)

  useEffect(() => {
    setTitle(ownReview?.title ?? '')
    setContent(ownReview?.content ?? '')
  }, [ownReview?.id, ownReview?.updatedAt])

  const save = useMutation({
    mutationFn: () => ownReview
      ? updateReview(ownReview.id, { title: title.trim() || null, content: content.trim() })
      : createReview(item, category, { title: title.trim() || null, content: content.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reviewsKey })
      await queryClient.invalidateQueries({ queryKey: ['library-entry', item.provider, item.externalId] })
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteReview(ownReview!.id),
    onSuccess: async () => {
      setTitle('')
      setContent('')
      await queryClient.invalidateQueries({ queryKey: reviewsKey })
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    save.mutate()
  }

  return <section className="reviews-section" aria-labelledby="reviews-heading">
    {(save.isPending || remove.isPending) && <BlockingLoader label={save.isPending ? 'Saving your review…' : 'Removing your review…'} />}
    <div className="reviews-heading"><div><p className="eyebrow">NOTES FROM THE ARCHIVE</p><h2 id="reviews-heading">Reviews<em>.</em></h2></div><span>{reviews.data?.length ?? 0} REVIEWS</span></div>
    {reviews.isPending && <p className="media-hint">Gathering reviews…</p>}
    {reviews.isError && <p className="media-error">{reviews.error.message}</p>}
    {session ? <form className="review-form" onSubmit={submit}>
      <p className="eyebrow">{ownReview ? 'YOUR REVIEW' : 'ADD YOUR REVIEW'}</p>
      {libraryEntry.data?.rating == null
        ? <p className="review-rating-note">Choose your stars above before writing a review. Your review will use that same rating.</p>
        : <p className="review-rating-note"><Star size={14} fill="currentColor" /> Your shared rating: {libraryEntry.data.rating.toFixed(1)} / 5</p>}
      <label>Title <span>OPTIONAL</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="A few words to frame your review" /></label>
      <label>Your review<textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={5} required placeholder="What stayed with you?" /></label>
      {(save.isError || remove.isError) && <p className="form-message error" role="alert">{save.error?.message ?? remove.error?.message}</p>}
      <div className="review-form-actions"><button className="primary-button" disabled={save.isPending || libraryEntry.data?.rating == null || !content.trim()}>{save.isPending ? 'Saving…' : ownReview ? 'Update review' : 'Post review'}</button>{ownReview && <button type="button" className="library-remove-button" onClick={() => remove.mutate()} disabled={remove.isPending}><Trash2 size={15} /> Delete review</button>}</div>
    </form> : <p className="review-sign-in"><Link to="/sign-in">Sign in to write a review <ArrowUpRight size={14} /></Link></p>}
    <div className="review-list">{reviews.data?.map((review) => <article className="review-card" key={review.id}>
      <div className="review-author">{review.user.avatarUrl ? <img src={review.user.avatarUrl} alt="" /> : <span>{review.user.displayName.slice(0, 1).toUpperCase()}</span>}<div><Link to={`/u/${encodeURIComponent(review.user.username)}`}>{review.user.displayName}</Link><small>@{review.user.username}</small></div><span className="review-rating"><Star size={14} fill="currentColor" /> {review.rating == null ? 'Not rated' : `${review.rating.toFixed(1)} / 5`}</span></div>
      {review.title && <h3>{review.title}</h3>}<p>{review.content}</p>
    </article>)}</div>
    {reviews.data?.length === 0 && <p className="media-hint">No reviews yet. Start the conversation.</p>}
  </section>
}
