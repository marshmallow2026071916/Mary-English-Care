import type { ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Star, Sparkles, Heart, BookOpen } from "lucide-react";
import { useGame, type ModalType } from "@/context/GameContext";
import { MaryAvatar } from "@/components/MaryAvatar";
import { OUTFIT_IMAGES, getMaryPortraitPng, OUTFIT_META } from "@/lib/maryAssets";

// ─── Local constants ──────────────────────────────────────────────────────────
const XP_PER_LEVEL = 200;
const MAX_HEARTS = 2;

const EMOTE_DISPLAY: Record<string, string> = {
  idle:        "Idle",
  smile:       "Gentle Smile",
  cheer:       "Cheer",
  celebration: "Celebration",
  shy:         "Shy",
};

const LEVEL_UP_MESSAGES = [
  "Keep going — you're doing wonderfully.",
  "Every conversation brings you closer to fluency.",
  "Mary is proud of your progress.",
  "Your English is growing stronger every day.",
  "Beautiful work, Eikichi!",
];

// ─── Shared primitives ────────────────────────────────────────────────────────
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

function ModalCard({
  children,
  big,
}: {
  children: React.ReactNode;
  big?: boolean;
}) {
  return (
    <motion.div
      className={`fixed z-50 left-1/2 -translate-x-1/2 ${
        big
          ? "top-1/2 -translate-y-1/2 w-[88vw] max-w-[380px]"
          : "bottom-32 w-[88vw] max-w-[380px]"
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

// "Next" on all popups except the last, which shows "Finish".
function NavButton({
  onClose,
  isLast,
  label,
}: {
  onClose: () => void;
  isLast: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClose}
      className="w-full bg-primary hover:bg-primary/90 active:scale-95 transition-all text-primary-foreground font-bold py-3.5 rounded-2xl shadow-sm border-b-4 border-primary-foreground/20"
    >
      {label ?? (isLast ? "Finish" : "Next")}
    </button>
  );
}

// ─── 1. XP Gained ─────────────────────────────────────────────────────────────
function XpGainedModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
  const { popupCtx } = useGame();
  const { xpGained, xpAfterMod, levelAfter } = popupCtx;
  const percent = Math.min(100, (xpAfterMod / XP_PER_LEVEL) * 100);

  return (
    <>
      <Backdrop onClick={onClose} />
      <ModalCard>
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 px-5 pt-6 pb-4 text-center">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap className="w-10 h-10 text-primary mx-auto fill-primary/60" />
          </motion.div>
          <h2 className="text-lg font-bold text-foreground mt-2">XP Gained</h2>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* XP amount */}
          <div className="text-center">
            <span className="text-4xl font-bold text-primary">+{xpGained}</span>
            <span className="text-xl font-semibold text-primary/70 ml-1.5">XP</span>
          </div>

          {/* XP bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Level {levelAfter}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {xpAfterMod} / {XP_PER_LEVEL}
              </span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
              />
            </div>
          </div>

          <NavButton onClose={onClose} isLast={isLast} />
        </div>
      </ModalCard>
    </>
  );
}

// ─── 2. Small Reward ──────────────────────────────────────────────────────────
// Shows Mary in cheer emote + task completion label. No dialogue.
function SmallRewardModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
  const { popupCtx, gs } = useGame();
  const { smallRewardLabel } = popupCtx;
  const { equippedOutfit } = gs;

  return (
    <>
      <Backdrop onClick={onClose} />
      <ModalCard big>
        <div className="px-5 pt-7 pb-6 flex flex-col items-center gap-5">
          <MaryAvatar
            outfit={equippedOutfit}
            emote="cheer"
            height={180}
            showEmote={false}
          />
          <div className="text-center flex flex-col gap-1">
            <h2 className="text-xl font-bold text-foreground">{smallRewardLabel}</h2>
            <p className="text-sm text-muted-foreground">Well done, Eikichi.</p>
          </div>
          <NavButton onClose={onClose} isLast={isLast} />
        </div>
      </ModalCard>
    </>
  );
}

// ─── 3. Level Up ──────────────────────────────────────────────────────────────
// Shows level milestone only. Outfit is celebrated in popup #4 separately.
function LevelUpModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
  const { gs } = useGame();
  const msg = LEVEL_UP_MESSAGES[(gs.level - 1) % LEVEL_UP_MESSAGES.length];

  return (
    <>
      <Backdrop onClick={onClose} />
      <ModalCard big>
        {/* Amber celebration header */}
        <div className="bg-gradient-to-br from-amber-300 to-orange-400 px-6 pt-8 pb-6 text-center relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0"
            animate={{ x: ["-200%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Star className="w-12 h-12 text-amber-900 mx-auto fill-amber-900" />
          </motion.div>
          <h2 className="text-2xl font-bold text-amber-900 drop-shadow-sm mt-3">
            Level Up!
          </h2>
          <p className="text-amber-800 font-semibold mt-1 text-sm">
            Now at Level {gs.level}
          </p>
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-5">
          <p className="text-foreground font-semibold text-center leading-relaxed">
            Congratulations, Eikichi!
            <br />
            <span className="text-sm font-normal text-muted-foreground">{msg}</span>
          </p>
          <NavButton onClose={onClose} isLast={isLast} />
        </div>
      </ModalCard>
    </>
  );
}

// ─── 4. Level Outfit ──────────────────────────────────────────────────────────
// Mary auto-equips the outfit when this popup is closed.
function LevelOutfitModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
  const { actions } = useGame();

  const handleClose = () => {
    actions.equipOutfit("level");
    onClose();
  };

  return (
    <>
      <Backdrop onClick={handleClose} />
      <ModalCard big>
        <div className="bg-gradient-to-br from-amber-300 to-orange-400 px-6 pt-6 pb-5 text-center relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/25 to-white/0"
            animate={{ x: ["-200%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
          <Sparkles className="w-9 h-9 text-amber-900 mx-auto mb-1" />
          <h2 className="text-xl font-bold text-amber-900">New Outfit!</h2>
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-24 h-28 rounded-2xl overflow-hidden shadow-md bg-gradient-to-br ${OUTFIT_META["level"].cardBg}`}>
              <picture style={{ display: "contents" }}>
                <source srcSet={getMaryPortraitPng("level")} type="image/png" />
                <img
                  src={OUTFIT_IMAGES["level"]}
                  alt="Level Reward Outfit"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </picture>
            </div>
            <span className="text-sm font-bold text-foreground">Level Reward Outfit</span>
            <span className="text-xs text-muted-foreground">Added to your wardrobe.</span>
          </div>
          <NavButton onClose={handleClose} isLast={isLast} />
        </div>
      </ModalCard>
    </>
  );
}

// ─── 5. Emote Reward ──────────────────────────────────────────────────────────
// Shows the new emote. Does not auto-equip — Mary keeps her current emote state.
function EmoteRewardModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
  const { popupCtx, gs } = useGame();
  const { emoteReward } = popupCtx;
  const { equippedOutfit } = gs;
  const emoteName = EMOTE_DISPLAY[emoteReward] ?? emoteReward;

  return (
    <>
      <Backdrop onClick={onClose} />
      <ModalCard big>
        <div className="bg-gradient-to-br from-primary/20 to-accent/30 px-6 pt-6 pb-5 text-center">
          <Sparkles className="w-9 h-9 text-primary mx-auto mb-1" />
          <h2 className="text-xl font-bold text-foreground">New Emote!</h2>
        </div>

        <div className="px-5 py-5 flex flex-col items-center gap-4">
          <MaryAvatar
            outfit={equippedOutfit}
            emote={emoteReward}
            height={180}
            showEmote={false}
          />
          <div className="text-center flex flex-col gap-1">
            <span className="text-base font-bold text-foreground">{emoteName}</span>
            <span className="text-xs text-muted-foreground">Added to your collection.</span>
          </div>
          <NavButton onClose={onClose} isLast={isLast} />
        </div>
      </ModalCard>
    </>
  );
}

// ─── 6. Review Progress ───────────────────────────────────────────────────────
function ReviewProgressModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
  const { popupCtx } = useGame();
  const { reviewCountAfter, reviewMax } = popupCtx;
  const isComplete = reviewCountAfter >= reviewMax;

  return (
    <>
      <Backdrop onClick={onClose} />
      <ModalCard>
        <div className="bg-gradient-to-br from-teal-400/20 to-emerald-400/20 px-5 pt-6 pb-4 text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <BookOpen className="w-9 h-9 text-teal-600 mx-auto" />
          </motion.div>
          <h2 className="text-lg font-bold text-foreground mt-2">Review Progress</h2>
        </div>

        <div className="px-5 py-6 flex flex-col items-center gap-5">
          {/* Large fraction */}
          <div className="text-center">
            <span className="text-5xl font-bold text-foreground">{reviewCountAfter}</span>
            <span className="text-3xl font-semibold text-muted-foreground"> / {reviewMax}</span>
          </div>

          {/* Progress dots */}
          <div className="flex gap-3">
            {Array.from({ length: reviewMax }).map((_, i) => (
              <motion.div
                key={i}
                className={`w-4 h-4 rounded-full transition-colors ${
                  i < reviewCountAfter
                    ? "bg-teal-500"
                    : "bg-secondary border border-border"
                }`}
                initial={i < reviewCountAfter ? { scale: 0 } : {}}
                animate={i < reviewCountAfter ? { scale: 1 } : {}}
                transition={{ delay: i * 0.1, type: "spring", bounce: 0.5 }}
              />
            ))}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {isComplete
              ? "All review tasks complete!"
              : `${reviewMax - reviewCountAfter} task${reviewMax - reviewCountAfter === 1 ? "" : "s"} remaining this level.`}
          </p>

          <NavButton onClose={onClose} isLast={isLast} />
        </div>
      </ModalCard>
    </>
  );
}

// ─── 7. Review Reward ─────────────────────────────────────────────────────────
// Heart recovered variant — or Seasonal Outfit obtained variant.
function ReviewRewardModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
  const { popupCtx, gs } = useGame();
  const { heartRecovered, seasonalUnlocked } = popupCtx;

  if (seasonalUnlocked) {
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
            <h2 className="text-xl font-bold text-teal-900">Seasonal Outfit Obtained!</h2>
          </div>
          <div className="px-6 py-6 flex flex-col items-center gap-5">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-24 h-28 rounded-2xl overflow-hidden shadow-md bg-gradient-to-br ${OUTFIT_META["seasonal"].cardBg}`}>
                <picture style={{ display: "contents" }}>
                  <source srcSet={getMaryPortraitPng("seasonal")} type="image/png" />
                  <img
                    src={OUTFIT_IMAGES["seasonal"]}
                    alt="Seasonal Outfit"
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </picture>
              </div>
              <span className="text-sm font-bold text-foreground">Seasonal Outfit</span>
              <span className="text-xs text-muted-foreground">Added to your wardrobe.</span>
            </div>
            <NavButton onClose={onClose} isLast={isLast} />
          </div>
        </ModalCard>
      </>
    );
  }

  // Heart recovered variant
  if (heartRecovered) {
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
            <h2 className="text-lg font-bold text-foreground mt-2">Heart Recovered!</h2>
          </div>
          <div className="px-5 py-5 flex flex-col items-center gap-4">
            <p className="text-foreground font-medium text-center text-sm leading-relaxed">
              Mary looks happy.
            </p>
            {/* Heart gauge reflecting new count */}
            <div className="flex gap-2">
              {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                <motion.span
                  key={i}
                  className={`text-3xl leading-none ${
                    i < gs.hearts ? "text-accent" : "text-muted-foreground/30"
                  }`}
                  animate={i < gs.hearts ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                >
                  ♥
                </motion.span>
              ))}
            </div>
            <NavButton onClose={onClose} isLast={isLast} />
          </div>
        </ModalCard>
      </>
    );
  }

  // Fallback (neither flag — shouldn't happen in normal flow)
  return null;
}

// ─── Legacy modals (kept for actions triggered outside import flow) ────────────

function HeartModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
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
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <span
                key={i}
                className={i < gs.hearts ? "text-accent" : "text-muted-foreground/30"}
              >
                ❤
              </span>
            ))}
          </div>
          <NavButton onClose={onClose} isLast={isLast} label="Close" />
        </div>
      </ModalCard>
    </>
  );
}

function SeasonalModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
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
            <div className={`w-20 h-24 rounded-2xl overflow-hidden shadow-md bg-gradient-to-br ${OUTFIT_META["seasonal"].cardBg}`}>
              <picture style={{ display: "contents" }}>
                <source srcSet={getMaryPortraitPng("seasonal")} type="image/png" />
                <img
                  src={OUTFIT_IMAGES["seasonal"]}
                  alt="Seasonal Outfit"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </picture>
            </div>
            <span className="text-sm font-bold text-foreground">Seasonal Outfit</span>
            <span className="text-xs text-muted-foreground">A fresh seasonal look!</span>
          </div>
          <NavButton onClose={onClose} isLast={isLast} label="Wonderful!" />
        </div>
      </ModalCard>
    </>
  );
}

function DailyTalkModal({ onClose, isLast }: { onClose: () => void; isLast: boolean }) {
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
          <NavButton onClose={onClose} isLast={isLast} label="Thanks, Mary!" />
        </div>
      </ModalCard>
    </>
  );
}

// ─── Modal registry ───────────────────────────────────────────────────────────
const MODAL_MAP: Record<
  ModalType,
  (p: { onClose: () => void; isLast: boolean }) => ReactElement | null
> = {
  "xp-gained":        XpGainedModal,
  "small-reward":     SmallRewardModal,
  "level-up":         LevelUpModal,
  "level-outfit":     LevelOutfitModal,
  "emote-reward":     EmoteRewardModal,
  "review-progress":  ReviewProgressModal,
  "review-reward":    ReviewRewardModal,
  // Legacy:
  heart:              HeartModal,
  seasonal:           SeasonalModal,
  "daily-talk":       DailyTalkModal,
};

// ─── Root export ──────────────────────────────────────────────────────────────
export function RewardModal() {
  const { activeModal, isLastModal, closeModal } = useGame();
  const Component = activeModal ? MODAL_MAP[activeModal] : null;

  return (
    <AnimatePresence>
      {Component && (
        <Component key={activeModal} onClose={closeModal} isLast={isLastModal} />
      )}
    </AnimatePresence>
  );
}
