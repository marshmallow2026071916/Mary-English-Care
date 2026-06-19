import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { MaryAvatar } from "@/components/MaryAvatar";
import { useGame } from "@/context/GameContext";

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
  const { gs, xpPercent, emote } = useGame();
  const { level, xp, hearts, equippedOutfit } = gs;
  const [welcomeMsg] = useState(
    () => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  );

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center">
      <div className="w-full max-w-[430px] flex flex-col px-5 pt-10 pb-8 min-h-[100dvh]">

        {/* ── Compact status bar ──────────────────────────────────────── */}
        <motion.div
          className="flex items-center gap-3"
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

        {/* ── Main visual area ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center py-4">

          {/* Speech bubble — right-aligned so it looks like it's beside Mary */}
          <motion.div
            className="self-end mb-3 mr-2"
            initial={{ opacity: 0, x: 12, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
            data-testid="bubble-mary-message"
          >
            <div className="bg-white px-4 py-3 rounded-2xl rounded-br-sm shadow-md border border-border/40 max-w-[230px]">
              <p className="text-sm font-medium text-foreground leading-snug">{welcomeMsg}</p>
            </div>
          </motion.div>

          {/* Large Mary avatar — the main focus */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <MaryAvatar
              outfit={equippedOutfit}
              emote={emote}
              showEmote={false}
              height={340}
            />
          </motion.div>

          {/* ── Heart gauge — visual hearts only ─────────────────────── */}
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
                className={`text-4xl leading-none ${i < hearts ? "text-accent" : "text-muted-foreground/25"}`}
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
