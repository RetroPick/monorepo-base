/**
 * 3D / gradient CTA styling aligned with `MarketCard` binary actions
 * (inset highlight, bottom “lip”, 70% opacity →100% on hover).
 */

export const marketCtaUp3d =
  "rounded-xl border border-emerald-700/95 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white opacity-70 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_3px_0_0_rgb(6,95,70),0_4px_10px_rgba(0,0,0,0.28)] transition-[opacity,transform,filter,box-shadow] duration-200 hover:opacity-100 hover:brightness-[1.06] active:translate-y-px active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.18),0_1px_0_0_rgb(6,95,70)] focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const marketCtaDown3d =
  "rounded-xl border border-rose-700/95 bg-gradient-to-b from-rose-500 to-rose-700 text-white opacity-70 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_3px_0_0_rgb(159,18,57),0_4px_10px_rgba(0,0,0,0.28)] transition-[opacity,transform,filter,box-shadow] duration-200 hover:opacity-100 hover:brightness-[1.06] active:translate-y-px active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.18),0_1px_0_0_rgb(159,18,57)] focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Primary actions (claim all, main CTAs) — blue depth, aligned with app `--primary`. */
export const marketCtaPrimary3d =
  "rounded-xl border border-blue-600/95 bg-gradient-to-b from-blue-500 to-blue-700 text-white opacity-80 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_3px_0_0_rgb(29,78,216),0_4px_10px_rgba(0,0,0,0.28)] transition-[opacity,transform,filter,box-shadow] duration-200 hover:opacity-100 hover:brightness-[1.06] active:translate-y-px active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.18),0_1px_0_0_rgb(29,78,216)] focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
