import { films } from "@/lib/media";

const FILM = films.hero;
const POSTER = "/film/someone-gets-to-be-your-santa.jpg";

export function HeroFilm() {
  return (
    <div className="absolute inset-0">
      <video
        className="h-full w-full object-cover motion-reduce:hidden"
        poster={POSTER}
        muted
        playsInline
        loop
        autoPlay
        preload="none"
        aria-describedby="hero-film-still"
      >
        <source src={FILM} type="video/mp4" />
      </video>
      <img
        src={POSTER}
        alt=""
        fetchPriority="high"
        decoding="async"
        className="hidden h-full w-full object-cover motion-reduce:block"
      />
      <p id="hero-film-still" className="sr-only">
        Someone gets to be your Santa. The still shows a wrapped gift and the
        Elf Match card before the film plays.
      </p>
    </div>
  );
}
