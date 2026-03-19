import Image from "next/image";
import Link from "next/link";

import { benefits } from "./landing-data";

export function BenefitsSection() {
  return (
    <section id="benefits" className="section-pinned z-40 bg-[#F4F6FA]">
      <div className="relative z-10 flex h-full items-center px-[6vw] max-md:flex-col max-md:justify-center max-md:gap-10 max-md:py-20">
        <div className="benefits-text-group max-w-[40vw] flex-1 max-md:max-w-3xl">
          <h2 className="benefits-headline mb-8 text-[clamp(36px,5vw,80px)] font-bold leading-tight text-[#0B0C10]">
            Built for
            <br />
            momentum.
          </h2>
          <div className="benefits-body space-y-6">
            {benefits.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="flex items-start gap-4">
                  <Icon className="mt-1 h-5 w-5 flex-shrink-0 text-[#00D4FF]" />
                  <div>
                    <h4 className="mb-1 font-semibold text-[#0B0C10]">{item.title}</h4>
                    <p className="text-sm text-[#5A6270]">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex items-center gap-4">
            <a href="#final-cta" className="btn-primary">
              Launch App
            </a>
            <Link href="/how-it-works" className="text-[#0B0C10] underline underline-offset-4 transition-colors hover:text-[#00D4FF]">
              View Markets
            </Link>
          </div>
        </div>

        <div className="benefits-card absolute right-[6vw] top-[14vh] h-[72vh] w-[42vw] overflow-hidden rounded-[28px] shadow-2xl max-md:relative max-md:right-auto max-md:top-auto max-md:h-[48vh] max-md:w-full max-md:max-w-2xl">
          <Image
            src="/images/benefits-lifestyle.jpg"
            alt="Person using RetroPick"
            fill
            sizes="(max-width: 768px) 100vw, 42vw"
            className="object-cover"
          />
          <div className="absolute bottom-6 left-6">
            <p className="text-lg font-medium text-white">Play the move.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
