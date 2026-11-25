import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <main className="auth-page"><p className="eyebrow">LIBRARIA ACCOUNT</p><h1>Restoring your session…</h1></main>
  if (!session) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  return <Outlet />
}
