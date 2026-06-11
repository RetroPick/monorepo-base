import { useScrollPosition } from '../hooks/useScrollPosition';

export default function Navbar() {
  const scrollY = useScrollPosition();
  const isScrolled = scrollY > window.innerHeight * 0.8;

  return (
    <nav
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between h-14 px-5 pr-2 rounded-full transition-all duration-300 max-w-[800px] w-[calc(100%-2rem)] ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-lg shadow-lg'
          : 'bg-white shadow-md'
      }`}
    >
      {/* Logo */}
      <a href="#" className="flex items-center gap-2 shrink-0">
        <img
          src="/images/retropick-logo.png"
          alt="RetroPick"
          className="w-6 h-6 object-contain"
        />
        <span className="font-display italic text-lg text-rp-deep">
          RetroPick
        </span>
      </a>

      {/* Nav Links - Desktop */}
      <div className="hidden md:flex items-center gap-7">
        <a
          href="#stats"
          className="text-sm font-medium text-rp-dark relative group"
        >
          Stats
          <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-rp-dark transition-all duration-300 group-hover:w-full" />
        </a>
        <a
          href="#docs"
          className="text-sm font-medium text-rp-dark relative group"
        >
          Docs
          <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-rp-dark transition-all duration-300 group-hover:w-full" />
        </a>
        <a
          href="#ecosystem"
          className="text-sm font-medium text-rp-dark relative group"
        >
          Ecosystem
          <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-rp-dark transition-all duration-300 group-hover:w-full" />
        </a>
      </div>

      {/* CTA */}
      <a
        href="#"
        className="shrink-0 px-5 py-2 rounded-full bg-rp-mint text-rp-deep text-sm font-medium transition-all duration-200 hover:brightness-95"
      >
        Launch App
      </a>
    </nav>
  );
}
