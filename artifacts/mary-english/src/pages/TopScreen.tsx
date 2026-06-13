import { motion } from "framer-motion";
import { Link } from "wouter";
import { MaryAvatar } from "@/components/MaryAvatar";
import { BottomNav } from "@/components/BottomNav";
import { useGame } from "@/context/GameContext";

const MAX_HEARTS = 2;

export default function TopScreen() {
  const { gs, xpPercent, emote } = useGame();
  const { level, xp, hearts, equippedOutfit } = gs;

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-10">

        {/* Header */}
        <motion.h1
          className="text-3xl font-bold text-center text-primary mb-6 drop-shadow-sm tracking-tight"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="text-app-title"
        >
          Mary English
        </motion.h1>

        {/* Status Bar */}
        <motion.div
          className="flex justify-between items-center bg-card rounded-2xl p-4 shadow-sm border border-border mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-full text-sm"
            data-testid="badge-level"
          >
            Level {level}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-muted-foreground" data-testid="text-xp">
              XP {xp} / 200
            </span>
            <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 font-bold" data-testid="badge-hearts">
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <motion.span
                key={i}
                className={i < hearts ? "text-accent" : "text-muted-foreground/40"}
                animate={i < hearts ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              >
                ❤
              </motion.span>
            ))}
            <span className="ml-1 text-sm text-foreground">{hearts} / {MAX_HEARTS}</span>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative my-4">

          {/* Message Bubble */}
          <motion.div
            className="absolute -top-6 -right-2 md:right-4 bg-white px-5 py-3 rounded-2xl rounded-bl-sm shadow-md border border-border/50 z-20 max-w-[200px]"
            initial={{ opacity: 0, scale: 0.8, x: -10, y: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{ delay: 0.3, type: "spring", bounce: 0.4 }}
            data-testid="bubble-mary-message"
          >
            <p className="text-sm font-medium text-foreground leading-relaxed">
              Welcome back, Yamaguchi.
            </p>
          </motion.div>

          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <MaryAvatar outfit={equippedOutfit} emote={emote} showEmote />
          </motion.div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col gap-3 mt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Link href="/review-log">
              <div
                className="w-full bg-card hover:bg-card/80 active:scale-95 transition-all text-center py-4 rounded-3xl shadow-sm border border-border font-bold text-foreground cursor-pointer"
                data-testid="btn-review-log"
              >
                Review Log
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Link href="/tasks">
              <div
                className="w-full bg-primary hover:bg-primary/90 active:scale-95 transition-all text-center py-4 rounded-3xl shadow-sm border-b-4 border-primary-foreground/20 font-bold text-primary-foreground cursor-pointer"
                data-testid="btn-tasks"
              >
                Tasks
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Link href="/options">
              <div
                className="w-full bg-card hover:bg-card/80 active:scale-95 transition-all text-center py-4 rounded-3xl shadow-sm border border-border font-bold text-foreground cursor-pointer"
                data-testid="btn-options"
              >
                Options
              </div>
            </Link>
          </motion.div>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
