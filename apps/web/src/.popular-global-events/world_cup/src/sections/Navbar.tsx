import { Search } from 'lucide-react';

export default function Navbar() {
  const navLinks = ['Markets', 'Macro', 'Points', 'Leaderboard', 'Referral'];

  return (
    <nav className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-[#E0E0E0] z-[100] flex items-center justify-between px-4 lg:px-6">
      {/* Logo */}
      <div className="flex items-center gap-6">
        <a href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#1A1A1A] rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-white rounded-full" />
          </div>
          <span className="font-bold text-sm text-[#1A1A1A] tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
            OPINION
          </span>
        </a>

        {/* Nav Links - Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link}
              href="#"
              className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                link === 'Points'
                  ? 'bg-[#FFF9C4] text-[#1A1A1A]'
                  : 'text-[#1A1A1A] hover:bg-gray-100'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {link}
            </a>
          ))}
        </div>
      </div>

      {/* Search + Sign In */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center bg-[#F5F5F5] rounded-full px-3 py-1.5 gap-2">
          <Search className="w-3.5 h-3.5 text-[#999]" />
          <input
            type="text"
            placeholder="Search Markets"
            className="bg-transparent text-[13px] text-[#1A1A1A] placeholder-[#999] outline-none w-32"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
          <span className="text-[#999] text-xs">/</span>
        </div>
        <button
          className="bg-[#1A1A1A] text-white text-[13px] font-semibold px-5 py-1.5 rounded-full hover:bg-[#333] transition-colors"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Sign In
        </button>
      </div>
    </nav>
  );
}
