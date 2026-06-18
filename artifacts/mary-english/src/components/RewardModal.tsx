import type { ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Heart, Star, Sparkles } from "lucide-react";
import { useGame, type ModalType } from "@/context/GameContext";
import { OUTFIT_IMAGES } from "@/lib/maryAssets";

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
    />
  );
}

function ModalCard({ children, big }: { children: React.ReactNode; big?: boolean }) {
  return (
    <motion.div
      className={`fixed z-50 left-1/2 -translate-x-1/2 ${
        big ? "top-1/2 -translate-y-1/2 w-[88vw] max-w-[380px]" : "bottom-32 w-[88vw] max-w-[380px]"
      } bg-card rounded-3xl shadow-2xl border border-border overflow-hidden`}
      initial={{ opacity: 0, scale: 0.85, y: big ? 20 : 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: big ? 10 : 20 }}
      transition={{ type: "spring", bounce: 0.35, duration: 0.45 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Level Up Modal ────────────────────────────────────────────────────────────
function LevelUpModal({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const { gs } = useGame();

  const handleClose = () => {
    onClose();
    navigate("/");
  };

  return (
    <>
      <Backdrop onClick={handleClose} />
      <ModalCard big>
        {/* Celebration header */}
        <div className="bg-gradient-to-br from-amber-300 to-orange-400 px-6 pt-8 pb-6 text-center relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0"
            animate={{ x: ["-200%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl mb-3"
          >
            <Star className="w-12 h-12 text-amber-900 mx-auto fill-amber-900" />
          </motion.div>
          <h2 className="text-2xl font-bold text-amber-900 drop-shadow-sm">Level Up!</h2>
          <p className="text-amber-800 font-semibold mt-1 text-sm">
            Now at Level {gs.level}
          </p>
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-5">
          <p className="text-foreground font-semibold text-center leading-relaxed">
            Mary got a new outfit.
          </p>

          {/* Outfit preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-24 rounded-2xl overflow-hidden shadow-md">
              <img
                src={OUTFIT_IMAGES["level"]}
                alt="Level Reward Outfit"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
            <span className="text-sm font-bold text-foreground">Level Reward Outfit</span>
            <span className="text-xs text-muted-foreground">A golden reward for levelling up!</span>
          </div>

          <button
            onClick={handleClose}
            className="w-full bg-primary hover:bg-primary/90 active:scale-95 transition-all text-primary-foreground font-bold py-3.5 rounded-2xl shadow-sm border-b-4 border-primary-foreground/20"
            data-testid="modal-levelup-close"
          >
            Continue
          </button>
        </div>
      </ModalCard>
    </>
  );
}

// ─── Daily Talk Modal ──────────────────────────────────────────────────────────
function DailyTalkModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <Backdrop onClick={onClose} />
      <ModalCard>
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 px-5 pt-6 pb-4 text-center relative overflow-hidden">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
            className="text-4xl mb-2"
          >
            <Star className="w-10 h-10 text-primary mx-auto fill-primary/70" />
          </motion.div>
          <h2 className="text-lg font-bold text-foreground">Daily Talk Complete!</h2>
        </div>
        <div className="px-5 py-5 flex flex-col items-center gap-4">
          <p className="text-foreground font-medium text-center leading-relaxed text-sm">
            Good job, Eikichi!{"\n"}Daily Talk completed.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 active:scale-95 transition-all text-primary-foreground font-bold py-3 rounded-2xl"
            data-testid="modal-daily-close"
          >
            Thanks, Mary!
          </button>
        </div>
      </ModalCard>
    </>
  );
}

// ─── Heart Modal ───────────────────────────────────────────────────────────────
function HeartModal({ onClose }: { onClose: () => void }) {
  const { gs } = useGame();
  return (
    <>
      <Backdrop onClick={onClose} />
      <ModalCard>
        <div className="bg-gradient-to-br from-rose-100 to-accent/30 px-5 pt-6 pb-4 text-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            <Heart className="w-10 h-10 text-accent mx-auto fill-accent" />
          </motion.div>
          <h2 className="text-lg font-bold text-foreground mt-2">Heart Restored!</h2>
        </div>
        <div className="px-5 py-5 flex flex-col items-center gap-4">
          <p className="text-foreground font-medium text-center text-sm leading-relaxed">
            Mary looks happy.{"\n"}Your heart gauge increased.
          </p>
          <div className="flex gap-1 text-xl">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className={i < gs.hearts ? "text-accent" : "text-muted-foreground/30"}>❤</span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 active:scale-95 transition-all text-primary-foreground font-bold py-3 rounded-2xl"
            data-testid="modal-heart-close"
          >
            Close
          </button>
        </div>
      </ModalCard>
    </>
  );
}

// ─── Seasonal Modal ────────────────────────────────────────────────────────────
function SeasonalModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <Backdrop onClick={onClose} />
      <ModalCard big>
        <div className="bg-gradient-to-br from-teal-300 to-emerald-400 px-6 pt-7 pb-5 text-center relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0"
            animate={{ x: ["-200%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
          <Sparkles className="w-10 h-10 text-teal-900 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-teal-900">Seasonal Outfit Unlocked!</h2>
        </div>
        <div className="px-6 py-6 flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-24 rounded-2xl overflow-hidden shadow-md">
              <img
                src={OUTFIT_IMAGES["seasonal"]}
                alt="Seasonal Outfit"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
            <span className="text-sm font-bold text-foreground">Seasonal Outfit</span>
            <span className="text-xs text-muted-foreground">A fresh seasonal look!</span>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 active:scale-95 transition-all text-primary-foreground font-bold py-3.5 rounded-2xl"
            data-testid="modal-seasonal-close"
          >
            Wonderful!
          </button>
        </div>
      </ModalCard>
    </>
  );
}

// ─── Small Reward Modal ────────────────────────────────────────────────────────
function SmallRewardModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <Backdrop onClick={onClose} />
      <ModalCard>
        <div className="bg-gradient-to-br from-secondary to-accent/30 px-5 pt-6 pb-4 text-center">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
            <Star className="w-10 h-10 text-primary mx-auto fill-primary/50" />
          </motion.div>
          <h2 className="text-lg font-bold text-foreground mt-2">Nice work!</h2>
        </div>
        <div className="px-5 py-5 flex flex-col items-center gap-4">
          <p className="text-foreground font-medium text-center text-sm">Keep going, Eikichi!</p>
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 active:scale-95 transition-all text-primary-foreground font-bold py-3 rounded-2xl"
            data-testid="modal-small-close"
          >
            Thanks!
          </button>
        </div>
      </ModalCard>
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
const MODAL_MAP: Record<ModalType, (p: { onClose: () => void }) => ReactElement> = {
  "level-up": LevelUpModal,
  "daily-talk": DailyTalkModal,
  heart: HeartModal,
  seasonal: SeasonalModal,
  "small-reward": SmallRewardModal,
};

export function RewardModal() {
  const { activeModal, closeModal } = useGame();
  const Component = activeModal ? MODAL_MAP[activeModal] : null;

  return (
    <AnimatePresence>
      {Component && <Component key={activeModal} onClose={closeModal} />}
    </AnimatePresence>
  );
}
