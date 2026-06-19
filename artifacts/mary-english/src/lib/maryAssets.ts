// ─── Mary Character Asset Registry ────────────────────────────────────────────
// One Mary. Many Memories.
//
// This is the single source of truth for all Mary character asset paths and
// metadata. Every component that displays Mary imports from here.
//
// To replace placeholder artwork with official assets:
//   1. Drop replacement files into public/assets/mary/ with the same filenames.
//   2. PNG or WebP recommended for production; current files are SVG placeholders.
//   3. No code changes required for outfit image swaps.
//   4. For per-emote artwork: uncomment paths in EMOTE_IMAGES below.

import type { EmoteState } from "@/context/GameContext";

export type OutfitId = "default" | "black" | "level" | "seasonal";

const BASE = "/assets/mary";

// ─── Outfit images ─────────────────────────────────────────────────────────────
// Changing the equipped outfit automatically updates MaryAvatar everywhere via
// these paths. Replace the SVG files with official artwork to update the whole app.
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
// Splash screen Mary (portrait, taller crop — 208×288 display area).
export const SPLASH_IMAGE = `${BASE}/ui/splash.svg`;

// ─── Outfit metadata ──────────────────────────────────────────────────────────
export interface OutfitMeta {
  label: string;
  badgeLabel: string;       // Shown on the avatar card; empty string = no badge
  headerGradient: string;   // Tailwind gradient classes for outfit-themed modal headers
}

export const OUTFIT_META: Record<OutfitId, OutfitMeta> = {
  default: {
    label: "Default",
    badgeLabel: "",
    headerGradient: "from-primary/20 to-accent/20",
  },
  black: {
    label: "Black Outfit",
    badgeLabel: "Black Outfit",
    headerGradient: "from-slate-600 to-slate-900",
  },
  level: {
    label: "Level Reward Outfit",
    badgeLabel: "Level Reward Outfit",
    headerGradient: "from-amber-300 to-orange-400",
  },
  seasonal: {
    label: "Seasonal Outfit",
    badgeLabel: "Seasonal Outfit",
    headerGradient: "from-teal-300 to-emerald-400",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Resolve any outfit string to a valid OutfitId, falling back to "default".
export function resolveOutfitId(outfit: string): OutfitId {
  return (outfit as OutfitId) in OUTFIT_IMAGES
    ? (outfit as OutfitId)
    : "default";
}

// Return the correct Mary image for a given outfit + emote combination.
// Currently returns the outfit image (emote differences are CSS animations).
// When emote-specific artwork is added to EMOTE_IMAGES, it is used automatically.
export function getMaryImage(outfit: string, emote?: EmoteState): string {
  if (emote && EMOTE_IMAGES[emote]) {
    return EMOTE_IMAGES[emote]!;
  }
  return OUTFIT_IMAGES[resolveOutfitId(outfit)];
}
