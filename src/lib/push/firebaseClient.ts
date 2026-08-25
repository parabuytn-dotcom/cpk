import { initializeApp, getApps } from "firebase/app";

// Firebase's web config is not a secret (it's baked into every client bundle
// by design) — safe to expose via NEXT_PUBLIC_ vars.
const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseWebConfigured() {
  return Boolean(
    firebaseWebConfig.apiKey &&
      firebaseWebConfig.projectId &&
      firebaseWebConfig.appId &&
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  );
}

export function getFirebaseApp() {
  if (!isFirebaseWebConfigured()) return null;
  return getApps()[0] ?? initializeApp(firebaseWebConfig);
}
