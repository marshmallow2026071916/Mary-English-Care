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
    <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center">
      <div className="w-full max-w-[430px] flex flex-col px-5 pt-8 pb-6 min-h-[100dvh]">

        {/* ── Status bar — UI element on app background ───────────────────── */}
        <motion.div
          className="flex items-center gap-3 mb-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div
            className="shrink-0 px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-full text-sm"
            data-testid="badge-level"
          >
            Level {level}
          </div>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">XP</span>
              <span className="text-[11px] font-bold text-muted-foreground" data-testid="text-xp">
                {xp} / {XP_PER_LEVEL}
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Mary Display Area ───────────────────────────────────────────── */}
        {/* Clip container: rounded corners clip the scene background image.  */}
        {/* Mary PNG alpha channel renders transparently over scene background. */}
        <motion.div
          className="relative flex-1 rounded-3xl overflow-hidden min-h-0 shadow-lg"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Layer 1: Scene Background — fills display area only */}
          <img
            src={bgImageSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />

          {/* Layer 2 (UI overlay): Speech bubble */}
          <motion.div
            className="absolute top-4 right-4 z-20"
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.25, type: "spring", bounce: 0.4 }}
            data-testid="bubble-mary-message"
          >
            <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-tr-sm shadow-md border border-white/40 max-w-[190px]">
              <p className="text-sm font-medium text-foreground leading-snug">{welcomeMsg}</p>
            </div>
          </motion.div>

          {/* Layer 2: Mary — transparent PNG on top of scene background */}
          <img
            src={maryImageSrc}
            alt="Mary"
            className="absolute inset-0 w-full h-full object-contain object-bottom z-10"
            draggable={false}
            data-testid="mary-image"
          />
        </motion.div>

        {/* ── Hearts — UI element on app background ───────────────────────── */}
        <motion.div
          className="flex items-center justify-center gap-5 py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          data-testid="badge-hearts"
        >
          {Array.from({ length: MAX_HEARTS }).map((_, i) => (
            <motion.span
              key={i}
              className={`text-4xl leading-none ${i < hearts ? "text-accent" : "text-muted-foreground/30"}`}
              animate={i < hearts ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
            >
              ♥
            </motion.span>
          ))}
        </motion.div>

        {/* ── Navigation buttons — UI elements on app background ──────────── */}
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
