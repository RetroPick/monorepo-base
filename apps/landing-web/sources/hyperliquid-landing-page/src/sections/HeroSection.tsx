import GradientBlobs from '../components/GradientBlobs';

export default function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-rp-deep">
      {/* Animated gradient blobs */}
      <GradientBlobs />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-[800px] mx-auto">
        {/* Logo icon */}
        <div className="mb-6 flex justify-center">
          <img
            src="/images/retropick-logo.png"
            alt=""
            className="w-12 h-12 object-contain"
          />
        </div>

        {/* Headline */}
        <h1 className="font-display text-[clamp(3rem,7vw,6rem)] font-normal text-white leading-[1.05] tracking-[-0.02em]">
          The Blockchain To House All Finance
        </h1>

        {/* Subtext */}
        <p className="mt-6 text-base text-white/70 max-w-[480px] mx-auto leading-relaxed">
          Crypto is fragmented today, but it doesn't need to be. For the first
          time, build projects, create value, and exchange assets on the same
          hyper-performant chain.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <a href="#" className="btn-primary">
            Start Trading
          </a>
          <a href="#" className="btn-outline">
            Start Building
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce-subtle">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}
