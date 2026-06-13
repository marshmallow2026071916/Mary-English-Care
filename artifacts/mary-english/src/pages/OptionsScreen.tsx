import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, ChevronDown, ChevronUp } from "lucide-react";
import { MaryAvatar } from "@/components/MaryAvatar";
import { BottomNav } from "@/components/BottomNav";
import { useGameState } from "@/hooks/useGameState";
import { useReviewLog } from "@/hooks/useReviewLog";
import { useToast } from "@/hooks/use-toast";

const OUTFITS = [
  { id: "black", name: "Black Outfit", locked: false, color: "bg-[#2c2c2c]" },
  { id: "level", name: "Level Reward Outfit", locked: true, color: "bg-secondary" },
  { id: "seasonal", name: "Seasonal Outfit", locked: true, color: "bg-accent/40" },
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
  const [selectedOutfit, setSelectedOutfit] = useState("black");
  const [devOpen, setDevOpen] = useState(false);
  const { toast } = useToast();
  const { state, weeklyReadingCount, xpPercent, actions } = useGameState();
  const { level, xp, hearts, streakCount } = state;
  const { entries, addSampleEntry, clearLog } = useReviewLog();

  const notify = (msg: string) => toast({ description: msg, duration: 1800 });

  const gameDevActions: DevButtonProps[] = [
    {
      label: "Add 1 XP",
      testId: "dev-add-1xp",
      onClick: () => { actions.addXP(1); notify("+1 XP"); },
    },
    {
      label: "Add 10 XP",
      testId: "dev-add-10xp",
      onClick: () => { actions.addXP(10); notify("+10 XP"); },
    },
    {
      label: "Complete Daily Talk",
      testId: "dev-complete-daily",
      onClick: () => { actions.completeDailyTalk(); notify("Daily Talk completed!"); },
    },
    {
      label: "Complete Reading Talk",
      testId: "dev-complete-reading",
      onClick: () => { actions.completeReadingTalk(); notify("Reading Talk completed!"); },
    },
    {
      label: "Add Heart",
      testId: "dev-add-heart",
      onClick: () => { actions.addHeart(); notify("Heart added"); },
    },
    {
      label: "Remove Heart",
      testId: "dev-remove-heart",
      onClick: () => { actions.removeHeart(); notify("Heart removed"); },
    },
    {
      label: "Reset Data",
      testId: "dev-reset",
      variant: "danger",
      onClick: () => { actions.resetData(); notify("Data reset to defaults"); },
    },
  ];

  const reviewLogDevActions: DevButtonProps[] = [
    {
      label: "Add Sample Daily Talk Log",
      testId: "dev-log-daily",
      onClick: () => { addSampleEntry("Daily Talk", level); notify("Daily Talk log added"); },
    },
    {
      label: "Add Sample Reading Talk Log",
      testId: "dev-log-reading",
      onClick: () => { addSampleEntry("Reading Talk", level); notify("Reading Talk log added"); },
    },
    {
      label: "Add Sample Review Challenge Log",
      testId: "dev-log-review",
      onClick: () => { addSampleEntry("Review Challenge", level); notify("Review Challenge log added"); },
    },
    {
      label: "Clear Review Log",
      testId: "dev-log-clear",
      variant: "danger",
      onClick: () => { clearLog(); notify("Review Log cleared"); },
    },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-8">

        <h1 className="text-2xl font-bold text-center text-foreground mb-8" data-testid="text-page-title">
          Options
        </h1>

        {/* Avatar Preview */}
        <div className="flex justify-center mb-10">
          <MaryAvatar height={240} showEmote={false} />
        </div>

        {/* Wardrobe Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 pl-2 border-l-4 border-primary">Wardrobe</h2>

          <div className="grid grid-cols-2 gap-4">
            {OUTFITS.map((outfit) => {
              const isSelected = selectedOutfit === outfit.id;

              return (
                <motion.div
                  key={outfit.id}
                  className={`
                    relative rounded-2xl border-2 p-3 flex flex-col items-center gap-3 transition-all
                    ${outfit.locked
                      ? "bg-muted/50 border-transparent opacity-70"
                      : isSelected
                        ? "bg-card border-primary shadow-sm"
                        : "bg-card border-border shadow-sm cursor-pointer hover:border-primary/50"}
                  `}
                  onClick={() => !outfit.locked && setSelectedOutfit(outfit.id)}
                  whileTap={!outfit.locked ? { scale: 0.96 } : undefined}
                  data-testid={`outfit-card-${outfit.id}`}
                >
                  <div className={`w-16 h-20 rounded-xl ${outfit.color} flex items-center justify-center shadow-inner relative overflow-hidden`}>
                    {outfit.locked && (
                      <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
                        <Lock className="w-6 h-6 text-foreground/50" />
                      </div>
                    )}
                  </div>

                  <span className={`text-xs font-bold text-center ${outfit.locked ? "text-muted-foreground" : "text-foreground"}`}>
                    {outfit.name}
                  </span>

                  {!outfit.locked && isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                    </div>
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

                  {/* Current State Display */}
                  <div className="bg-secondary/40 rounded-xl p-3 font-mono text-xs text-muted-foreground space-y-1" data-testid="dev-state-display">
                    <div>Level: <span className="text-foreground font-bold">{level}</span></div>
                    <div>XP: <span className="text-foreground font-bold">{xp} / 200</span> ({xpPercent.toFixed(0)}%)</div>
                    <div>Hearts: <span className="text-foreground font-bold">{hearts} / 2</span></div>
                    <div>Streak: <span className="text-foreground font-bold">{streakCount} / 7 days</span></div>
                    <div>Weekly Reading: <span className="text-foreground font-bold">{weeklyReadingCount} / 3</span></div>
                    <div>Review Log entries: <span className="text-foreground font-bold">{entries.length}</span></div>
                  </div>

                  {/* Game Actions */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Game State</p>
                    <div className="flex flex-wrap gap-2">
                      {gameDevActions.map((action) => (
                        <DevButton key={action.testId} {...action} />
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* Review Log Actions */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Review Log Test</p>
                    <div className="flex flex-wrap gap-2">
                      {reviewLogDevActions.map((action) => (
                        <DevButton key={action.testId} {...action} />
                      ))}
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
