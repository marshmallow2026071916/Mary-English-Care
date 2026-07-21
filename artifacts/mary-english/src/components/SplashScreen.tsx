import { useEffect } from "react";
import { motion } from "framer-motion";

const SPLASH_MS = 2500;

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(onDone, SPLASH_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background select-none cursor-pointer"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeInOut" } }}
      onClick={onDone}
    >
      {/* Mary Display Area — rounded card containing scene BG + Mary avatar */}
      <motion.div
        className="relative w-52 h-72 rounded-3xl border-2 border-white/20 shadow-2xl overflow-hidden mb-8"
        initial={{ opacity: 0, y: 40, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Layer 1: Scene Background (background_002.png) */}
        <img
          src="/assets/backgrounds/background_002.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Layer 2: Mary — outfit_idle_000.png, transparent PNG */}
        <img
          src={`${import.meta.env.BASE_URL}assets/outfits/outfit_idle_000.png`}
          alt="Mary"
          className="absolute inset-0 w-full h-full object-contain object-bottom z-10"
          draggable={false}
        />

        {/* Bottom fade overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-20" />

        {/* Animated "Mary" label */}
        <motion.span
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-2xl italic font-semibold text-slate-200 z-30 whitespace-nowrap"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          Mary
        </motion.span>

        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/25 to-white/0 pointer-events-none z-30"
          animate={{ x: ["-200%", "200%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 0.8 }}
        />
      </motion.div>

      {/* Title */}
      <motion.h1
        className="text-4xl font-bold text-primary tracking-tight drop-shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
      >
        Mary English
      </motion.h1>

      <motion.p
        className="text-sm text-muted-foreground mt-1 font-semibold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        Mary English Story 1
      </motion.p>

      <motion.p
        className="text-xs text-muted-foreground/70 mt-1 font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.5 }}
      >
        English Conversation Practice
      </motion.p>

      {/* Tap hint */}
      <motion.p
        className="absolute bottom-12 text-xs text-muted-foreground/50 italic"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        tap to continue
      </motion.p>
    </motion.div>
  );
}
