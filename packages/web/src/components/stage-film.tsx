"use client";

import { stageScene, type StageSceneId } from "@/lib/stage-scene";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function StageFilm({
  stage,
  className,
  still: forceStill = false,
  caption = true,
}: {
  stage: StageSceneId;
  className?: string;
  still?: boolean;
  caption?: boolean;
}) {
  const scene = stageScene(stage);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduce, setReduce] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduce || !scene.film) return;
    if (paused) {
      video.pause();
      return;
    }
    video.play().catch(() => setPaused(true));
  }, [paused, reduce, scene.film, stage]);

  const still = forceStill || reduce || paused || !scene.film;

  return (
    <figure className={cn("overflow-hidden border border-rule bg-ivory", className)}>
      <div className="relative aspect-video">
        {still ? (
          // The still is the picture. The caption below names the stage.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scene.still} alt="" className="h-full w-full object-cover" />
        ) : (
          <video
            key={scene.film}
            ref={videoRef}
            className="h-full w-full object-cover"
            poster={scene.still}
            muted
            playsInline
            loop
            autoPlay
            preload="metadata"
          >
            <source src={scene.film || undefined} type="video/mp4" />
          </video>
        )}
        {scene.film && !reduce && !forceStill && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            className="absolute bottom-3 right-3 min-h-11 bg-ivory/95 px-3 font-mono text-xs uppercase tracking-wider text-evergreen"
          >
            {paused ? "Play" : "Pause"}
          </button>
        )}
      </div>
      {caption && (
        <figcaption className="px-3 py-2 text-sm text-ink-soft">{scene.caption}</figcaption>
      )}
    </figure>
  );
}
