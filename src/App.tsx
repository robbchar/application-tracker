import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { AuthPage } from '@/features/auth/AuthPage'
import { ApplicationsPage } from '@/features/applications/ApplicationsPage'
import './App.css'

const AppRoutes = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <p>Loading...</p>
    )
  }

  return (
    <main className="app-shell">
      <Routes>
        <Route
          path="/auth"
          element={user ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route
          path="/"
          element={
            user ? (
              <ApplicationsPage />
            ) : (
              <Navigate to="/auth" replace state={{ from: location }} />
            )
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? '/' : '/auth'} replace />}
        />
      </Routes>
    </main>
  )
}

export default AppRoutes
