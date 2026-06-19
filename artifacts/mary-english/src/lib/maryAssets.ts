// ─── Mary Character Asset Registry ────────────────────────────────────────────
// One Mary. Many Memories.
//
// This is the single source of truth for all Mary character asset paths and
// metadata. Every component that displays Mary imports from here.
//
// To add a new outfit (e.g. "spring"):
//   1. Add the OutfitId: "spring" to the OutfitId union below.
//   2. Drop spring_full.png and spring_bust.png into public/assets/mary/outfits/.
//   3. Add an OUTFIT_META entry for "spring".
//   4. Add an OUTFIT_IMAGES fallback entry for "spring".
//   That is all — getMaryFullPng / getMaryBustPng pick them up automatically.
//
// For outfits whose files have a version suffix (e.g. black_full_v1.png),
// set fullFilename / bustFilename in OUTFIT_META. Future outfits that follow
// the default {id}_full.png / {id}_bust.png pattern need no overrides.

import type { EmoteState } from "@/context/GameContext";

export type OutfitId = "default" | "black" | "level" | "seasonal";

const BASE = "/assets/mary";

// ─── Outfit images — used as <img src> fallback when no PNG is available ──────
// For outfits with official PNGs the <source srcSet> in <picture> takes priority.
export const OUTFIT_IMAGES: Record<OutfitId, string> = {
  default:  `${BASE}/outfits/default.svg`,
  black:    `${BASE}/outfits/black_full_v1.png`,   // official — SVG placeholder retired
  level:    `${BASE}/outfits/level.svg`,
  seasonal: `${BASE}/outfits/seasonal.svg`,
};

// ─── Emote images ──────────────────────────────────────────────────────────────
// Currently unused — emote differences are expressed through CSS animation only.
export const EMOTE_IMAGES: Partial<Record<EmoteState, string>> = {
  // idle:        `${BASE}/emotes/idle.svg`,
  // smile:       `${BASE}/emotes/smile.svg`,
  // cheer:       `${BASE}/emotes/cheer.svg`,
  // celebration: `${BASE}/emotes/celebration.svg`,
  // shy:         `${BASE}/emotes/shy.svg`,
};

// ─── Splash UI image ──────────────────────────────────────────────────────────
// Both constants point to the official full-body black outfit portrait so the
// <picture> source and the <img> fallback show the same image.
export const SPLASH_IMAGE     = `${BASE}/outfits/black_full_v1.png`;
export const SPLASH_IMAGE_PNG = `${BASE}/outfits/black_full_v1.png`;

// ─── Outfit metadata ──────────────────────────────────────────────────────────
export interface OutfitMeta {
  label: string;
  badgeLabel: string;         // Shown on the avatar card; empty string = no badge
  headerGradient: string;     // Tailwind gradient classes for outfit-themed modal headers
  cardBg: string;             // Tailwind gradient for avatar card container background
  // Optional explicit filenames inside public/assets/mary/outfits/.
  // When omitted, getMaryFullPng / getMaryBustPng fall back to {id}_full.png / {id}_bust.png.
  fullFilename?: string;
  bustFilename?: string;
}

export const OUTFIT_META: Record<OutfitId, OutfitMeta> = {
  default: {
    label:           "Default",
    badgeLabel:      "",
    headerGradient:  "from-primary/20 to-accent/20",
    cardBg:          "from-secondary/80 to-accent/30",
  },
  black: {
    label:           "Black Outfit",
    badgeLabel:      "Black Outfit",
    headerGradient:  "from-slate-600 to-slate-900",
    cardBg:          "from-slate-700 to-slate-900",
    fullFilename:    "black_full_v1.png",
    bustFilename:    "black_bust_v1.png",
  },
  level: {
    label:           "Level Reward Outfit",
    badgeLabel:      "Level Reward Outfit",
    headerGradient:  "from-amber-300 to-orange-400",
    cardBg:          "from-amber-300 to-orange-400",
  },
  seasonal: {
    label:           "Seasonal Outfit",
    badgeLabel:      "Seasonal Outfit",
    headerGradient:  "from-teal-300 to-emerald-400",
    cardBg:          "from-teal-300 to-emerald-400",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Resolve any outfit string to a valid OutfitId, falling back to "default".
export function resolveOutfitId(outfit: string): OutfitId {
  return (outfit as OutfitId) in OUTFIT_META
    ? (outfit as OutfitId)
    : "default";
}

// Full-body portrait PNG — for large displays (Top Screen, Splash, Options,
// Intro, Reward popups, Outfit Preview).
// Defaults to {id}_full.png; overridden per-outfit via fullFilename.
export function getMaryFullPng(outfit: string): string {
  const id = resolveOutfitId(outfit);
  const filename = OUTFIT_META[id].fullFilename ?? `${id}_full.png`;
  return `${BASE}/outfits/${filename}`;
}

// Bust portrait PNG — for small/icon uses (Review Log badge, Mary Profile card,
// small avatar components, dialogue avatars).
// Defaults to {id}_bust.png; overridden per-outfit via bustFilename.
export function getMaryBustPng(outfit: string): string {
  const id = resolveOutfitId(outfit);
  const filename = OUTFIT_META[id].bustFilename ?? `${id}_bust.png`;
  return `${BASE}/outfits/${filename}`;
}

// Backward-compatible alias — returns the full-body portrait.
// Use getMaryFullPng / getMaryBustPng directly in new code.
export function getMaryPortraitPng(outfit: string): string {
  return getMaryFullPng(outfit);
}

// Return the correct Mary image for a given outfit + emote combination.
// Returns the OUTFIT_IMAGES fallback (SVG or PNG); emote differences are CSS animations.
export function getMaryImage(outfit: string, emote?: EmoteState): string {
  if (emote && EMOTE_IMAGES[emote]) {
    return EMOTE_IMAGES[emote]!;
  }
  return OUTFIT_IMAGES[resolveOutfitId(outfit)];
}
