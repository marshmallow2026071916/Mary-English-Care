import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useGame } from "@/context/GameContext";
import {
  getOutfitEmoteImage,
  getReviewRewardImage,
  getBackgroundImage,
} from "@/lib/maryAssets";

const MAX_HEARTS = 2;
const XP_PER_LEVEL = 200;

const WELCOME_MESSAGES = [
  "Welcome back, Eikichi.",
  "I'm glad you're here today, Eikichi.",
  "Shall we enjoy some English together, Eikichi?",
  "Let's take one small step today, Eikichi.",
  "I was waiting for our next conversation, Eikichi.",
  "Every little conversation matters, Eikichi.",
  "I'm happy to see you again, Eikichi.",
  "Let's make today another gentle step, Eikichi.",
  "Your English journey continues today, Eikichi.",
  "I'm ready whenever you are, Eikichi.",
];

export default function TopScreen() {
  const { gs, xpPercent } = useGame();
  const {
    level, xp, hearts,
    selectedOutfit, selectedEmote, selectedReviewReward, selectedBackground,
  } = gs;
  const [welcomeMsg] = useState(
    () => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  );

  const maryImageSrc = selectedReviewReward
    ? getReviewRewardImage(selectedReviewReward)
    : getOutfitEmoteImage(selectedOutfit, selectedEmote);

  const bgImageSrc = getBackgroundImage(selectedBackground);

  return (
    <div className="min-h-[100dvh] w-full relative flex flex-col items-center overflow-hidden">

      {/* ── Background image layer ────────────────────────────────────── */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <img
          src={bgImageSrc}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[430px] flex flex-col px-5 pt-10 pb-8 min-h-[100dvh]">

        {/* ── Compact status bar ──────────────────────────────────────── */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div
            className="shrink-0 px-3 py-1.5 bg-white/80 backdrop-blur-sm text-primary font-bold rounded-full text-sm shadow-sm"
            data-testid="badge-level"
          >
            Level {level}
          </div>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-semibold text-white/80 drop-shadow uppercase tracking-wide">XP</span>
              <span className="text-[11px] font-bold text-white/80 drop-shadow" data-testid="text-xp">
                {xp} / {XP_PER_LEVEL}
              </span>
            </div>
            <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Main visual area ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center py-4">

          {/* Speech bubble */}
          <motion.div
            className="self-end mb-3 mr-2"
            initial={{ opacity: 0, x: 12, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
            data-testid="bubble-mary-message"
          >
            <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-br-sm shadow-md border border-white/40 max-w-[230px]">
              <p className="text-sm font-medium text-foreground leading-snug">{welcomeMsg}</p>
            </div>
          </motion.div>

          {/* Mary — priority: review reward > outfit+emote */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <img
              src={maryImageSrc}
              alt="Mary"
              style={{ height: 430 }}
              className="object-contain object-top drop-shadow-lg"
              draggable={false}
              data-testid="mary-image"
            />
          </motion.div>

          {/* ── Heart gauge ─────────────────────────────────────────────── */}
          <motion.div
            className="flex items-center gap-4 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            data-testid="badge-hearts"
          >
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <motion.span
                key={i}
                className={`text-4xl leading-none drop-shadow ${i < hearts ? "text-accent" : "text-white/30"}`}
                animate={i < hearts ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
              >
                ♥
              </motion.span>
            ))}
          </motion.div>
        </div>

        {/* ── Navigation buttons ──────────────────────────────────────── */}
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
        >
          <Link href="/review-log" className="flex-1">
            <div
              className="bg-primary hover:bg-primary/90 active:scale-95 transition-all text-center py-4 rounded-3xl font-bold text-primary-foreground text-sm shadow-sm border-b-4 border-primary-foreground/20 cursor-pointer"
              data-testid="btn-review-log"
            >
              Review Log
            </div>
          </Link>
          <Link href="/tasks" className="flex-1">
            <div
              className="bg-primary hover:bg-primary/90 active:scale-95 transition-all text-center py-4 rounded-3xl font-bold text-primary-foreground text-sm shadow-sm border-b-4 border-primary-foreground/20 cursor-pointer"
              data-testid="btn-tasks"
            >
              Tasks
            </div>
          </Link>
          <Link href="/options" className="flex-1">
            <div
              className="bg-primary hover:bg-primary/90 active:scale-95 transition-all text-center py-4 rounded-3xl font-bold text-primary-foreground text-sm shadow-sm border-b-4 border-primary-foreground/20 cursor-pointer"
              data-testid="btn-options"
            >
              Options
            </div>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
