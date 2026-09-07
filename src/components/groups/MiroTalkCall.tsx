"use client";

/**
 * Group video/voice calls via MiroTalk P2P's free public instance
 * (p2p.mirotalk.com) — no account, no API key, nothing to configure on our
 * side. Chosen after two other options failed in real testing: meet.jit.si
 * now requires the first participant to log in with Google/GitHub/Facebook
 * to become moderator (impossible from inside an embedded iframe, so calls
 * got stuck on "waiting for a moderator" forever), and Daily.co's rooms
 * refuse to be joined without a payment method on file despite its
 * "free tier, no card" marketing. MiroTalk explicitly documents and
 * supports being embedded like this (`X-Frame-Options: ALLOWALL`), joins a
 * named room straight away with no login wall, and stays free forever since
 * it's a direct peer-to-peer WebRTC connection between browsers rather than
 * routed through a paid media server — the tradeoff is call quality/CPU
 * load rising with participant count, fine for the 2-6 person groups this
 * feature targets.
 *
 * Unlike the previous Jitsi integration, MiroTalk's iframe exposes no
 * postMessage/JS API to notify the parent page on hangup, so there's no
 * automatic "switch back to the chat tab" — the member just clicks the
 * Chat tab themselves after leaving the call.
 */
export default function MiroTalkCall({
  roomSlug,
  displayName,
}: {
  roomSlug: string;
  displayName: string;
}) {
  const params = new URLSearchParams({
    room: roomSlug,
    name: displayName,
    notify: "0",
  });

  return (
    <iframe
      src={`https://p2p.mirotalk.com/join?${params.toString()}`}
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      className="h-[70vh] w-full overflow-hidden rounded-3xl bg-black shadow-lg"
      style={{ border: 0 }}
    />
  );
}
