"use client";
import { useEffect, useState } from "react";

const DEFAULT_SLIDES = ["/hero/event-1.jpg", "/hero/event-2.jpg", "/hero/event-3.jpg", "/hero/event-4.jpg"];

interface HomeImageCarouselProps {
  images?: string[];
  className?: string;
  intervalMs?: number;
  showDots?: boolean;
}

export function HomeImageCarousel({
  images = DEFAULT_SLIDES,
  className = "",
  intervalMs = 3500,
  showDots = true,
}: HomeImageCarouselProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <div className={`relative overflow-hidden bg-navy ${className}`}>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt="Ambiance d'événement"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
      {showDots && (
        <div className="absolute top-4 right-4 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Voir la photo ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
