import type { LucideIcon } from "lucide-react";
import { Clock, Compass, Eye, Shield, Target, TrendingUp, Zap } from "lucide-react";

export const benefits = [
  {
    title: "Simple markets",
    body: "Markets you can read in a glance. No complex charts.",
    icon: Zap,
  },
  {
    title: "Fast rounds",
    body: "Quick rounds that keep the action moving.",
    icon: Clock,
  },
  {
    title: "Clear timing",
    body: "Open, lock, close, result. Always transparent.",
    icon: Eye,
  },
  {
    title: "Transparent outcomes",
    body: "You always know what decides the market.",
    icon: Shield,
  },
] satisfies Array<{ title: string; body: string; icon: LucideIcon }>;

export const steps = [
  {
    number: "01",
    title: "Pick",
    body: "Choose a market and make your call: up, down, above, or below.",
    className: "step-card-1 left-[6vw] top-[18vh]",
    style: undefined,
  },
  {
    number: "02",
    title: "Lock",
    body: "Lock your pick before the timer ends. No edits.",
    className: "step-card-2 right-[6vw] top-[18vh]",
    style: { animationDelay: "0.5s" },
  },
  {
    number: "03",
    title: "Outcome",
    body: "When the round closes, the result is final and clear.",
    className: "step-card-3 left-1/2 bottom-[12vh] -translate-x-1/2",
    style: { animationDelay: "1s" },
  },
] as const;

export const features = [
  {
    title: "Direction",
    body: "Will it close higher or lower? The classic call.",
    icon: TrendingUp,
    cardClassName: "feature-card-a",
    visualClassName: "feature-visual-direction",
  },
  {
    title: "Level",
    body: "Will it finish above or below a key number?",
    icon: Target,
    cardClassName: "feature-card-b",
    visualClassName: "feature-visual-level",
  },
  {
    title: "Discovery",
    body: "Browse by asset, time left, or what's hot right now.",
    icon: Compass,
    cardClassName: "feature-card-c",
    visualClassName: "feature-visual-discovery",
  },
] satisfies Array<{
  title: string;
  body: string;
  icon: LucideIcon;
  cardClassName: string;
  visualClassName: string;
}>;
