"use client"

import { useRef } from "react";
import { Download } from "lucide-react";
import { LogoMark } from "@/components/source-landing/Logo";
import SectionTitle from "@/components/source-landing/SectionTitle";
import { gsap, useGSAP, usePrefersReducedMotion } from "@/lib/motion";

const logoVariations = [
  { type: "horizontal", bg: "white", text: "black", label: "Wordmark" },
  { type: "stacked", bg: "white", text: "black", label: "Stacked" },
  { type: "icon", bg: "white", text: "black", label: "Icon" },
  { type: "horizontal", bg: "dark", text: "white", label: "Dark Wordmark" },
  { type: "stacked", bg: "dark", text: "white", label: "Dark Stacked" },
  { type: "icon", bg: "dark", text: "white", label: "Dark Icon" },
 ] as const;

function LogoVariation({ type, text }: { type: (typeof logoVariations)[number]["type"]; text: (typeof logoVariations)[number]["text"] }) {
  const textColor = text === "white" ? "text-white" : "text-black";

  if (type === "horizontal") {
    return (
      <div className={`flex items-center gap-2 ${textColor}`}>
        <LogoMark size={28} />
        <span className="text-lg font-semibold tracking-tight">RetroPick</span>
      </div>
    );
  }

  if (type === "stacked") {
    return (
      <div className={`flex flex-col items-center gap-1 ${textColor}`}>
        <LogoMark size={28} />
        <span className="text-sm font-medium tracking-tight">RetroPick</span>
      </div>
    );
  }

  return <LogoMark size={36} />;
}

async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Brand asset download failed", error);
    window.location.href = url;
  }
}

export default function BrandKitSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion || !sectionRef.current) return;

      gsap.from(".brandkit-title-row", {
        opacity: 0,
        y: 40,
        duration: 0.6,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".brandkit-title-row",
          start: "top 85%",
        },
      });

      gsap.from(".brandkit-card", {
        opacity: 0,
        scale: 0.95,
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".brandkit-grid",
          start: "top 85%",
        },
      });
    },
    {
      scope: sectionRef,
      dependencies: [prefersReducedMotion],
      revertOnUpdate: true,
    }
  );

  return (
    <section id="brand" ref={sectionRef} className="relative w-full bg-rp-bg py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <div className="brandkit-title-row mb-10 flex items-center justify-between">
          <SectionTitle>Brand Kit</SectionTitle>
          <button
            type="button"
            onClick={() => downloadFile("/RetroPick_Brand_Assets_v1.zip", "RetroPick_Brand_Assets_v1.zip")}
            className="inline-flex items-center gap-2 rounded-lg border border-[#333] bg-rp-card px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-px hover:border-rp-blue-bright"
          >
            <Download size={16} />
            Download All
          </button>
        </div>

        <div className="brandkit-grid mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {logoVariations.map((variation) => (
            <div
              key={`${variation.type}-${variation.label}`}
              className={`brandkit-card group relative aspect-[16/10] rounded-xl transition-all duration-300 hover:-translate-y-1 ${variation.bg === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}
            >
              <div className="flex h-full items-center justify-center">
                <LogoVariation type={variation.type} text={variation.text} />
              </div>

              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <button className="flex items-center gap-1 rounded-md bg-[#222] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#333]">
                  <Download size={12} />
                  PNG
                </button>
                <button className="flex items-center gap-1 rounded-md bg-[#222] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#333]">
                  <Download size={12} />
                  SVG
                </button>
              </div>

              <span className="absolute right-3 top-3 text-[10px] text-rp-text-muted">
                {variation.label}
              </span>
            </div>
          ))}
        </div>

        <a
          href="https://drive.google.com/file/d/1mjgZViJtfiJBOhKxKPW16kUmbeV-XUwM/view?usp=sharing"
          target="_blank"
          rel="noreferrer noopener"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rp-border-blue bg-rp-card px-6 py-4 font-medium text-rp-blue transition-all duration-300 hover:border-rp-blue hover:bg-[rgba(126,184,255,0.08)]"
        >
          <Download size={18} />
          Branding Guideline PDF
        </a>
      </div>
    </section>
  );
}
