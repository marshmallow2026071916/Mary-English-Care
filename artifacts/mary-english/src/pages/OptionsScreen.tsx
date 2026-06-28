import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, ChevronRight, User, RefreshCw, Download } from "lucide-react";
import { Link } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { useGame } from "@/context/GameContext";
import { useReviewLog } from "@/hooks/useReviewLog";
import { useToast } from "@/hooks/use-toast";
import {
  getOutfitEmoteImage,
  getOutfitIconImage,
  getReviewRewardImage,
  getBackgroundImage,
} from "@/lib/maryAssets";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { APP_VERSION, APP_BUILD } from "@/lib/version";

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Wardrobe section ─────────────────────────────────────────────────────────
type WardrobeTab = "outfits" | "emotes" | "reviewRewards" | "backgrounds";

const ALL_EMOTES = ["idle", "shy", "smile", "wave", "cheer"] as const;
const EMOTE_LABELS: Record<string, string> = {
  idle: "Idle",
  shy: "Shy",
  smile: "Smile",
  wave: "Wave",
  cheer: "Cheer",
};

function outfitLabel(outfitId: string): string {
  return outfitId === "outfit_000" ? "Black Outfit" : `Outfit ${outfitId.split("_")[1]}`;
}

const fadePanel = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18 },
};

function WardrobeSection() {
  const [tab, setTab] = useState<WardrobeTab>("outfits");
  const { gs, actions } = useGame();
  const {
    selectedOutfit,
    selectedEmote,
    selectedReviewReward,
    selectedBackground,
    unlockedOutfitEmotes,
    unlockedBackgrounds,
    unlockedReviewRewards,
  } = gs;

  // Unique outfit IDs derived from unlocked emote keys (stable order)
  const unlockedOutfitIds: string[] = [];
  for (const key of unlockedOutfitEmotes) {
    const parts = key.split("_");
    const id = `${parts[0]}_${parts[1]}`; // "outfit_000"
    if (!unlockedOutfitIds.includes(id)) unlockedOutfitIds.push(id);
  }

  // Emotes available for the currently selected outfit
  const availableEmotes = unlockedOutfitEmotes
    .filter((k) => k.startsWith(selectedOutfit + "_"))
    .map((k) => k.split("_").pop()!);

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-foreground mb-4 pl-2 border-l-4 border-primary">Wardrobe</h2>

      {/* Tab bar — 4 tabs */}
      <div className="grid grid-cols-4 gap-1 bg-secondary/50 rounded-2xl p-1 mb-4">
        <TabButton label="Outfits"     active={tab === "outfits"}       onClick={() => setTab("outfits")} />
        <TabButton label="Emotes"      active={tab === "emotes"}        onClick={() => setTab("emotes")} />
        <TabButton label="Rewards"     active={tab === "reviewRewards"} onClick={() => setTab("reviewRewards")} />
        <TabButton label="Backgrounds" active={tab === "backgrounds"}   onClick={() => setTab("backgrounds")} />
      </div>

      <AnimatePresence mode="wait">

        {/* ── Outfits ──────────────────────────────────────────────────────── */}
        {tab === "outfits" && (
          <motion.div key="outfits" {...fadePanel} className="grid grid-cols-2 gap-4">
            {unlockedOutfitIds.map((id) => {
              // Icon Display Rule: review_reward_001 uses the same black outfit as outfit_000,
              // so outfit_000's card shows as active when that reward is selected.
              const activeViaReviewReward =
                selectedReviewReward === "review_reward_001" && id === "outfit_000";
              const isSelected = activeViaReviewReward || (!selectedReviewReward && selectedOutfit === id);
              return (
                <motion.div
                  key={id}
                  className={`relative rounded-2xl border-2 p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-card border-primary shadow-sm"
                      : "bg-card border-border shadow-sm hover:border-primary/50"
                  }`}
                  onClick={() => actions.selectOutfit(id)}
                  whileTap={{ scale: 0.96 }}
                  data-testid={`outfit-card-${id}`}
                >
                  <div className="w-16 h-20 rounded-xl overflow-hidden bg-secondary/30">
                    <img
                      src={getOutfitIconImage(id)}
                      alt={outfitLabel(id)}
                      className="w-full h-full object-contain object-top"
                      draggable={false}
                    />
                  </div>
                  <span className="text-xs font-bold text-center text-foreground leading-tight">
                    {outfitLabel(id)}
                  </span>
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ── Emotes ───────────────────────────────────────────────────────── */}
        {tab === "emotes" && (
          <motion.div key="emotes" {...fadePanel} className="flex flex-col gap-2">
            {ALL_EMOTES.map((emote) => {
              const available = availableEmotes.includes(emote);
              const isSelected = selectedEmote === emote && !selectedReviewReward;
              return (
                <button
                  key={emote}
                  disabled={!available}
                  onClick={() => available && actions.selectEmote(emote)}
                  className={`w-full py-3.5 px-4 rounded-2xl text-sm font-bold transition-all text-left ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : available
                        ? "bg-card border border-border text-foreground hover:border-primary/50"
                        : "bg-muted/50 text-muted-foreground border border-transparent opacity-50 cursor-not-allowed"
                  }`}
                  data-testid={`emote-btn-${emote}`}
                >
                  {EMOTE_LABELS[emote]}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* ── Review Rewards ───────────────────────────────────────────────── */}
        {tab === "reviewRewards" && (
          <motion.div key="reviewRewards" {...fadePanel}>
            {unlockedReviewRewards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4 leading-relaxed">
                Complete all 3 Review Tasks with a full Heart Gauge to unlock an Outfit Showcase reward.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {unlockedReviewRewards.map((rewardId) => {
                  const isSelected = selectedReviewReward === rewardId;
                  return (
                    <motion.div
                      key={rewardId}
                      className={`relative rounded-2xl border-2 p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-card border-primary shadow-sm"
                          : "bg-card border-border shadow-sm hover:border-primary/50"
                      }`}
                      onClick={() => actions.selectReviewReward(isSelected ? null : rewardId)}
                      whileTap={{ scale: 0.96 }}
                      data-testid={`review-reward-card-${rewardId}`}
                    >
                      <div className="w-16 h-20 rounded-xl overflow-hidden bg-secondary/30">
                        <img
                          src={getReviewRewardImage(rewardId)}
                          alt="Outfit Showcase"
                          className="w-full h-full object-contain object-top"
                          draggable={false}
                        />
                      </div>
                      <span className="text-xs font-bold text-center text-foreground leading-tight">
                        Outfit Showcase
                      </span>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                          <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Backgrounds ──────────────────────────────────────────────────── */}
        {tab === "backgrounds" && (
          <motion.div key="backgrounds" {...fadePanel} className="grid grid-cols-2 gap-4">
            {unlockedBackgrounds.map((bgId) => {
              const isSelected = selectedBackground === bgId;
              return (
                <motion.div
                  key={bgId}
                  className={`relative rounded-2xl border-2 overflow-hidden cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary shadow-sm"
                      : "border-border shadow-sm hover:border-primary/50"
                  }`}
                  style={{ aspectRatio: "9 / 16" }}
                  onClick={() => actions.selectBackground(bgId)}
                  whileTap={{ scale: 0.97 }}
                  data-testid={`background-card-${bgId}`}
                >
                  {/* absolute inset-0 ensures image fills the aspect-ratio container */}
                  <img
                    src={getBackgroundImage(bgId)}
                    alt={bgId}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm z-10">
                      <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ─── App updates section ──────────────────────────────────────────────────────
function AppUpdatesSection() {
  const { checkForUpdate, forceRefresh, resetAssetCache } = usePwaUpdate();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"check" | "force" | "assets" | null>(null);

  const notify = (msg: string) => toast({ description: msg, duration: 2000 });

  const run = (
    key: "check" | "force" | "assets",
    fn: () => Promise<void> | void,
    msg?: string,
  ) => async () => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
      if (msg) notify(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-foreground mb-4 pl-2 border-l-4 border-primary">
        App Updates
      </h2>

      <div className="bg-card border border-border rounded-2xl px-4 py-3 mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Mary English</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            v{APP_VERSION} &nbsp;·&nbsp; Build: {APP_BUILD}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={run("check", checkForUpdate, "Checking for update…")}
          disabled={!!busy}
          data-testid="options-check-update-btn"
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-card border border-border rounded-2xl text-sm font-medium text-foreground hover:border-primary/40 disabled:opacity-50 transition-colors active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 text-primary shrink-0 ${busy === "check" ? "animate-spin" : ""}`} />
          {busy === "check" ? "Checking…" : "Check for update"}
        </button>

        <button
          onClick={run("force", forceRefresh)}
          disabled={!!busy}
          data-testid="options-force-refresh-btn"
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-card border border-border rounded-2xl text-sm font-medium text-foreground hover:border-destructive/40 disabled:opacity-50 transition-colors active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 text-destructive/70 shrink-0 ${busy === "force" ? "animate-spin" : ""}`} />
          <div className="text-left">
            <span className="block">{busy === "force" ? "Clearing…" : "Force refresh app"}</span>
            <span className="block text-[10px] text-muted-foreground font-normal">
              Clears app cache only. Progress is kept.
            </span>
          </div>
        </button>

        <button
          onClick={run("assets", resetAssetCache)}
          disabled={!!busy}
          data-testid="options-reset-assets-btn"
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-card border border-border rounded-2xl text-sm font-medium text-foreground hover:border-amber-400/50 disabled:opacity-50 transition-colors active:scale-[0.98]"
        >
          <Download className={`w-4 h-4 text-amber-600/70 shrink-0 ${busy === "assets" ? "animate-spin" : ""}`} />
          <div className="text-left">
            <span className="block">{busy === "assets" ? "Clearing…" : "Reset downloaded assets"}</span>
            <span className="block text-[10px] text-muted-foreground font-normal">
              Re-downloads avatars &amp; sounds. Progress is kept.
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Dev button ───────────────────────────────────────────────────────────────
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

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OptionsScreen() {
  const [devOpen, setDevOpen] = useState(false);
  const { toast } = useToast();
  const { gs, xpPercent, actions } = useGame();
  const {
    level, xp, hearts, streakCount,
    selectedOutfit, selectedEmote, selectedReviewReward,
  } = gs;
  const { entries, addSampleEntry, clearLog } = useReviewLog();

  const notify = (msg: string) => toast({ description: msg, duration: 1800 });

  const gameDevActions: DevButtonProps[] = [
    { label: "Add 1 XP",              testId: "dev-add-1xp",           onClick: () => { actions.addXP(1);               notify("+1 XP"); } },
    { label: "Add 10 XP",             testId: "dev-add-10xp",          onClick: () => { actions.addXP(10);              notify("+10 XP"); } },
    { label: "Complete Daily Talk",    testId: "dev-complete-daily",    onClick: () => { actions.completeDailyTalk(); } },
    { label: "Complete Practice Talk", testId: "dev-complete-practice", onClick: () => { actions.completePracticeTalk(); notify("Practice Talk completed!"); } },
    { label: "Complete Review Talk",   testId: "dev-complete-review",   onClick: () => { actions.completeReviewTalk();  notify("Review Talk completed!"); } },
    { label: "Add Heart",              testId: "dev-add-heart",         onClick: () => { actions.addHeart(); } },
    { label: "Remove Heart",           testId: "dev-remove-heart",      onClick: () => { actions.removeHeart(); notify("Heart removed"); } },
    { label: "Reset Data",             testId: "dev-reset",             variant: "danger", onClick: () => { actions.resetData(); notify("Data reset"); } },
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
    { label: "Clear Review Log",             testId: "dev-log-clear",    variant: "danger", onClick: () => { clearLog(); notify("Review Log cleared"); } },
  ];

  const maryImageSrc = selectedReviewReward
    ? getReviewRewardImage(selectedReviewReward)
    : getOutfitEmoteImage(selectedOutfit, selectedEmote);

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-8">

        <h1 className="text-2xl font-bold text-center text-foreground mb-8" data-testid="text-page-title">
          Options
        </h1>

        {/* Mary Display Area Preview — scene BG + Mary, same layer concept as TopScreen */}
        <div className="flex justify-center mb-8">
          <div
            className="relative rounded-3xl overflow-hidden shadow-md"
            style={{ width: 152, height: 240 }}
          >
            {/* Layer 1: Scene Background */}
            <img
              src={getBackgroundImage(gs.selectedBackground)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            {/* Layer 2: Mary — transparent PNG on top */}
            <img
              src={maryImageSrc}
              alt="Mary"
              className="absolute inset-0 w-full h-full object-contain object-bottom z-10"
              draggable={false}
            />
          </div>
        </div>

        {/* Wardrobe — four-tab layout */}
        <WardrobeSection />

        {/* Mary Profile link */}
        <div className="mb-8">
          <Link href="/profile">
            <motion.div
              className="flex items-center justify-between px-4 py-4 bg-card border border-border rounded-2xl shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Mary Profile</p>
                  <p className="text-xs text-muted-foreground">Get to know Mary</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </Link>
        </div>

        {/* App Updates */}
        <AppUpdatesSection />

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
                    <div>Outfit: <span className="text-foreground font-bold">{selectedOutfit} / {selectedEmote}</span></div>
                    <div>Background: <span className="text-foreground font-bold">{gs.selectedBackground}</span></div>
                    <div>Review Reward: <span className="text-foreground font-bold">{selectedReviewReward ?? "none"}</span></div>
                    <div>Unlocked emotes: <span className="text-foreground font-bold">{gs.unlockedOutfitEmotes.length}</span></div>
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
