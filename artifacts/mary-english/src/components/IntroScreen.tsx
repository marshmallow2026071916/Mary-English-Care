import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Upload, TrendingUp } from "lucide-react";

interface IntroScreenProps {
  onDone: () => void;
}

// ─── Shared slide transition ──────────────────────────────────────────────────
const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const slideTransition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };

// ─── Screen 1: Meet Mary ──────────────────────────────────────────────────────
function Screen1({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="s1"
      className="flex flex-col items-center justify-center flex-1 px-8 gap-6 text-center"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={slideTransition}
    >
      {/* Mary Display Area — scene BG + Mary avatar */}
      <motion.div
        className="relative w-44 h-60 rounded-3xl border-2 border-white/20 shadow-2xl overflow-hidden"
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Layer 1: Scene Background */}
        <img
          src="/assets/backgrounds/background_002.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* Layer 2: Mary — transparent PNG */}
        <img
          src="/assets/outfits/outfit_idle_000.png"
          alt="Mary"
          className="absolute inset-0 w-full h-full object-contain object-bottom z-10"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-20" />
      </motion.div>

      {/* Title */}
      <motion.h1
        className="text-3xl font-bold text-foreground leading-tight"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        Hello.<br />I'm Mary.
      </motion.h1>

      {/* Message */}
      <motion.p
        className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[280px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        I'm happy we'll be learning English together.
      </motion.p>

      {/* Next button */}
      <motion.button
        onClick={onNext}
        className="mt-2 px-10 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-sm active:scale-95 transition-transform"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35 }}
        whileTap={{ scale: 0.95 }}
      >
        Next
      </motion.button>
    </motion.div>
  );
}

// ─── Screen 2: How it works ───────────────────────────────────────────────────
const HOW_CARDS = [
  {
    icon: MessageSquare,
    text: "Talk with Mary using ChatGPT.",
  },
  {
    icon: Upload,
    text: "Import your progress into Mary English.",
  },
  {
    icon: TrendingUp,
    text: "Enjoy watching your English journey grow.",
  },
];

function Screen2({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="s2"
      className="flex flex-col items-center justify-center flex-1 px-6 gap-6 text-center"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={slideTransition}
    >
      <motion.h1
        className="text-2xl font-bold text-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        How Mary English works
      </motion.h1>

      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        {HOW_CARDS.map(({ icon: Icon, text }, i) => (
          <motion.div
            key={text}
            className="flex items-center gap-4 bg-secondary/50 rounded-2xl px-4 py-4 text-left"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1, duration: 0.35 }}
          >
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{text}</p>
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={onNext}
        className="mt-2 px-10 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-sm active:scale-95 transition-transform"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.35 }}
        whileTap={{ scale: 0.95 }}
      >
        Next
      </motion.button>
    </motion.div>
  );
}

// ─── Screen 3: Let's begin ───────────────────────────────────────────────────
function Screen3({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      key="s3"
      className="flex flex-col items-center justify-center flex-1 px-8 gap-6 text-center"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={slideTransition}
    >
      <motion.h1
        className="text-3xl font-bold text-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        Let's begin.
      </motion.h1>

      <motion.p
        className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[280px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        I'm looking forward to seeing you every day.
      </motion.p>

      <motion.button
        onClick={onStart}
        className="mt-2 px-12 py-4 rounded-2xl bg-primary text-primary-foreground text-base font-bold shadow-md active:scale-95 transition-transform"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
        whileTap={{ scale: 0.95 }}
      >
        Start
      </motion.button>
    </motion.div>
  );
}

// ─── Dot indicator ────────────────────────────────────────────────────────────
function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 pb-10 pt-4">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="h-2 rounded-full bg-primary"
          animate={{ width: i === current ? 20 : 8, opacity: i === current ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
export function IntroScreen({ onDone }: IntroScreenProps) {
  const [step, setStep] = useState(0);

  const handleStart = () => {
    localStorage.setItem("hasSeenIntroduction", "true");
    onDone();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[150] flex flex-col items-center bg-background select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeInOut" } }}
    >
      <div className="w-full max-w-[430px] flex flex-col flex-1">
        {/* Screens */}
        <AnimatePresence mode="wait">
          {step === 0 && <Screen1 key="s1" onNext={() => setStep(1)} />}
          {step === 1 && <Screen2 key="s2" onNext={() => setStep(2)} />}
          {step === 2 && <Screen3 key="s3" onStart={handleStart} />}
        </AnimatePresence>

        {/* Dot progress */}
        <div className="flex justify-center">
          <Dots current={step} total={3} />
        </div>
      </div>
    </motion.div>
  );
}
