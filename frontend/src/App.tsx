import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, BookOpen, Disc3, Film, Library, Search, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

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

function CategoryPage({ title }: { title: string }) {
  return <main className="empty-state"><p className="eyebrow">YOUR {title.toUpperCase()} ARCHIVE</p><h1>Coming into focus.</h1><p>This collection will take shape as Libraria grows.</p><Link className="text-link" to="/">Back to the beginning <ArrowUpRight size={16} /></Link></main>
}

export default function App() {
  return <div className="app-shell">
    <header className="topbar">
      <Link className="wordmark" to="/">libraria<span>.</span></Link>
      <nav className="main-nav" aria-label="Main navigation">
        {categories.map(({ name, to }) => <NavLink key={to} to={to}>{name}</NavLink>)}
        <a href="#explore">About</a>
      </nav>
      <div className="top-actions"><button aria-label="Search" className="icon-button"><Search size={18} /></button><button className="sign-in">Sign in <ArrowUpRight size={14} /></button><button aria-label="Open library" className="mobile-library"><Library size={18} /></button></div>
    </header>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/films" element={<CategoryPage title="Films" />} />
      <Route path="/music" element={<CategoryPage title="Music" />} />
      <Route path="/books" element={<CategoryPage title="Books" />} />
      <Route path="*" element={<CategoryPage title="Archive" />} />
    </Routes>
  </div>
}
