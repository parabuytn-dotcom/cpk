import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

export function isPushConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

let app: App | null = null;

function getFirebaseAdminApp(): App | null {
  if (!isPushConfigured()) return null;
  if (app) return app;

  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Env vars can't hold literal newlines — the key is stored with `\n`
      // escapes and unescaped here.
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
  return app;
}

export function getMessagingClient() {
  const firebaseApp = getFirebaseAdminApp();
  return firebaseApp ? getMessaging(firebaseApp) : null;
}
