import { motion, type TargetAndTransition } from "framer-motion";
import { type EmoteState } from "@/context/GameContext";

interface MaryAvatarProps {
  height?: number;
  className?: string;
  showEmote?: boolean;
  outfit?: string;
  emote?: EmoteState;
}

// ─── Outfit styles ─────────────────────────────────────────────────────────────
const OUTFIT_STYLES: Record<string, { bg: string; text: string; badge: string }> = {
  black: {
    bg: "from-slate-700 to-slate-900",
    text: "text-slate-200",
    badge: "Black Outfit",
  },
  level: {
    bg: "from-amber-300 to-orange-400",
    text: "text-amber-900",
    badge: "Level Reward Outfit",
  },
  seasonal: {
    bg: "from-teal-300 to-emerald-400",
    text: "text-teal-900",
    badge: "Seasonal Outfit",
  },
};
const DEFAULT_STYLE = {
  bg: "from-secondary/80 to-accent/30",
  text: "text-primary/80",
  badge: "",
};

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
}: MaryAvatarProps) {
  const style = OUTFIT_STYLES[outfit] ?? DEFAULT_STYLE;
  const animation = getAvatarAnimation(emote);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <motion.div
        className={`w-48 bg-gradient-to-br ${style.bg} rounded-3xl border-2 border-white/50 shadow-sm flex flex-col items-center justify-center overflow-hidden relative gap-1`}
        style={{ height }}
        animate={animation}
        data-testid="mary-avatar-box"
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Label */}
        <span className={`text-xl italic font-semibold z-10 relative ${style.text}`}>Mary</span>

        {/* Outfit badge (small, only when not default) */}
        {style.badge && (
          <span className={`text-[10px] font-bold z-10 relative px-2 py-0.5 rounded-full bg-white/20 ${style.text} opacity-80`}>
            {style.badge}
          </span>
        )}

        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0"
          animate={{ x: ["-200%", "200%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 1 }}
        />
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
