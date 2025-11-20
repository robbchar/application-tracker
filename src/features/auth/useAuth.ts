import { useContext } from 'react'
import { AuthContext, type AuthState } from '@/features/auth/AuthContext'

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
