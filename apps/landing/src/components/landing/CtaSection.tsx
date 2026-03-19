import Image from "next/image";
import Link from "next/link";

const cards = [
  { className: "cta-decor-1 left-[10vw] top-[26vh] rotate-[-18deg]", src: "/images/4.png" },
  { className: "cta-decor-2 left-[41vw] top-[18vh]", src: "/images/5.png" },
  { className: "cta-decor-3 right-[10vw] top-[26vh] rotate-[18deg]", src: "/images/6.png" },
] as const;

export function CtaSection() {
  return (
    <section id="closing-cta" className="section-pinned z-50 bg-[#0B0C10]">
      {cards.map((card) => (
        <div
          key={card.src}
          className={`${card.className} absolute w-[18vw] overflow-hidden rounded-[20px] shadow-2xl max-md:hidden`}
        >
          <Image src={card.src} alt="" width={1200} height={1600} sizes="18vw" className="h-auto w-full" />
        </div>
      ))}

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <h2 className="cta-headline text-center text-[clamp(40px,7vw,120px)] font-bold leading-tight text-white">
          Ready to make
          <br />
          your pick?
        </h2>
        <div className="cta-buttons mt-10 flex items-center gap-4 max-md:flex-col">
          <a href="#final-cta" className="btn-primary px-8 py-4 text-lg">
            Launch App
          </a>
          <Link href="/how-it-works" className="btn-secondary px-8 py-4 text-lg">
            Browse Live Markets
          </Link>
        </div>
      </div>
    </section>
  );
}
