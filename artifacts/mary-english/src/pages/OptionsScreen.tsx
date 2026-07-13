import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, User, RefreshCw, Download } from "lucide-react";
import { Link } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { useGame } from "@/context/GameContext";
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

// Outfit cards show the unlock level, not a name.
// outfit_000 → Level 0, outfit_001 → Level 1, outfit_002 → Level 6, outfit_003 → Level 11, ...
function outfitLabel(outfitId: string): string {
  const num = parseInt(outfitId.split("_")[1] ?? "0", 10);
  const level = num === 0 ? 0 : (num - 1) * 5 + 1;
  return `Level ${level}`;
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

  // An emote type is available if it is unlocked for ANY outfit — not just the
  // currently selected one. Availability (enabled/disabled) must be determined
  // solely by the unlock state; currentOutfit / selectedOutfit only determines
  // which item is highlighted as selected, never whether items are enabled.
  const availableEmotes = new Set(
    unlockedOutfitEmotes.map((k) => k.split("_").pop()!)
  );

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
              const available = availableEmotes.has(emote);
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
                {unlockedReviewRewards.map((rewardId, index) => {
                  const isSelected = selectedReviewReward === rewardId;
                  const rewardLabel = `Reward ${index + 1}`;
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
                          alt={rewardLabel}
                          className="w-full h-full object-contain object-top"
                          draggable={false}
                        />
                      </div>
                      <span className="text-xs font-bold text-center text-foreground leading-tight">
                        {rewardLabel}
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

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OptionsScreen() {
  const { gs } = useGame();
  const { selectedOutfit, selectedEmote, selectedReviewReward } = gs;

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

      </div>
      <BottomNav />
    </div>
  );
}
