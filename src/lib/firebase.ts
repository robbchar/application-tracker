import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

// TODO: consider stronger runtime validation / error messages for missing env vars.
const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}

let app: FirebaseApp | undefined

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig)
  }
  return app
}

export const auth = getAuth(getFirebaseApp())
export const googleAuthProvider = new GoogleAuthProvider()
export const db = getFirestore(getFirebaseApp())
