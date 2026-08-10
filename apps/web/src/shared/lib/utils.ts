import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const cardBase = "rounded-2xl border border-border bg-card shadow-sm transition-colors";
export const cardBasePadded = `${cardBase} p-6`;
