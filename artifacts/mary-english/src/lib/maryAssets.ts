// ─── Mary Character Asset Registry ────────────────────────────────────────────
// One Mary. Many Memories.
//
// This is the single source of truth for all Mary character asset paths and
// metadata. Every component that displays Mary imports from here.
//
// To add official portrait artwork (no other code changes needed):
//   1. Drop a portrait PNG into public/assets/mary/outfits/ using the outfit ID as
//      the filename: black.png, level.png, seasonal.png
//   2. The <picture> elements in every component will automatically use the PNG
//      and fall back to the SVG placeholder if the file is absent.
//   3. PNG or WebP recommended. Transparent background supported — the container
//      background (cardBg) shows through around the portrait.

import type { EmoteState } from "@/context/GameContext";

export type OutfitId = "default" | "black" | "level" | "seasonal";

const BASE = "/assets/mary";

// ─── Outfit images (SVG placeholders) ─────────────────────────────────────────
// These are the fallback images used when official PNG portraits are absent.
export const OUTFIT_IMAGES: Record<OutfitId, string> = {
  default:  `${BASE}/outfits/default.svg`,
  black:    `${BASE}/outfits/black.svg`,
  level:    `${BASE}/outfits/level.svg`,
  seasonal: `${BASE}/outfits/seasonal.svg`,
};

// ─── Emote images ──────────────────────────────────────────────────────────────
// Currently unused — emote differences are expressed through CSS animation only.
// When official pose-specific artwork is provided:
//   1. Add the replacement image files to public/assets/mary/emotes/
//   2. Uncomment the paths below — getMaryImage() picks them up automatically.
export const EMOTE_IMAGES: Partial<Record<EmoteState, string>> = {
  // idle:        `${BASE}/emotes/idle.svg`,
  // smile:       `${BASE}/emotes/smile.svg`,
  // cheer:       `${BASE}/emotes/cheer.svg`,
  // celebration: `${BASE}/emotes/celebration.svg`,
  // shy:         `${BASE}/emotes/shy.svg`,
};

// ─── UI images ────────────────────────────────────────────────────────────────
// Splash screen Mary (SVG placeholder, portrait orientation).
export const SPLASH_IMAGE     = `${BASE}/ui/splash.svg`;
// Drop public/assets/mary/ui/splash.png to replace the splash portrait automatically.
export const SPLASH_IMAGE_PNG = `${BASE}/ui/splash.png`;

// ─── Outfit metadata ──────────────────────────────────────────────────────────
export interface OutfitMeta {
  label: string;
  badgeLabel: string;       // Shown on the avatar card; empty string = no badge
  headerGradient: string;   // Tailwind gradient classes for outfit-themed modal headers
  cardBg: string;           // Tailwind gradient for avatar card container background
                            // Visible in letterbox areas when using object-contain
}

export const OUTFIT_META: Record<OutfitId, OutfitMeta> = {
  default: {
    label: "Default",
    badgeLabel: "",
    headerGradient: "from-primary/20 to-accent/20",
    cardBg:         "from-secondary/80 to-accent/30",
  },
  black: {
    label: "Black Outfit",
    badgeLabel: "Black Outfit",
    headerGradient: "from-slate-600 to-slate-900",
    cardBg:         "from-slate-700 to-slate-900",
  },
  level: {
    label: "Level Reward Outfit",
    badgeLabel: "Level Reward Outfit",
    headerGradient: "from-amber-300 to-orange-400",
    cardBg:         "from-amber-300 to-orange-400",
  },
  seasonal: {
    label: "Seasonal Outfit",
    badgeLabel: "Seasonal Outfit",
    headerGradient: "from-teal-300 to-emerald-400",
    cardBg:         "from-teal-300 to-emerald-400",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Resolve any outfit string to a valid OutfitId, falling back to "default".
export function resolveOutfitId(outfit: string): OutfitId {
  return (outfit as OutfitId) in OUTFIT_IMAGES
    ? (outfit as OutfitId)
    : "default";
}

// Return the PNG portrait path for a given outfit.
// Used as the <source srcSet> in <picture> elements — the browser uses this
// automatically when the file exists, with no code changes required.
// Official portrait files: black.png, level.png, seasonal.png
export function getMaryPortraitPng(outfit: string): string {
  const id = resolveOutfitId(outfit);
  return `${BASE}/outfits/${id}.png`;
}

// Return the correct Mary image for a given outfit + emote combination.
// Currently returns the outfit SVG (emote differences are CSS animations).
// When emote-specific artwork is added to EMOTE_IMAGES, it is used automatically.
export function getMaryImage(outfit: string, emote?: EmoteState): string {
  if (emote && EMOTE_IMAGES[emote]) {
    return EMOTE_IMAGES[emote]!;
  }
  return OUTFIT_IMAGES[resolveOutfitId(outfit)];
}
