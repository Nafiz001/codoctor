import type { Tone } from "@/lib/demo-data";

export interface ToneSet {
  text: string;
  strongText: string;
  bg: string;
  softBg: string;
  ring: string;
  dot: string;
  border: string;
}

// Full, static class strings so Tailwind's scanner emits them.
export const TONES: Record<Tone, ToneSet> = {
  brand: {
    text: "text-brand-700",
    strongText: "text-brand-800",
    bg: "bg-brand-600",
    softBg: "bg-brand-50",
    ring: "ring-brand-200",
    dot: "bg-brand-500",
    border: "border-brand-200",
  },
  red: {
    text: "text-red-700",
    strongText: "text-red-800",
    bg: "bg-red-600",
    softBg: "bg-red-50",
    ring: "ring-red-200",
    dot: "bg-red-500",
    border: "border-red-200",
  },
  amber: {
    text: "text-amber-700",
    strongText: "text-amber-800",
    bg: "bg-amber-500",
    softBg: "bg-amber-50",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
    border: "border-amber-200",
  },
  sky: {
    text: "text-sky-700",
    strongText: "text-sky-800",
    bg: "bg-sky-600",
    softBg: "bg-sky-50",
    ring: "ring-sky-200",
    dot: "bg-sky-500",
    border: "border-sky-200",
  },
  indigo: {
    text: "text-indigo-700",
    strongText: "text-indigo-800",
    bg: "bg-indigo-600",
    softBg: "bg-indigo-50",
    ring: "ring-indigo-200",
    dot: "bg-indigo-500",
    border: "border-indigo-200",
  },
  emerald: {
    text: "text-emerald-700",
    strongText: "text-emerald-800",
    bg: "bg-emerald-600",
    softBg: "bg-emerald-50",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
  },
  slate: {
    text: "text-slate-600",
    strongText: "text-slate-800",
    bg: "bg-slate-600",
    softBg: "bg-slate-100",
    ring: "ring-slate-200",
    dot: "bg-slate-400",
    border: "border-slate-200",
  },
};
