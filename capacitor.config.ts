import type { CapacitorConfig } from "@capacitor/cli";

// App shell that loads the live, dynamic Next.js site (server actions,
// Supabase auth cookies, Realtime websockets, uploads — none of that
// survives a static export, so this points at the real deployment instead
// of bundling a static build). Swap `url` to https://cpkef.tn once its DNS
// is fully live.
const config: CapacitorConfig = {
  appId: "tn.cpkef.app",
  appName: "CPK Learn",
  webDir: "www",
  server: {
    url: "https://cpk-platform.vercel.app",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
