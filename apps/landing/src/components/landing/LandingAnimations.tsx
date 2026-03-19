"use client";

import { useEffect } from "react";

export default function LandingAnimations() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isActive = true;

    const setup = async () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const desktopViewport = window.matchMedia("(min-width: 1024px)");

      if (prefersReducedMotion.matches || !desktopViewport.matches) {
        return;
      }

      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (!isActive) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const heroTl = gsap.timeline({ delay: 0.2 });

        heroTl
          .fromTo(".hero-bg", { opacity: 0 }, { opacity: 1, duration: 0.5 })
          .fromTo(".hero-logo", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, "-=0.3")
          .fromTo(".hero-nav", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, "-=0.3")
          .fromTo(".hero-headline-1", { y: 40, skewY: 6, opacity: 0 }, { y: 0, skewY: 0, opacity: 1, duration: 0.6 }, "-=0.2")
          .fromTo(".hero-headline-2", { y: 40, skewY: 6, opacity: 0 }, { y: 0, skewY: 0, opacity: 1, duration: 0.6 }, "-=0.5")
          .fromTo(".hero-subheadline", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.4")
          .fromTo(".hero-cta", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.3")
          .fromTo(".hero-phone", { x: 100, rotate: -10, opacity: 0 }, { x: 0, rotate: -6, opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.6");

        const heroScrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "+=130%",
            pin: true,
            scrub: 0.6,
            onLeaveBack: () => {
              gsap.set(".hero-headline-1, .hero-headline-2, .hero-subheadline, .hero-cta", { x: 0, opacity: 1 });
              gsap.set(".hero-phone", { x: 0, rotate: -6, opacity: 1 });
              gsap.set(".hero-bg", { scale: 1 });
            },
          },
        });

        heroScrollTl
          .fromTo(".hero-headline-1, .hero-headline-2, .hero-subheadline, .hero-cta", { x: 0, opacity: 1 }, { x: "-18vw", opacity: 0, ease: "power2.in" }, 0.7)
          .fromTo(".hero-phone", { x: 0, rotate: -6, opacity: 1 }, { x: "22vw", rotate: -18, opacity: 0, ease: "power2.in" }, 0.7)
          .fromTo(".hero-bg", { scale: 1 }, { scale: 1.06, ease: "none" }, 0.7);

        const createPinnedTimeline = (trigger: string, end: string, scrub = 0.6) =>
          gsap.timeline({
            scrollTrigger: {
              trigger,
              start: "top top",
              end,
              pin: true,
              scrub,
              invalidateOnRefresh: true,
            },
          });

        createPinnedTimeline("#how-it-works", "+=140%", 1)
          .fromTo(".steps-phone", { y: "10vh", opacity: 0 }, { y: 0, opacity: 1, ease: "power2.out" }, 0)
          .fromTo(".step-card-1", { x: "-60vw", opacity: 0 }, { x: 0, opacity: 1, ease: "power2.out" }, 0.05)
          .fromTo(".step-card-2", { x: "60vw", opacity: 0 }, { x: 0, opacity: 1, ease: "power2.out" }, 0.08)
          .fromTo(".step-card-3", { y: "60vh", opacity: 0 }, { y: 0, opacity: 1, ease: "power2.out" }, 0.12)
          .to(".steps-phone", { y: "-4vh", opacity: 0, ease: "power2.in" }, 0.7)
          .to(".step-card-1", { x: "-40vw", opacity: 0, ease: "power2.in" }, 0.7)
          .to(".step-card-2", { x: "40vw", opacity: 0, ease: "power2.in" }, 0.7)
          .to(".step-card-3", { y: "40vh", opacity: 0, ease: "power2.in" }, 0.7);

        createPinnedTimeline("#features", "+=130%")
          .fromTo(".features-headline", { x: "-40vw", opacity: 0 }, { x: 0, opacity: 1, ease: "power2.out" }, 0)
          .fromTo(".features-subheadline", { x: "40vw", opacity: 0 }, { x: 0, opacity: 1, ease: "power2.out" }, 0.05)
          .fromTo(".feature-card-a", { y: "70vh", opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, ease: "power2.out" }, 0.1)
          .fromTo(".feature-card-b", { y: "70vh", opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, ease: "power2.out" }, 0.14)
          .fromTo(".feature-card-c", { y: "70vh", opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, ease: "power2.out" }, 0.18)
          .to(".features-headline", { y: "-18vh", opacity: 0, ease: "power2.in" }, 0.7)
          .to(".features-subheadline", { y: "-14vh", opacity: 0, ease: "power2.in" }, 0.7)
          .to(".feature-card-a, .feature-card-b, .feature-card-c", { y: "22vh", opacity: 0, ease: "power2.in" }, 0.7);

        createPinnedTimeline("#benefits", "+=120%")
          .fromTo(".benefits-headline", { x: "-30vw", opacity: 0 }, { x: 0, opacity: 1, ease: "power2.out" }, 0)
          .fromTo(".benefits-body", { y: "20vh", opacity: 0 }, { y: 0, opacity: 1, ease: "power2.out" }, 0.08)
          .fromTo(".benefits-card", { x: "60vw", opacity: 0, scale: 0.98 }, { x: 0, opacity: 1, scale: 1, ease: "power2.out" }, 0.05)
          .to(".benefits-text-group", { x: "-18vw", opacity: 0, ease: "power2.in" }, 0.7)
          .to(".benefits-card", { x: "18vw", opacity: 0, ease: "power2.in" }, 0.7);

        createPinnedTimeline("#closing-cta", "+=120%")
          .fromTo(".cta-headline", { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, ease: "power2.out" }, 0)
          .fromTo(".cta-decor-1", { x: "-60vw", y: "40vh", rotate: -45, opacity: 0 }, { x: 0, y: 0, rotate: -18, opacity: 1, ease: "power2.out" }, 0.05)
          .fromTo(".cta-decor-2", { y: "-40vh", opacity: 0 }, { y: 0, opacity: 0.35, ease: "power2.out" }, 0.05)
          .fromTo(".cta-decor-3", { x: "60vw", y: "40vh", rotate: 45, opacity: 0 }, { x: 0, y: 0, rotate: 18, opacity: 1, ease: "power2.out" }, 0.05)
          .to(".cta-headline, .cta-buttons", { opacity: 0, ease: "power2.in" }, 0.7)
          .to(".cta-decor-1", { x: "-10vw", opacity: 0, ease: "power2.in" }, 0.7)
          .to(".cta-decor-3", { x: "10vw", opacity: 0, ease: "power2.in" }, 0.7);

        gsap.fromTo(
          ".final-cta-headline",
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            scrollTrigger: {
              trigger: "#final-cta",
              start: "top 80%",
              end: "top 55%",
              scrub: true,
            },
          },
        );

        gsap.fromTo(
          ".final-cta-card",
          { y: 60, opacity: 0, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            scrollTrigger: {
              trigger: "#final-cta",
              start: "top 70%",
              end: "top 45%",
              scrub: true,
            },
          },
        );
      });

      cleanup = () => ctx.revert();
    };

    void setup();

    return () => {
      isActive = false;
      cleanup?.();
    };
  }, []);

  return null;
}
