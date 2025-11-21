import '@testing-library/jest-dom/vitest'

// Provide dummy Firebase env vars for unit tests to prevent SDK initialization failures.
// These tests should not hit the network.
(import.meta as unknown as { env: Record<string, string> }).env = {
  ...(import.meta.env as Record<string, string>),
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'test-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  VITE_FIREBASE_APP_ID: '1:000000000000:web:test',
}
