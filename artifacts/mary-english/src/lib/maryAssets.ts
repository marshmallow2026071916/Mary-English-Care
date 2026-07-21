// ─── Mary Character Asset Registry ────────────────────────────────────────────
// One Mary. Many Memories.
//
// This is the single source of truth for all Mary character asset paths and
// metadata. Every component that displays Mary imports from here.
//
// To add a new outfit (e.g. "spring"):
//   1. Add "spring" to the OutfitId union below.
//   2. Drop spring_full.png and spring_bust.png into public/assets/mary/outfits/.
//   3. Add an OUTFIT_META entry and an OUTFIT_IMAGES fallback entry.
//   getMaryFullPng / getMaryBustPng pick them up automatically using the
//   default pattern {id}_full.png / {id}_bust.png inside /outfits/.
//
// For outfits whose files live outside the /outfits/ folder or use a
// non-standard filename, set fullFilename / bustFilename to an absolute URL
// path starting with "/" in OUTFIT_META. The helpers use it verbatim.

import type { EmoteState } from "@/context/GameContext";

const PUBLIC_BASE = import.meta.env.BASE_URL;

export type OutfitId = "default" | "black" | "level" | "seasonal";

const BASE = `${PUBLIC_BASE}assets/mary`;

// ─── Outfit images — <img src> fallback when no PNG source is available ───────
export const OUTFIT_IMAGES: Record<OutfitId, string> = {
  default:  `${BASE}/outfits/default.svg`,
  black:    `${BASE}/black_full.png`,   // official transparent PNG — SVG retired
  level:    `${BASE}/outfits/level.svg`,
  seasonal: `${BASE}/outfits/seasonal.svg`,
};

// ─── Emote images ──────────────────────────────────────────────────────────────
// Emote differences are expressed through CSS animation only.
// Add pose-specific artwork to public/assets/mary/emotes/ and uncomment below.
export const EMOTE_IMAGES: Partial<Record<EmoteState, string>> = {
  // idle:        `${BASE}/emotes/idle.svg`,
  // smile:       `${BASE}/emotes/smile.svg`,
  // cheer:       `${BASE}/emotes/cheer.svg`,
  // celebration: `${BASE}/emotes/celebration.svg`,
  // shy:         `${BASE}/emotes/shy.svg`,
};

// ─── Splash UI images ─────────────────────────────────────────────────────────
// Both point to the official full-body portrait so <source> and <img> agree.
export const SPLASH_IMAGE     = `${BASE}/black_full.png`;
export const SPLASH_IMAGE_PNG = `${BASE}/black_full.png`;

// ─── Outfit metadata ──────────────────────────────────────────────────────────
export interface OutfitMeta {
  label: string;
  badgeLabel: string;         // Shown on the avatar card; empty string = no badge
  headerGradient: string;     // Tailwind gradient for outfit-themed modal headers
  cardBg: string;             // Tailwind gradient for avatar card container background
  // Optional path overrides. Absolute paths (starting with "/") are used verbatim.
  // Relative names are resolved inside /assets/mary/outfits/.
  // Omit both to use the default {id}_full.png / {id}_bust.png pattern in /outfits/.
  fullFilename?: string;
  bustFilename?: string;
}

export const OUTFIT_META: Record<OutfitId, OutfitMeta> = {
  default: {
    label:          "Default",
    badgeLabel:     "",
    headerGradient: "from-primary/20 to-accent/20",
    cardBg:         "from-secondary/80 to-accent/30",
  },
  black: {
    label:          "Black Outfit",
    badgeLabel:     "Black Outfit",
    headerGradient: "from-slate-600 to-slate-900",
    cardBg:         "from-slate-700 to-slate-900",
    fullFilename: `${PUBLIC_BASE}assets/mary/black_full.png`,
    bustFilename: `${PUBLIC_BASE}assets/mary/black_bust.png`,
  },
  level: {
    label:          "Level Reward Outfit",
    badgeLabel:     "Level Reward Outfit",
    headerGradient: "from-amber-300 to-orange-400",
    cardBg:         "from-amber-300 to-orange-400",
  },
  seasonal: {
    label:          "Seasonal Outfit",
    badgeLabel:     "Seasonal Outfit",
    headerGradient: "from-teal-300 to-emerald-400",
    cardBg:         "from-teal-300 to-emerald-400",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Resolve any outfit string to a valid OutfitId, falling back to "default".
export function resolveOutfitId(outfit: string): OutfitId {
  return (outfit as OutfitId) in OUTFIT_META
    ? (outfit as OutfitId)
    : "default";
}

// Full-body portrait PNG.
// Used by: Splash, Intro, Top Screen, Options, Reward popups, Wardrobe preview.
export function getMaryFullPng(outfit: string): string {
  const id = resolveOutfitId(outfit);
  const f = OUTFIT_META[id].fullFilename;
  if (!f) return `${BASE}/outfits/${id}_full.png`;
  return f.startsWith("/") ? f : `${BASE}/outfits/${f}`;
}

// Bust portrait PNG.
// Used by: Review Log badge, Mary Profile, small avatar components, dialogue.
export function getMaryBustPng(outfit: string): string {
  const id = resolveOutfitId(outfit);
  const f = OUTFIT_META[id].bustFilename;
  if (!f) return `${BASE}/outfits/${id}_bust.png`;
  return f.startsWith("/") ? f : `${BASE}/outfits/${f}`;
}

// Backward-compatible alias → full-body portrait.
// Prefer getMaryFullPng / getMaryBustPng in new code.
export function getMaryPortraitPng(outfit: string): string {
  return getMaryFullPng(outfit);
}

// Returns the <img src> fallback for a given outfit + emote.
// Emote differences are handled via CSS animation; artwork falls back to OUTFIT_IMAGES.
export function getMaryImage(outfit: string, emote?: EmoteState): string {
  if (emote && EMOTE_IMAGES[emote]) return EMOTE_IMAGES[emote]!;
  return OUTFIT_IMAGES[resolveOutfitId(outfit)];
}

// ─── New outfit naming system helpers (outfit_NNN) ────────────────────────────
// These helpers use the numeric outfit naming scheme introduced in the wardrobe
// system. outfitId = "outfit_000", emote = "idle" → /assets/outfits/outfit_idle_000.png

// Full-body emote image for a given outfit + emote.
// outfitId: "outfit_000", emote: "idle" → /assets/outfits/outfit_idle_000.png
export function getOutfitEmoteImage(outfitId: string, emote: string): string {
  const num = outfitId.split("_")[1] ?? "000";
  return `${PUBLIC_BASE}assets/outfits/outfit_${emote}_${num}.png`;
}

// Icon/thumbnail for a given outfit (used in the wardrobe grid).
// outfitId: "outfit_000" → /assets/outfits/icon_outfit_000.png
export function getOutfitIconImage(outfitId: string): string {
  const num = outfitId.split("_")[1] ?? "000";
  return `${PUBLIC_BASE}assets/outfits/icon_outfit_${num}.png`;
}

// Image for a review reward (outfit showcase).
// rewardId: "review_reward_001" → /assets/outfits/review_reward_001.png
export function getReviewRewardImage(rewardId: string): string {
  return `${PUBLIC_BASE}assets/outfits/${rewardId}.png`;
}

// Background image path.
// bgId: "background_001" → /assets/backgrounds/background_001.png
export function getBackgroundImage(bgId: string): string {
  return `${PUBLIC_BASE}assets/backgrounds/${bgId}.png`;
}

// Returns the icon image that represents the current active display state.
//
// Icon rules:
//   No review reward → icon_outfit_NNN.png for the selected outfit
//   review_reward_NNN → icon_review_reward_NNN.png  (each reward has its own icon file)
//
// This is the single source-of-truth for the "current appearance icon" shown in the
// Tasks header, Review Log header, Mary Says, and Mary Profile card.
// Adding a new reward only requires placing icon_review_reward_NNN.png in
// public/assets/outfits/ — no code change needed.
export function getActiveIconImage(
  selectedOutfit: string,
  selectedReviewReward: string | null,
): string {
  if (!selectedReviewReward) return getOutfitIconImage(selectedOutfit);
  // review_reward_NNN → icon_review_reward_NNN.png
  const num = selectedReviewReward.split("_")[2] ?? "001";
  return `${PUBLIC_BASE}assets/outfits/icon_review_reward_${num}.png`;
}

// Returns the icon image for Review Log conversation badges.
// These are NOT the current appearance — they are based on the entry's level:
//   Level 0          → icon_outfit_000.png
//   Level 1–5        → icon_outfit_001.png
//   Level 6–10       → icon_outfit_002.png
//   …and so on.
export function getLogLevelIconImage(level: number): string {
  const outfitNum = level === 0 ? 0 : Math.ceil(level / 5);
  return `${PUBLIC_BASE}assets/outfits/icon_outfit_${String(outfitNum).padStart(3, "0")}.png`;
}
