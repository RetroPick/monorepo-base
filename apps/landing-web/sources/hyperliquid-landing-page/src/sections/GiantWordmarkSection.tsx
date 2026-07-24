import ScrollReveal from '../components/ScrollReveal';

export default function GiantWordmarkSection() {
  return (
    <section className="relative bg-rp-light pt-16 pb-0 overflow-hidden">
      <ScrollReveal>
        <div className="relative text-center overflow-visible">
          <h2
            className="font-display italic font-normal text-rp-deep leading-[0.85] tracking-[-0.02em] select-none"
            style={{ fontSize: 'clamp(5rem, 14vw, 13rem)' }}
          >
            RetroPick
          </h2>
          {/* Floating icon near the 'k' */}
          <img
            src="/images/retropick-logo.png"
            alt=""
            className="absolute w-8 h-8 md:w-12 md:h-12 object-contain"
            style={{
              right: '8%',
              top: '5%',
            }}
          />
        </div>
      </ScrollReveal>
    </section>
  );
}
