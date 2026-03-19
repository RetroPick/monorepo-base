import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PredictionRoundCard } from "./PredictionRoundCard";
import LoginModal from "@/components/auth/LoginModal";
import type { PredictionRound } from "@/types/prediction";

interface RoundCarouselProps {
  rounds: PredictionRound[];
}

export function RoundCarousel({ rounds }: RoundCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; scrollLeft: number; active: boolean; pointerId: number | null } | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const visibleRounds = rounds.slice(0, 10);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const nextIndex = visibleRounds.findIndex((round) => round.status === "next");
    if (nextIndex < 0) return;

    const nextCard = container.children[nextIndex] as HTMLElement | undefined;
    if (!nextCard) return;

    const targetScrollLeft =
      nextCard.offsetLeft - container.clientWidth / 2 + nextCard.clientWidth / 2;

    container.scrollLeft = Math.max(0, targetScrollLeft);
  }, [visibleRounds]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, a")) return;
    if (!scrollRef.current) return;

    dragStateRef.current = {
      startX: event.clientX,
      scrollLeft: scrollRef.current.scrollLeft,
      active: true,
      pointerId: event.pointerId,
    };

    scrollRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current || !dragStateRef.current?.active) return;
    const delta = event.clientX - dragStateRef.current.startX;
    scrollRef.current.scrollLeft = dragStateRef.current.scrollLeft - delta;
  };

  const endDrag = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || !scrollRef.current) return;

    if (event && dragStateRef.current.pointerId !== null && scrollRef.current.hasPointerCapture(dragStateRef.current.pointerId)) {
      scrollRef.current.releasePointerCapture(dragStateRef.current.pointerId);
    }

    dragStateRef.current = null;
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const hasHorizontalIntent = Math.abs(event.deltaX) > 0;
    const delta = hasHorizontalIntent ? event.deltaX : event.deltaY;

    if (delta === 0) return;

    event.preventDefault();
    event.stopPropagation();
    scrollRef.current.scrollLeft += delta;
  };

  const scrollByCard = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const firstCard = container.children[0] as HTMLElement | undefined;
    const secondCard = container.children[1] as HTMLElement | undefined;
    const cardWidth = firstCard?.offsetWidth ?? 320;
    const gap = secondCard ? secondCard.offsetLeft - (firstCard?.offsetLeft ?? 0) - cardWidth : 12;
    const scrollAmount = cardWidth + Math.max(gap, 0);

    container.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative py-2">
      <button
        type="button"
        onClick={() => scrollByCard("left")}
        className="absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/88 text-lg font-black text-foreground shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] backdrop-blur transition hover:bg-background"
        aria-label="Scroll rounds left"
      >
        &lt;
      </button>
      <button
        type="button"
        onClick={() => scrollByCard("right")}
        className="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/88 text-lg font-black text-foreground shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] backdrop-blur transition hover:bg-background"
        aria-label="Scroll rounds right"
      >
        &gt;
      </button>
      <div
        ref={scrollRef}
        className="flex cursor-grab gap-3 overflow-x-auto overscroll-x-contain overscroll-y-contain no-scrollbar px-10 py-2 active:cursor-grabbing"
        style={{
          scrollbarWidth: "none",
          overscrollBehaviorX: "contain",
          overscrollBehaviorY: "contain",
          touchAction: "pan-x",
          WebkitMaskImage: "linear-gradient(to right, transparent 0, rgba(0,0,0,0.22) 10px, rgba(0,0,0,0.72) 20px, black 30px, black calc(100% - 30px), rgba(0,0,0,0.72) calc(100% - 20px), rgba(0,0,0,0.22) calc(100% - 10px), transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0, rgba(0,0,0,0.22) 10px, rgba(0,0,0,0.72) 20px, black 30px, black calc(100% - 30px), rgba(0,0,0,0.72) calc(100% - 20px), rgba(0,0,0,0.22) calc(100% - 10px), transparent 100%)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={handleWheel}
      >
        {visibleRounds.map((round) => (
          <PredictionRoundCard key={round.id} round={round} onRequestLogin={() => setIsLoginOpen(true)} />
        ))}
      </div>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}
