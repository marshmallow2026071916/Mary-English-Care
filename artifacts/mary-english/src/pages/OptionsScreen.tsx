import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, ChevronDown, ChevronUp } from "lucide-react";
import { MaryAvatar } from "@/components/MaryAvatar";
import { BottomNav } from "@/components/BottomNav";
import { useGame } from "@/context/GameContext";
import { useReviewLog } from "@/hooks/useReviewLog";
import { useToast } from "@/hooks/use-toast";
import { OUTFIT_IMAGES, OUTFIT_META, getMaryPortraitPng, type OutfitId } from "@/lib/maryAssets";

const OUTFITS = [
  { id: "black",    name: "Black Outfit" },
  { id: "level",    name: "Level Reward Outfit" },
  { id: "seasonal", name: "Seasonal Outfit" },
];

interface DevButtonProps {
  label: string;
  onClick: () => void;
  testId: string;
  variant?: "default" | "danger";
}

function DevButton({ label, onClick, testId, variant = "default" }: DevButtonProps) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
        variant === "danger"
          ? "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
          : "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70"
      }`}
    >
      {label}
    </button>
  );
}

export default function OptionsScreen() {
  const [devOpen, setDevOpen] = useState(false);
  const { toast } = useToast();
  const {
    gs, xpPercent, emote, isUnlocked,
    actions,
  } = useGame();
  const { level, xp, hearts, streakCount, equippedOutfit } = gs;
  const { entries, addSampleEntry, clearLog } = useReviewLog();

  const notify = (msg: string) => toast({ description: msg, duration: 1800 });

  const gameDevActions: DevButtonProps[] = [
    { label: "Add 1 XP",         testId: "dev-add-1xp",          onClick: () => { actions.addXP(1);               notify("+1 XP"); } },
    { label: "Add 10 XP",        testId: "dev-add-10xp",         onClick: () => { actions.addXP(10);              notify("+10 XP"); } },
    { label: "Complete Daily Talk",    testId: "dev-complete-daily",   onClick: () => { actions.completeDailyTalk();     } },
    { label: "Complete Practice Talk", testId: "dev-complete-practice", onClick: () => { actions.completePracticeTalk(); notify("Practice Talk completed!"); } },
    { label: "Complete Review Talk",   testId: "dev-complete-review",  onClick: () => { actions.completeReviewTalk();  notify("Review Talk completed!"); } },
    { label: "Add Heart",         testId: "dev-add-heart",        onClick: () => { actions.addHeart();             } },
    { label: "Remove Heart",      testId: "dev-remove-heart",     onClick: () => { actions.removeHeart();          notify("Heart removed"); } },
    { label: "Reset Data",        testId: "dev-reset",            variant: "danger", onClick: () => { actions.resetData(); notify("Data reset"); } },
  ];

  const rewardDevActions: DevButtonProps[] = [
    { label: "Trigger Small Reward",       testId: "dev-small-reward",    onClick: () => actions.triggerSmallReward() },
    { label: "Trigger Level Up Reward",    testId: "dev-levelup-reward",  onClick: () => actions.triggerLevelUpReward() },
    { label: "Trigger Heart Reward",       testId: "dev-heart-reward",    onClick: () => actions.triggerHeartReward() },
    { label: "Unlock Level Reward Outfit", testId: "dev-unlock-level",    onClick: () => { actions.unlockLevelRewardOutfit(); notify("Level Reward Outfit unlocked!"); } },
    { label: "Unlock Seasonal Outfit",     testId: "dev-unlock-seasonal", onClick: () => actions.unlockSeasonalOutfit() },
    { label: "Reset Wardrobe",             testId: "dev-reset-wardrobe",  variant: "danger", onClick: () => { actions.resetWardrobe(); notify("Wardrobe reset"); } },
  ];

  const reviewLogDevActions: DevButtonProps[] = [
    { label: "Add Sample Daily Talk Log",    testId: "dev-log-daily",    onClick: () => { addSampleEntry("Daily Talk",    level); notify("Daily Talk log added"); } },
    { label: "Add Sample Practice Talk Log", testId: "dev-log-practice", onClick: () => { addSampleEntry("Practice Talk", level); notify("Practice Talk log added"); } },
    { label: "Add Sample Review Talk Log",   testId: "dev-log-review",   onClick: () => { addSampleEntry("Review Talk",   level); notify("Review Talk log added"); } },
    { label: "Clear Review Log",                testId: "dev-log-clear",   variant: "danger", onClick: () => { clearLog(); notify("Review Log cleared"); } },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-8">

        <h1 className="text-2xl font-bold text-center text-foreground mb-8" data-testid="text-page-title">
          Options
        </h1>

        {/* Avatar Preview */}
        <div className="flex justify-center mb-10">
          <MaryAvatar height={240} showEmote={false} outfit={equippedOutfit} emote={emote} />
        </div>

        {/* Wardrobe Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 pl-2 border-l-4 border-primary">Wardrobe</h2>

          <div className="grid grid-cols-2 gap-4">
            {OUTFITS.map((outfit) => {
              const unlocked = isUnlocked(outfit.id);
              const selected = equippedOutfit === outfit.id;

              return (
                <motion.div
                  key={outfit.id}
                  className={`
                    relative rounded-2xl border-2 p-3 flex flex-col items-center gap-3 transition-all
                    ${!unlocked
                      ? "bg-muted/50 border-transparent opacity-60"
                      : selected
                        ? "bg-card border-primary shadow-sm"
                        : "bg-card border-border shadow-sm cursor-pointer hover:border-primary/50"}
                  `}
                  onClick={() => unlocked && actions.equipOutfit(outfit.id)}
                  whileTap={unlocked ? { scale: 0.96 } : undefined}
                  data-testid={`outfit-card-${outfit.id}`}
                >
                  {/* Swatch */}
                  <div className={`w-16 h-20 rounded-xl overflow-hidden shadow-inner relative bg-gradient-to-br ${OUTFIT_META[outfit.id as OutfitId].cardBg}`}>
                    <picture style={{ display: "contents" }}>
                      <source srcSet={getMaryPortraitPng(outfit.id)} type="image/png" />
                      <img
                        src={OUTFIT_IMAGES[outfit.id as OutfitId]}
                        alt={outfit.name}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    </picture>
                    {!unlocked && (
                      <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
                        <Lock className="w-6 h-6 text-foreground/50" />
                      </div>
                    )}
                  </div>

                  <span className={`text-xs font-bold text-center leading-tight ${!unlocked ? "text-muted-foreground" : "text-foreground"}`}>
                    {outfit.name}
                  </span>

                  {/* Selected checkmark */}
                  {unlocked && selected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}

                  {/* Newly unlocked glow */}
                  {unlocked && outfit.id !== "black" && !selected && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-primary/40"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Developer Testing Panel */}
        <div className="mb-8">
          <button
            onClick={() => setDevOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/60 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
            data-testid="dev-panel-toggle"
          >
            <span>Developer Testing Panel</span>
            {devOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {devOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 bg-card border border-border rounded-2xl p-4 space-y-5">

                  {/* State readout */}
                  <div className="bg-secondary/40 rounded-xl p-3 font-mono text-xs text-muted-foreground space-y-1" data-testid="dev-state-display">
                    <div>Level: <span className="text-foreground font-bold">{level}</span></div>
                    <div>XP: <span className="text-foreground font-bold">{xp} / 200</span> ({xpPercent.toFixed(0)}%)</div>
                    <div>Hearts: <span className="text-foreground font-bold">{hearts} / 2</span></div>
                    <div>Streak: <span className="text-foreground font-bold">{streakCount} / 7 days</span></div>
                    <div>Practice Tasks: <span className="text-foreground font-bold">{gs.practiceCount} / 3</span></div>
                    <div>Review Tasks: <span className="text-foreground font-bold">{gs.reviewCount} / 3</span></div>
                    <div>Outfit: <span className="text-foreground font-bold">{equippedOutfit}</span></div>
                    <div>Unlocked: <span className="text-foreground font-bold">{gs.unlockedOutfits.join(", ")}</span></div>
                    <div>Emote: <span className="text-foreground font-bold">{emote}</span></div>
                    <div>Review Log entries: <span className="text-foreground font-bold">{entries.length}</span></div>
                  </div>

                  {/* Game State */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Game State</p>
                    <div className="flex flex-wrap gap-2">
                      {gameDevActions.map((a) => <DevButton key={a.testId} {...a} />)}
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Rewards & Wardrobe */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Rewards &amp; Wardrobe</p>
                    <div className="flex flex-wrap gap-2">
                      {rewardDevActions.map((a) => <DevButton key={a.testId} {...a} />)}
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Review Log */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Review Log Test</p>
                    <div className="flex flex-wrap gap-2">
                      {reviewLogDevActions.map((a) => <DevButton key={a.testId} {...a} />)}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
