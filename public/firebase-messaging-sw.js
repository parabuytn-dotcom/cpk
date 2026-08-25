// Background handler for web push (Firebase Cloud Messaging). Runs when the
// site isn't focused — a foreground tab gets messages directly through the
// Firebase JS SDK instead (see src/components/push/PushNotificationToggle.tsx).
//
// This file is a static asset — it can't read process.env, so the config
// below must be filled in by hand with the SAME values as the
// NEXT_PUBLIC_FIREBASE_* variables in .env.local. It's not secret data (the
// Firebase web config is meant to ship in the client bundle), just awkward
// to keep in sync — update both places if you ever rotate the Firebase project.
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const link = payload.data && payload.data.link;
  self.registration.showNotification(title || "CPK Learn", {
    body: body || "",
    icon: "/icon.png",
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(clients.openWindow(link));
});
