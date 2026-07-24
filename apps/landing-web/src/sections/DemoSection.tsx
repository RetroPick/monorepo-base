import SectionMediaVideo from "@/components/source-landing/SectionMediaVideo";

export default function DemoSection() {
  return (
    <section id="demo" className="relative w-full bg-rp-bg py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <div className="mt-0 overflow-hidden rounded-[32px] border border-white/10 bg-rp-dark-blue shadow-[0_40px_120px_-70px_rgba(0,0,0,0.75)]">
          <div className="aspect-[16/9] w-full">
            <SectionMediaVideo
              src="/webm/Vidio Demo.webm"
              title="RetroPick demo video"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
