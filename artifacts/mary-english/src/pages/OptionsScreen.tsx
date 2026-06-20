import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, ChevronDown, ChevronUp, ChevronRight, User } from "lucide-react";
import { Link } from "wouter";
import { MaryAvatar } from "@/components/MaryAvatar";
import { BottomNav } from "@/components/BottomNav";
import { useGame } from "@/context/GameContext";
import { useReviewLog } from "@/hooks/useReviewLog";
import { useToast } from "@/hooks/use-toast";
import { OUTFIT_IMAGES, OUTFIT_META, getMaryPortraitPng, type OutfitId } from "@/lib/maryAssets";

// ─── Wardrobe registry ────────────────────────────────────────────────────────

type OutfitSource = "initial" | "levelUp" | "reviewTask";

interface OutfitEntry {
  id: string;
  name: string;
  source: OutfitSource;
  unlockedAtLevel?: number;
}

interface EmoteEntry {
  id: string;
  name: string;
  unlockedAtLevel: number;
}

interface ReviewRewardEntry {
  id: string;
  name: string;
  source: "reviewTask";
}

const OUTFIT_REGISTRY: OutfitEntry[] = [
  { id: "black", name: "Black Outfit",        source: "initial",    unlockedAtLevel: 0 },
  { id: "level", name: "Level Reward Outfit", source: "levelUp" },
];

const EMOTE_REGISTRY: EmoteEntry[] = [
  { id: "idle",        name: "Idle",        unlockedAtLevel: 0  },
  { id: "smile",       name: "Smile",       unlockedAtLevel: 5  },
  { id: "cheer",       name: "Cheer",       unlockedAtLevel: 10 },
  { id: "celebration", name: "Celebration", unlockedAtLevel: 15 },
  { id: "shy",         name: "Shy",         unlockedAtLevel: 20 },
];

const REVIEW_REWARD_REGISTRY: ReviewRewardEntry[] = [
  { id: "seasonal", name: "Seasonal Outfit", source: "reviewTask" },
];

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

// ─── Outfit card ──────────────────────────────────────────────────────────────
function OutfitCard({
  outfit, unlocked, selected, onEquip, subtitle,
}: {
  outfit: OutfitEntry | ReviewRewardEntry;
  unlocked: boolean;
  selected: boolean;
  onEquip: () => void;
  subtitle: string;
}) {
  const id = outfit.id;
  const meta = OUTFIT_META[id as OutfitId] ?? OUTFIT_META["default"];

  return (
    <motion.div
      className={`
        relative rounded-2xl border-2 p-3 flex flex-col items-center gap-2 transition-all
        ${!unlocked
          ? "bg-muted/50 border-transparent opacity-60"
          : selected
            ? "bg-card border-primary shadow-sm"
            : "bg-card border-border shadow-sm cursor-pointer hover:border-primary/50"}
      `}
      onClick={() => unlocked && onEquip()}
      whileTap={unlocked ? { scale: 0.96 } : undefined}
      data-testid={`outfit-card-${id}`}
    >
      <div className={`w-16 h-20 rounded-xl overflow-hidden shadow-inner relative bg-gradient-to-br ${meta.cardBg}`}>
        <picture style={{ display: "contents" }}>
          <source srcSet={getMaryPortraitPng(id)} type="image/png" />
          <img
            src={OUTFIT_IMAGES[id as OutfitId] ?? OUTFIT_IMAGES["default"]}
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
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {subtitle}
      </span>

      {unlocked && selected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
          <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
        </div>
      )}

      {unlocked && !selected && id !== "black" && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/40"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// ─── Emote card ───────────────────────────────────────────────────────────────
function EmoteCard({ emote }: { emote: EmoteEntry }) {
  const src = `/assets/mary/emotes/${emote.id}.svg`;
  const subtitle = emote.unlockedAtLevel === 0
    ? "Available from the start"
    : `Unlocked at Level ${emote.unlockedAtLevel}`;

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-3 flex flex-col items-center gap-2">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary/40 flex items-center justify-center">
        <img
          src={src}
          alt={emote.name}
          className="w-12 h-12 object-contain"
          draggable={false}
        />
      </div>
      <span className="text-xs font-bold text-center text-foreground leading-tight">
        {emote.name}
      </span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {subtitle}
      </span>
    </div>
  );
}

// ─── Wardrobe section ─────────────────────────────────────────────────────────
type WardrobeTab = "outfits" | "emotes" | "reviewRewards";

function WardrobeSection() {
  const [tab, setTab] = useState<WardrobeTab>("outfits");
  const { gs, isUnlocked, actions } = useGame();
  const { equippedOutfit } = gs;

  // Outfits tab: source = "initial" | "levelUp"
  // Show unlocked first (descending unlockedAtLevel), locked after.
  const outfitsSorted = [...OUTFIT_REGISTRY].sort((a, b) => {
    const aUnlocked = isUnlocked(a.id);
    const bUnlocked = isUnlocked(b.id);
    if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
    const aLevel = a.unlockedAtLevel ?? 999;
    const bLevel = b.unlockedAtLevel ?? 999;
    return bLevel - aLevel;
  });

  // Review rewards tab: source = "reviewTask"
  const reviewSorted = [...REVIEW_REWARD_REGISTRY].sort((a, b) => {
    const aUnlocked = isUnlocked(a.id);
    const bUnlocked = isUnlocked(b.id);
    if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
    return 0;
  });

  // Emotes: sorted by unlockedAtLevel descending (unlocked = all)
  const emotesSorted = [...EMOTE_REGISTRY].sort((a, b) => b.unlockedAtLevel - a.unlockedAtLevel);

  function outfitSubtitle(entry: OutfitEntry): string {
    const unlocked = isUnlocked(entry.id);
    if (!unlocked) return "Locked";
    if (entry.unlockedAtLevel === 0) return "Unlocked at Level 1";
    if (entry.unlockedAtLevel !== undefined) return `Unlocked at Level ${entry.unlockedAtLevel + 1}`;
    return "Unlocked";
  }

  function reviewSubtitle(entry: ReviewRewardEntry): string {
    return isUnlocked(entry.id) ? "Unlocked via Review Tasks" : "Locked";
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-foreground mb-4 pl-2 border-l-4 border-primary">Wardrobe</h2>

      {/* Tab bar */}
      <div className="flex gap-1 bg-secondary/50 rounded-2xl p-1 mb-4">
        <TabButton label="Outfits"        active={tab === "outfits"}        onClick={() => setTab("outfits")} />
        <TabButton label="Emotes"         active={tab === "emotes"}         onClick={() => setTab("emotes")} />
        <TabButton label="Review Rewards" active={tab === "reviewRewards"}  onClick={() => setTab("reviewRewards")} />
      </div>

      <AnimatePresence mode="wait">
        {tab === "outfits" && (
          <motion.div
            key="outfits"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-2 gap-4"
          >
            {outfitsSorted.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                unlocked={isUnlocked(outfit.id)}
                selected={equippedOutfit === outfit.id}
                onEquip={() => actions.equipOutfit(outfit.id)}
                subtitle={outfitSubtitle(outfit)}
              />
            ))}
          </motion.div>
        )}

        {tab === "emotes" && (
          <motion.div
            key="emotes"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-2 gap-4"
          >
            {emotesSorted.map((emote) => (
              <EmoteCard key={emote.id} emote={emote} />
            ))}
          </motion.div>
        )}

        {tab === "reviewRewards" && (
          <motion.div
            key="reviewRewards"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-2 gap-4"
          >
            {reviewSorted.map((entry) => (
              <OutfitCard
                key={entry.id}
                outfit={entry}
                unlocked={isUnlocked(entry.id)}
                selected={equippedOutfit === entry.id}
                onEquip={() => actions.equipOutfit(entry.id)}
                subtitle={reviewSubtitle(entry)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
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
  const {
    gs, xpPercent, emote,
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
    { label: "Clear Review Log",             testId: "dev-log-clear",    variant: "danger", onClick: () => { clearLog(); notify("Review Log cleared"); } },
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

        {/* Wardrobe — three-tab layout */}
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
