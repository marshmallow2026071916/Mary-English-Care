import { useEffect } from "react";
import { motion } from "framer-motion";
import { SPLASH_IMAGE, SPLASH_IMAGE_PNG } from "@/lib/maryAssets";

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
      {/* Mary card — bg-slate-900 shows through letterbox areas when using object-contain */}
      <motion.div
        className="relative w-52 h-72 rounded-3xl border-2 border-white/20 shadow-2xl overflow-hidden mb-8 bg-slate-900"
        initial={{ opacity: 0, y: 40, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Portrait artwork — PNG first (official), SVG fallback (placeholder).
            Drop public/assets/mary/ui/splash.png to update with no code change. */}
        <picture style={{ display: "contents" }}>
          <source srcSet={SPLASH_IMAGE_PNG} type="image/png" />
          <img
            src={SPLASH_IMAGE}
            alt="Mary"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </picture>

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {/* Animated "Mary" label */}
        <motion.span
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-2xl italic font-semibold text-slate-200 z-10 whitespace-nowrap"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          Mary
        </motion.span>

        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/25 to-white/0 pointer-events-none"
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
        className="text-sm text-muted-foreground mt-2 font-medium"
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
