import ScrollReveal from '../components/ScrollReveal';

export default function TokenSection() {
  return (
    <section className="relative bg-rp-light py-32 md:py-40 overflow-hidden">
      {/* Decorative vertical lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute left-[20%] top-0 w-[1px] h-full bg-rp-deep/10"
        />
        <div
          className="absolute left-[40%] top-0 w-[1px] h-full bg-rp-deep/10"
        />
        <div
          className="absolute left-[60%] top-0 w-[1px] h-full bg-rp-deep/10"
        />
        <div
          className="absolute left-[80%] top-0 w-[1px] h-full bg-rp-deep/10"
        />
      </div>

      <div className="container-rp relative z-10">
        <div className="max-w-[680px] mx-auto text-center">
          <ScrollReveal>
            <h2 className="font-display text-[clamp(1.75rem,3.5vw,3rem)] font-normal text-rp-dark leading-snug">
              Anyone can own, govern, and secure{' '}
              <span className="font-medium">RetroPick</span> through{' '}
              <span className="font-medium">HYPE</span>, the network's native
              token.
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <p className="mt-5 text-base text-rp-dark/70">
              Own a piece of RetroPick today.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.25}>
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <a href="#" className="btn-primary">
                Start Trading
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center px-7 py-3 rounded-full border border-rp-deep/30 text-rp-dark font-medium text-sm transition-all duration-200 hover:bg-rp-deep/5"
              >
                Start Building
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
