import Image from "next/image";
import Link from "next/link";

import { steps } from "./landing-data";

export function StepsSection() {
  return (
    <section id="how-it-works" className="section-pinned z-20">
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="steps-phone pointer-events-none absolute left-1/2 top-[8vh] w-[clamp(720px,120vw,1680px)] max-w-[160vw] -translate-x-1/2 max-md:w-[135vw] md:max-w-[140vw]">
          <Image
            src="/images/laptop.png"
            alt="RetroPick desktop interface"
            width={2400}
            height={1400}
            sizes="(max-width: 768px) 135vw, 120vw"
            className="h-auto w-full"
          />
        </div>

        {steps.map((step) => (
          <div
            key={step.number}
            className={`${step.className} floating card-dark absolute w-[clamp(200px,22vw,320px)] p-6 max-md:relative max-md:left-auto max-md:right-auto max-md:top-auto max-md:bottom-auto max-md:w-[min(86vw,360px)] max-md:translate-x-0`}
            style={step.style}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-sm text-[#00D4FF]">{step.number}</span>
              <div className="h-px w-8 bg-[#00D4FF]/50" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-[#A9B0BC]">{step.body}</p>
            <Link href="/how-it-works" className="mt-4 inline-block text-sm text-[#00D4FF] underline underline-offset-4 hover:no-underline">
              Learn more
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
