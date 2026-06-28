import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { useGame } from "@/context/GameContext";
import { getActiveIconImage, OUTFIT_META, resolveOutfitId } from "@/lib/maryAssets";

// ─── Static profile data ──────────────────────────────────────────────────────
const PROFILE = {
  name:        "Mary Collins",
  age:         "27",
  nationality: "Canada",
  drink:       "Light Roast Coffee",
  food:        "Fresh pastries",
  hobbies:     ["Reading books", "Walking with coffee", "Learning languages"],
  books:       ["Charlie and the Chocolate Factory", "My Father's Dragon"],
  personality: ["Calm", "Kind", "Curious", "Gentle", "Loves encouraging people"],
  message:     "I'm looking forward to learning English together with you.",
  version:     "Mary English Version 1",
};

// ─── Small two-column info row ─────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/40 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────
function Tag({ label }: { label: string }) {
  return (
    <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
      {label}
    </span>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MaryProfileScreen() {
  const { gs, emote } = useGame();
  const { equippedOutfit, selectedOutfit, selectedReviewReward } = gs;
  const id = resolveOutfitId(equippedOutfit);
  const meta = OUTFIT_META[id];

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex flex-col px-5 pt-8 gap-4">

        {/* Title */}
        <motion.h1
          className="text-2xl font-bold text-center text-foreground"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Mary Profile
        </motion.h1>

        {/* ── Portrait card ───────────────────────────────────────────────── */}
        <motion.div
          className="rounded-3xl overflow-hidden bg-secondary/40 border border-border flex flex-col items-center pt-5 pb-4 gap-2 shadow-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          {/* Current appearance icon — updates when outfit or review reward changes */}
          <div className="w-36 h-44 flex-shrink-0">
            <img
              src={getActiveIconImage(selectedOutfit, selectedReviewReward)}
              alt="Mary portrait"
              className="w-full h-full object-contain object-top"
              draggable={false}
            />
          </div>

          {/* Name and outfit label */}
          <div className="text-center px-4">
            <p className="text-base font-bold text-foreground">{PROFILE.name}</p>
            {meta.badgeLabel && (
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{meta.badgeLabel}</p>
            )}
          </div>
        </motion.div>

        {/* ── Info grid (2-col) ────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 gap-2.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <InfoRow label="Age"         value={PROFILE.age} />
          <InfoRow label="Nationality" value={PROFILE.nationality} />
          <InfoRow label="Drink"       value={PROFILE.drink} />
          <InfoRow label="Food"        value={PROFILE.food} />
        </motion.div>

        {/* ── Hobbies + Books (full-width) ─────────────────────────────────── */}
        <motion.div
          className="flex flex-col gap-2.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <div className="bg-secondary/40 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
              Hobbies
            </p>
            <p className="text-sm font-semibold text-foreground leading-snug">
              {PROFILE.hobbies.join("  ·  ")}
            </p>
          </div>

          <div className="bg-secondary/40 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
              Favorite Books
            </p>
            <p className="text-sm font-semibold text-foreground leading-snug">
              {PROFILE.books.join("  ·  ")}
            </p>
          </div>
        </motion.div>

        {/* ── Personality tags ─────────────────────────────────────────────── */}
        <motion.div
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          {PROFILE.personality.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </motion.div>

        {/* ── Mary's message ───────────────────────────────────────────────── */}
        <motion.div
          className="bg-card border border-border rounded-2xl px-5 py-4 flex gap-3 items-start shadow-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
        >
          {/* Current appearance icon — updates when outfit or review reward changes */}
          <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <img
              src={getActiveIconImage(selectedOutfit, selectedReviewReward)}
              alt="Mary"
              className="w-full h-full object-contain object-top"
              draggable={false}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Mary says
            </p>
            <p className="text-sm font-medium text-foreground leading-relaxed italic">
              "{PROFILE.message}"
            </p>
          </div>
        </motion.div>

        {/* ── Version footnote ─────────────────────────────────────────────── */}
        <motion.p
          className="text-center text-[11px] text-muted-foreground/60 pb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {PROFILE.version}
        </motion.p>

      </div>
      <BottomNav />
    </div>
  );
}
