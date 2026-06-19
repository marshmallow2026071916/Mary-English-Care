import { motion, type TargetAndTransition } from "framer-motion";
import { type EmoteState } from "@/context/GameContext";
import { getMaryImage, getMaryFullPng, getMaryBustPng, resolveOutfitId, OUTFIT_META } from "@/lib/maryAssets";

// Helper: try the primary PNG src; fall back to SVG/fallback if the file 404s.
// This replaces <picture>/<source> which can be bypassed when display:contents is set.
function withFallback(primary: string, fallback: string) {
  return {
    src: primary,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (img.src !== fallback) img.src = fallback;
    },
  };
}

interface MaryAvatarProps {
  height?: number;
  className?: string;
  showEmote?: boolean;
  outfit?: string;
  emote?: EmoteState;
  /** "full" = full-body portrait (default). "bust" = head/shoulders portrait. */
  variant?: "full" | "bust";
}

// ─── Emote config ──────────────────────────────────────────────────────────────
const EMOTE_LABELS: Record<EmoteState, string> = {
  idle: "blink / breathe / gentle smile",
  smile: "gentle smile",
  cheer: "cheer!",
  celebration: "celebration!",
  shy: "shy blush",
};

const EMOTE_PREFIXES: Record<EmoteState, string> = {
  idle: "Idle Emote:",
  smile: "Emote:",
  cheer: "Emote:",
  celebration: "Emote:",
  shy: "Emote:",
};

const EMOTE_COLORS: Record<EmoteState, string> = {
  idle: "text-muted-foreground",
  smile: "text-primary",
  cheer: "text-primary font-semibold",
  celebration: "text-amber-500 font-bold",
  shy: "text-accent-foreground",
};

// ─── Avatar animation variants ─────────────────────────────────────────────────
function getAvatarAnimation(emote: EmoteState): TargetAndTransition {
  switch (emote) {
    case "smile":
      return { y: [0, -3, 0], transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const } };
    case "cheer":
      return { y: [0, -10, -2, -8, 0], transition: { duration: 0.65, repeat: Infinity, ease: "easeOut" as const } };
    case "celebration":
      return { scale: [1, 1.06, 1], rotate: [0, 1, -1, 0], transition: { duration: 0.8, repeat: Infinity } };
    case "shy":
      return { rotate: [-3, 3, -3], x: [0, -3, 0], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const } };
    default:
      return { y: [0, -4, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } };
  }
}

export function MaryAvatar({
  height = 240,
  className = "",
  showEmote = true,
  outfit = "default",
  emote = "idle",
  variant = "full",
}: MaryAvatarProps) {
  const outfitId = resolveOutfitId(outfit);
  const meta = OUTFIT_META[outfitId];
  const svgSrc = getMaryImage(outfit, emote);
  const pngSrc = variant === "bust" ? getMaryBustPng(outfit) : getMaryFullPng(outfit);
  const animation = getAvatarAnimation(emote);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <motion.div
        className={`w-48 rounded-3xl border-2 border-white/50 shadow-sm relative overflow-hidden bg-gradient-to-br ${meta.cardBg}`}
        style={{ height }}
        animate={animation}
        data-testid="mary-avatar-box"
      >
        {/* Direct img — avoids <picture display:contents> source-selection bypass bug.
            Tries the official PNG first; falls back to SVG/PNG if the file 404s. */}
        <img
          {...withFallback(pngSrc, svgSrc)}
          alt="Mary"
          className="w-full h-full object-contain"
          draggable={false}
        />

        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/25 to-white/0 pointer-events-none"
          animate={{ x: ["-200%", "200%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 1 }}
        />

        {/* Outfit badge (only for named outfits) */}
        {meta.badgeLabel && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/25 text-white/90 whitespace-nowrap">
              {meta.badgeLabel}
            </span>
          </div>
        )}
      </motion.div>

      {showEmote && (
        <motion.span
          key={emote}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-xs italic ${EMOTE_COLORS[emote]}`}
          data-testid="text-idle-emote"
        >
          {EMOTE_PREFIXES[emote]} {EMOTE_LABELS[emote]}
        </motion.span>
      )}
    </div>
  );
}
