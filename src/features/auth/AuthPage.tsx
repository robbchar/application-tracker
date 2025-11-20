import { type FormEvent, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { auth, googleAuthProvider } from '@/lib/firebase'

type Mode = 'signin' | 'signup'

export const AuthPage = () => {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleAuthProvider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
    setError(null)
  }

  const title = mode === 'signin' ? 'Sign in to your tracker' : 'Create an account'
  const primaryLabel = mode === 'signin' ? 'Sign in' : 'Create account'

  return (
    <section className="auth-card">
      <h1 className="auth-title">{title}</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <div className="auth-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Working…' : primaryLabel}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleGoogleSignIn}
            disabled={submitting}
          >
            Continue with Google
          </button>
        </div>
      </form>

      <p className="auth-toggle">
        {mode === 'signin' ? "Don't have an account yet?" : 'Already have an account?'}
        <button type="button" onClick={toggleMode}>
          {mode === 'signin' ? 'Create one' : 'Sign in instead'}
        </button>
      </p>

      {error && <p className="auth-error">{error}</p>}
    </section>
  )
}


