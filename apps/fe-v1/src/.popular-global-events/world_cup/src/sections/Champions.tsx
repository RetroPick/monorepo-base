import { recentWinners, mostTitles, goldenBallWinners } from '../data/champions';
import { Trophy } from 'lucide-react';

function FlagIcon({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={code}
      className="w-5 h-4 object-cover rounded-sm"
      loading="lazy"
    />
  );
}

export default function Champions() {
  return (
    <section className="bg-white px-4 lg:px-6 py-14">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display font-extrabold text-2xl lg:text-3xl text-[#1A1A1A] text-center mb-10">
          WORLD CUP CHAMPIONS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Recent Winners */}
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Recent Winners
            </h3>
            <div className="space-y-0">
              {recentWinners.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3 border-b border-[#E0E0E0] last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <FlagIcon code={item.code} />
                    <span className="text-sm font-medium text-[#1A1A1A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {item.country}
                    </span>
                  </div>
                  <span className="text-sm text-[#666]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item.year}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Titles */}
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Most Titles
            </h3>
            <div className="space-y-0">
              {mostTitles.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3 border-b border-[#E0E0E0] last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <FlagIcon code={item.code} />
                    <span className="text-sm font-medium text-[#1A1A1A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {item.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: item.trophies }).map((_, tidx) => (
                      <Trophy key={tidx} className="w-3.5 h-3.5 text-[#D4A017] fill-[#D4A017]" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Golden Ball Winners */}
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Golden Ball Winners
            </h3>
            <div className="space-y-0">
              {goldenBallWinners.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3 border-b border-[#E0E0E0] last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <FlagIcon code={item.code} />
                    <span className="text-sm font-medium text-[#1A1A1A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {item.player}
                    </span>
                  </div>
                  <span className="text-sm text-[#666]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item.year}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
