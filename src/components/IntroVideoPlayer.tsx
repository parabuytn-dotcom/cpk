import type { IntroVideo } from "@/lib/siteMedia";

/**
 * Plays the intro video inside the page. YouTube goes through the
 * youtube-nocookie embed: no YouTube app, no redirect, no tracking cookie
 * until the viewer presses play, and no unrelated suggestions at the end.
 */
export default function IntroVideoPlayer({ video, title }: { video: NonNullable<IntroVideo>; title: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-xl">
      {video.kind === "youtube" ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0"
        />
      ) : (
        <video src={video.url} controls playsInline preload="metadata" className="h-full w-full">
          <track kind="captions" />
        </video>
      )}
    </div>
  );
}
