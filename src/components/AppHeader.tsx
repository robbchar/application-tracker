import { signOut } from 'firebase/auth'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { auth } from '@/lib/firebase'

type AppHeaderProps = {
  title: string
}

type NavItem = {
  label: string
  to: string
}

const navItems: NavItem[] = [
  { label: 'Applications', to: '/' },
  { label: 'Import', to: '/import' },
]

export const AppHeader = ({ title }: AppHeaderProps) => {
  const { user } = useAuth()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut(auth)
  }

  const isActiveRoute = (to: string) => {
    if (to === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(to)
  }

  return (
    <header className="app-header">
      <div>
        <h1>{title}</h1>
        {user && (
          <p className="app-subtitle">
            Signed in as <strong>{user.email ?? user.uid}</strong>
          </p>
        )}
      </div>
      <div className="app-header-actions">
        <nav className="app-nav" aria-label="Primary">
          {navItems.map((item) =>
            isActiveRoute(item.to) ? (
              <span
                key={item.to}
                className="btn-secondary app-nav-link app-nav-link-active"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link key={item.to} className="btn-secondary app-nav-link" to={item.to}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <button className="btn-secondary" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </header>
  )
}
