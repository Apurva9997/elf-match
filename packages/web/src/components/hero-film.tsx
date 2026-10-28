"use client";

import { useEffect, useRef, useState } from "react";

const FILM = "/film/someone-gets-to-be-your-santa.mp4";
const POSTER = "/film/someone-gets-to-be-your-santa.jpg";

export function HeroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduce, setReduce] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduce) return;
    video.muted = true;
    const start = video.play();
    if (start) {
      start.then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [reduce]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster={POSTER}
        muted
        playsInline
        loop
        preload={reduce ? "none" : "metadata"}
      >
        <source src={FILM} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? "Pause the film" : "Play the film"}
        className="absolute bottom-4 right-4 z-10 min-h-11 bg-ivory/95 px-3 font-mono text-xs uppercase tracking-wider text-evergreen"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <p className="sr-only">Someone gets to be your Santa. A short film about Elf Match.</p>
    </div>
  );
}
