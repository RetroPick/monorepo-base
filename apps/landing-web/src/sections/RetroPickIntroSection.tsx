import { useRef, useState } from "react";
import { LogoMark } from "@/components/source-landing/Logo";
import { gsap, useGSAP, usePrefersReducedMotion } from "@/lib/motion";

export default function RetroPickIntroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion || !sectionRef.current) return;

      gsap.from(".retropick-logo", {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".retropick-logo",
          start: "top 85%",
        },
      });

      gsap.from(".retropick-heading", {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.1,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".retropick-heading",
          start: "top 85%",
        },
      });

      gsap.from(".retropick-cohort-box", {
        opacity: 0,
        y: 20,
        duration: 0.5,
        delay: 0.2,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".retropick-cohort-box",
          start: "top 85%",
        },
      });
    },
    {
      scope: sectionRef,
      dependencies: [prefersReducedMotion],
      revertOnUpdate: true,
    }
  );

  return (
    <section id="retropick" ref={sectionRef} className="relative w-full bg-rp-bg pb-16 pt-24">
      <div className="mx-auto flex max-w-[980px] flex-col items-center px-5 text-center md:px-10">
        <div className="retropick-logo flex items-center justify-center gap-3">
          <LogoMark size={40} />
          <span className="text-[32px] font-semibold tracking-tight text-white">RetroPick</span>
        </div>

        <h2 className="retropick-heading mt-6 text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Trade the Future with Prediction Markets<span className="text-rp-blue">.</span>
        </h2>

        <div className="retropick-cohort-box mt-8 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs text-white">Selected for</span>
            <a
              href="https://www.protocolcamp.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Protocol Camp"
              className="transition-opacity hover:opacity-80"
            >
              <img
                src="/images/protocolCamp.png"
                alt="Protocol Camp"
                className="h-10 w-auto max-w-[220px] object-contain brightness-0 invert md:h-12"
                loading="lazy"
              />
            </a>
            <span className="text-xs text-white">Cohort 9</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs text-white">Organized by</span>
            <a
              href="https://shardlab.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="ShardLab"
              className="transition-opacity hover:opacity-80"
            >
              <img
                src="/images/shardlab.png"
                alt="ShardLab"
                className="h-10 w-auto max-w-[180px] object-contain brightness-0 invert md:h-12"
                loading="lazy"
              />
            </a>
            <span className="text-xs text-white">×</span>
            <a
              href="https://www.hashed.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Hashed"
              className="transition-opacity hover:opacity-80"
            >
              <img
                src="/images/hashed.png"
                alt="Hashed"
                className="h-10 w-auto max-w-[160px] object-contain brightness-0 invert md:h-12"
                loading="lazy"
              />
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 w-full max-w-[1600px] px-5 md:px-10 lg:px-16 relative" id="demo">
        <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-rp-dark-blue shadow-[0_40px_120px_-70px_rgba(0,0,0,0.75)]">
          <div className="aspect-[16/9] w-full min-h-[360px] sm:min-h-[420px] md:min-h-[520px] lg:min-h-[620px]">
            <video
              ref={videoRef}
              src="/webm/Vidio Demo.webm"
              autoPlay
              loop
              muted={!soundOn}
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              aria-label="RetroPick demo video"
            />

            <button
              type="button"
              onClick={() => {
                const nextSound = !soundOn;
                setSoundOn(nextSound);
                if (videoRef.current) {
                  videoRef.current.muted = !nextSound;
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80 z-10"
            >
              {soundOn ? "Sound on" : "Sound off"}
            </button>
          </div>
        </div>

        <img
          src="/images/picky.png"
          alt="Picky mascot"
          className="absolute -bottom-32 -right-24 w-96 lg:w-[500px] h-auto opacity-90 animate-float pointer-events-none"
          loading="lazy"
        />
      </div>
    </section>
  );
}
