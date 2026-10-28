"use client";

import { useEffect, useRef, useState } from "react";

const FILM = "/film/someone-gets-to-be-your-santa.mp4";
const POSTER = "/film/someone-gets-to-be-your-santa.jpg";

export function HeroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduce, setReduce] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);

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
    <figure>
      <div className="relative border border-rule bg-ivory-deep">
        <video
          ref={videoRef}
          className="aspect-video w-full bg-ivory-deep object-contain"
          poster={POSTER}
          muted
          playsInline
          loop
          preload={reduce ? "none" : "metadata"}
          aria-label="Someone gets to be your Santa. A person writes a wish. Someone else leaves the gift at the door and is gone before it is opened."
        >
          <source src={FILM} type="video/mp4" />
        </video>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={playing}
          className="absolute bottom-3 left-3 bg-ivory/95 px-3 py-2 font-mono text-xs uppercase tracking-wider text-evergreen"
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <figcaption className="mt-3 text-sm text-ink-soft">
        Someone gets to be your Santa. · 36 seconds
      </figcaption>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-1 text-sm font-semibold text-evergreen underline-offset-2 hover:underline"
      >
        {open ? "Hide what happens" : "What happens"}
      </button>
      {open && (
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Meera writes a wish for a notebook. Arun learns he is buying for her,
          wraps it, and leaves it at her door. He is gone before she opens it.
          She never sees who left it.
        </p>
      )}
    </figure>
  );
}
