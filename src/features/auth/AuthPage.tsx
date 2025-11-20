import { type FormEvent, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { auth, googleAuthProvider } from '@/lib/firebase'

type Mode = 'signin' | 'signup'

const getFriendlyAuthMessage = (error: unknown, mode: Mode): string => {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code: unknown }).code)

    switch (code) {
      case 'auth/invalid-email':
        return 'That email address looks invalid. Please check and try again.'
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support if you think this is a mistake.'
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Incorrect email or password. Please try again.'
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try signing in instead.'
      case 'auth/weak-password':
        return 'Please choose a stronger password (at least 6 characters).'
      case 'auth/popup-closed-by-user':
        return 'The sign-in popup was closed before completing. Please try again.'
      case 'auth/cancelled-popup-request':
        return 'Another sign-in is already in progress. Please wait a moment and try again.'
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled for this app.'
      default:
        if (code.startsWith('auth/')) {
          return 'Something went wrong while signing in. Please try again.'
        }
    }
  }

  return mode === 'signin'
    ? 'Something went wrong while signing in. Please try again.'
    : 'Something went wrong while creating your account. Please try again.'
}

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
      setError(getFriendlyAuthMessage(err, mode))
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
      setError(getFriendlyAuthMessage(err, 'signin'))
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


