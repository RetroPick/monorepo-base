import Link from "next/link";

export function FinalCtaSection() {
  return (
    <section id="final-cta" className="relative z-[60] bg-[#F4F6FA] py-[12vh]">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="final-cta-headline mb-12 text-center text-[clamp(32px,5vw,64px)] font-bold text-[#0B0C10]">
          Start picking in seconds.
        </h2>

        <div className="final-cta-card rounded-[28px] bg-[#0B0C10] p-8 md:p-12">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-semibold text-white">Open the web app</h3>
              <p className="mb-6 text-[#A9B0BC]">
                No install, no waiting. Jump straight into live markets, make your pick, and stay in the action from any device.
              </p>
              <div className="flex flex-col gap-3">
                <a href="/#hero" className="flex items-center justify-center gap-3 rounded-xl bg-white px-6 py-3 text-[#0B0C10] transition-colors hover:bg-gray-100">
                  <span className="font-semibold">Launch Web App</span>
                </a>
                <a href="/#features" className="flex items-center justify-center gap-3 rounded-xl bg-white px-6 py-3 text-[#0B0C10] transition-colors hover:bg-gray-100">
                  <span className="font-semibold">See Live Markets</span>
                </a>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-2xl font-semibold text-white">Go deeper first</h3>
              <div className="space-y-4">
                <p className="text-[#A9B0BC]">
                  The landing page should not pretend to send a message when no contact endpoint exists.
                  These links take users somewhere real instead of triggering a dead form submit.
                </p>
                <div className="space-y-3">
                  <Link
                    href="/how-it-works"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-colors hover:border-[#00D4FF]/40 hover:bg-white/10"
                  >
                    <span>Read the product overview</span>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#00D4FF]">Open</span>
                  </Link>
                  <a
                    href="/#benefits"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-colors hover:border-[#00D4FF]/40 hover:bg-white/10"
                  >
                    <span>Review the core benefits</span>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#00D4FF]">Jump</span>
                  </a>
                  <a
                    href="/#hero"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-colors hover:border-[#00D4FF]/40 hover:bg-white/10"
                  >
                    <span>Back to the main hero</span>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#00D4FF]">Top</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
