import { lazy, Suspense } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, BookOpen, Disc3, Film, Library, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ProtectedRoute } from './features/auth/protected-route'
import { useAuth } from './features/auth/auth-context'
import { BlockingLoader } from './components/blocking-loader'
import { supabase } from './lib/supabase'

const AuthPage = lazy(() => import('./features/auth/auth-page').then((module) => ({ default: module.AuthPage })))
const ProfilePage = lazy(() => import('./features/profile/profile-page').then((module) => ({ default: module.ProfilePage })))
const MediaDetailPage = lazy(() => import('./features/media/media-pages').then((module) => ({ default: module.MediaDetailPage })))
const MediaSearchPage = lazy(() => import('./features/media/media-pages').then((module) => ({ default: module.MediaSearchPage })))
const CreditsPage = lazy(() => import('./features/media/media-pages').then((module) => ({ default: module.CreditsPage })))
const LibraryPage = lazy(() => import('./features/library/library-pages').then((module) => ({ default: module.LibraryPage })))
const ListsPage = lazy(() => import('./features/lists/lists-pages').then((module) => ({ default: module.ListsPage })))
const ListDetailPage = lazy(() => import('./features/lists/lists-pages').then((module) => ({ default: module.ListDetailPage })))
const CommunityPage = lazy(() => import('./features/social/social-pages').then((module) => ({ default: module.CommunityPage })))
const ActivityFeedPage = lazy(() => import('./features/social/social-pages').then((module) => ({ default: module.ActivityFeedPage })))

const categories = [
  { name: 'Films', detail: 'Stories on screen', to: '/films', icon: Film, tone: 'film' },
  { name: 'Music', detail: 'Albums that stay', to: '/music', icon: Disc3, tone: 'music' },
  { name: 'Books', detail: 'Worlds between covers', to: '/books', icon: BookOpen, tone: 'books' },
]

function HomePage() {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
  const health = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/health`)
      if (!response.ok) throw new Error('API unavailable')
      return response.json() as Promise<{ status: string }>
    },
    retry: false,
    staleTime: 30_000,
  })

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={14} /> YOUR CULTURAL LIFE, IN ONE PLACE</p>
          <h1>Keep what<br />moves <span>you.</span></h1>
          <p className="hero-description">A home for the films, records, and books that become part of your story.</p>
          <a className="text-link" href="#explore">Explore the archive <ArrowDown size={16} /></a>
        </div>
        <div className="hero-art" aria-label="Abstract editorial artwork">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-disc"><span>LIBRARIA<br /><i>MMXXVI</i></span></div>
          <div className="art-caption">A LIFE IN CULTURE <span>01 / ∞</span></div>
        </div>
        <div className="hero-index"><span>01</span><span className="index-line" /><span>03</span></div>
      </section>

      <section className="explore section-wrap" id="explore">
        <div className="section-heading">
          <div><p className="eyebrow">A WORLD OF YOUR OWN</p><h2>Three ways to <em>remember.</em></h2></div>
          <p className="section-note">Collect with intention. Discover by curiosity.</p>
        </div>
        <div className="category-grid">
          {categories.map(({ name, detail, to, icon: Icon, tone }, index) => (
            <Link className={`category-card ${tone}`} to={to} key={name}>
              <div className="category-top"><span>0{index + 1}</span><ArrowUpRight size={18} /></div>
              <div className="category-illustration"><Icon strokeWidth={1} /></div>
              <div className="category-bottom"><div><h3>{name}</h3><p>{detail}</p></div><span className="card-arrow">↗</span></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="manifesto section-wrap">
        <span className="manifesto-mark">“</span>
        <p>Not just what you consumed.<br /><em>What stayed with you.</em></p>
        <span className="manifesto-credit">THE LIBRARIA INDEX — EST. 2026</span>
      </section>

      <footer className="footer"><Link className="wordmark" to="/">libraria<span>.</span></Link><span>Made for the things that matter.</span><span className="api-status"><i className={health.isSuccess ? 'online' : ''} /> API {health.isSuccess ? 'CONNECTED' : 'OFFLINE'}</span></footer>
    </main>
  )
}

export default function App() {
  const { session } = useAuth()
  return <div className="app-shell">
    <header className="topbar">
      <Link className="wordmark" to="/">libraria<span>.</span></Link>
      <nav className="main-nav" aria-label="Main navigation">
        {categories.map(({ name, to }) => <NavLink key={to} to={to}>{name}</NavLink>)}
        <NavLink to="/community">Community</NavLink>
        {session && <NavLink to="/activity">Activity</NavLink>}
        <Link to="/credits">Credits</Link>
      </nav>
      <div className="top-actions">{session ? <><Link className="library-nav-link" to="/library">My library</Link><Link className="library-nav-link" to="/lists">My lists</Link><Link className="sign-in" to="/profile">My profile <ArrowUpRight size={14} /></Link><button className="sign-out" onClick={() => void supabase?.auth.signOut()}>Sign out</button></> : <Link className="sign-in" to="/sign-in">Sign in <ArrowUpRight size={14} /></Link>}<Link aria-label="Open library" className="mobile-library" to="/library"><Library size={18} /></Link></div>
    </header>
    <Suspense fallback={<BlockingLoader label="Loading page…" />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/u/:username" element={<ProfilePage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/:category" element={<LibraryPage />} />
        <Route path="/lists" element={<ListsPage />} />
        <Route path="/activity" element={<ActivityFeedPage />} />
      </Route>
      <Route path="/lists/:id" element={<ListDetailPage />} />
      <Route path="/films" element={<MediaSearchPage category="films" />} />
      <Route path="/films/:id" element={<MediaDetailPage category="films" />} />
      <Route path="/music" element={<MediaSearchPage category="music" />} />
      <Route path="/music/:id" element={<MediaDetailPage category="music" />} />
      <Route path="/books" element={<MediaSearchPage category="books" />} />
      <Route path="/books/:id" element={<MediaDetailPage category="books" />} />
      <Route path="/credits" element={<CreditsPage />} />
      <Route path="*" element={<main className="empty-state"><p className="eyebrow">LIBRARIA</p><h1>Page not found.</h1><Link className="text-link" to="/">Back to the beginning <ArrowUpRight size={16} /></Link></main>} />
    </Routes>
    </Suspense>
  </div>
}
