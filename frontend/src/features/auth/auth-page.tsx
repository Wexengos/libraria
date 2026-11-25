import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from './auth-context'

export function AuthPage({ mode }: { mode: 'sign-in' | 'register' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { configured, session } = useAuth()
  const isRegister = mode === 'register'

  useEffect(() => {
    if (isRegister && session) navigate('/profile', { replace: true })
  }, [isRegister, navigate, session])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!supabase) {
      setError('Authentication is not configured. Add the Supabase URL and publishable key to the environment.')
      return
    }
    setSubmitting(true)
    try {
      if (isRegister) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.toLowerCase(), display_name: displayName.trim() },
          },
        })
        if (authError) throw authError
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in to finish setting up your profile.')
        } else {
          navigate('/profile', { replace: true })
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        const from = (location.state as { from?: string } | null)?.from
        navigate(from ?? '/profile', { replace: true })
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-page">
    <p className="eyebrow">YOUR CULTURAL LIFE, IN ONE PLACE</p>
    <h1>{isRegister ? 'Join the archive.' : 'Welcome back.'}</h1>
    <p className="auth-intro">{isRegister ? 'Create an account to begin keeping what moves you.' : 'Sign in to return to your collection.'}</p>
    {!configured && <p className="form-message error">Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to enable authentication.</p>}
    <form className="auth-form" onSubmit={submit}>
      {isRegister && <>
        <label>Display name<input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={1} maxLength={80} required /></label>
        <label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} pattern="[a-z0-9]+([_-][a-z0-9]+)*" minLength={3} maxLength={24} required /><span className="field-hint">3–24 lowercase letters, numbers, underscores, or hyphens</span></label>
      </>}
      <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Password<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
      {error && <p className="form-message error" role="alert">{error}</p>}
      {notice && <p className="form-message success" role="status">{notice}</p>}
      <button className="primary-button" type="submit" disabled={submitting || !configured}>{submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</button>
    </form>
    <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Libraria?'} <Link to={isRegister ? '/sign-in' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
  </main>
}
