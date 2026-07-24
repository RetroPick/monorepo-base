import ScrollReveal from '../components/ScrollReveal';

const stats = [
  { label: 'Block time', value: '0.07 seconds' },
  { label: 'Users', value: '2,068,206' },
  { label: 'Max TPS', value: '200,000' },
  { label: 'Daily volume', value: '$5.3B' },
];

export default function StatsBarSection() {
  return (
    <section className="relative bg-rp-deep pb-24 md:pb-32">
      <div className="container-rp">
        <ScrollReveal>
          <div className="max-w-[900px] mx-auto bg-white/[0.03] border border-white/[0.08] rounded-2xl px-8 py-10 md:px-14 md:py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`text-center ${
                    i < stats.length - 1
                      ? 'md:border-r md:border-white/[0.08]'
                      : ''
                  }`}
                >
                  <p className="text-sm font-medium text-rp-mint mb-1">
                    {stat.label}
                  </p>
                  <p className="text-[clamp(1.25rem,3vw,2.25rem)] font-medium text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
