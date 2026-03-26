import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";

export function HeroSection() {
  return (
    <section id="hero" className="section-pinned z-10">
      <div className="hero-bg absolute inset-0 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.18),_transparent_36%),radial-gradient(circle_at_82%_22%,_rgba(11,12,16,0.08),_transparent_22%),linear-gradient(180deg,_#FFFFFF_0%,_#F7FAFF_100%)]" />
      </div>

      <nav className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-[4vw] py-[4vh]">
        <div className="hero-logo text-2xl font-bold tracking-tight text-[#0B0C10]">
          Retro<span className="text-[#00D4FF]">Pick</span>
        </div>
        <div className="hero-nav hidden items-center gap-8 md:flex">
          <Link href="/how-it-works" className="text-sm text-[#5A6270] transition-colors hover:text-[#0B0C10]">
            How it works
          </Link>
          <a href="#features" className="text-sm text-[#5A6270] transition-colors hover:text-[#0B0C10]">
            Features
          </a>
          <a href="#benefits" className="text-sm text-[#5A6270] transition-colors hover:text-[#0B0C10]">
            Benefits
          </a>
          <a href="https://retropickevent.vercel.app/app/markets/updown" className="btn-primary px-5 py-2 text-sm">
            Play
          </a>
        </div>
        <details className="relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center text-[#0B0C10]">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open navigation menu</span>
          </summary>
          <div className="absolute right-0 top-10 w-56 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-[0_20px_60px_rgba(11,12,16,0.16)] backdrop-blur">
            <div className="flex flex-col gap-1">
              <Link href="/how-it-works" className="rounded-xl px-3 py-2 text-sm text-[#3D4654] transition-colors hover:bg-[#F4F6FA] hover:text-[#0B0C10]">
                How it works
              </Link>
              <a href="#features" className="rounded-xl px-3 py-2 text-sm text-[#3D4654] transition-colors hover:bg-[#F4F6FA] hover:text-[#0B0C10]">
                Features
              </a>
              <a href="#benefits" className="rounded-xl px-3 py-2 text-sm text-[#3D4654] transition-colors hover:bg-[#F4F6FA] hover:text-[#0B0C10]">
                Benefits
              </a>
              <a href="https://retropickevent.vercel.app/app/markets/updown" className="btn-primary mt-2 px-4 py-2 text-center text-sm">
                Play
              </a>
            </div>
          </div>
        </details>
      </nav>

      <div className="relative z-10 flex h-full items-center">
        <div className="mx-auto w-full max-w-[min(1280px,90vw)] px-[4vw]">
          <div className="max-w-[min(42vw,560px)] max-md:max-w-full">
            <h1 className="text-[clamp(48px,9vw,140px)] font-bold leading-[0.9]">
              <span className="hero-headline-1 block text-[#0B0C10]">Catch the</span>
              <span className="hero-headline-2 mt-2 block text-[#00D4FF]">next move.</span>
            </h1>
            <p className="hero-subheadline mt-8 max-w-[min(30vw,420px)] text-[clamp(16px,1.5vw,24px)] leading-relaxed text-[#3D4654] max-md:max-w-xl">
              Quick market rounds for one sharp call at a time.
            </p>
            <div className="hero-cta mt-8 flex items-center gap-4">
              <a href="https://retropickevent.vercel.app/app/markets/updown" className="btn-primary flex items-center gap-2">
                Start a Round
                <ChevronRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-phone absolute right-[18vw] top-[18vh] z-10 w-[clamp(280px,32vw,500px)] max-md:right-[8vw] max-md:top-auto max-md:bottom-[8vh] max-md:w-[clamp(220px,54vw,360px)]">
        <Image
          src="/images/phone-mockup.png"
          alt="RetroPick mobile interface"
          width={1000}
          height={1800}
          priority
          sizes="(max-width: 768px) 54vw, 32vw"
          className="h-auto w-full drop-shadow-2xl"
        />
      </div>
    </section>
  );
}
