import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen } from "lucide-react";
import { MaryAvatar } from "@/components/MaryAvatar";
import { BottomNav } from "@/components/BottomNav";
import { useReviewLog, type ReviewLogEntry, type TaskType } from "@/hooks/useReviewLog";
import { useGameState } from "@/hooks/useGameState";

const LEVEL_TABS = [1, 2, 3] as const;

const TASK_TYPE_COLORS: Record<TaskType, string> = {
  "Daily Talk": "bg-primary/15 text-primary",
  "Reading Talk": "bg-accent/25 text-accent-foreground",
  "Review Challenge": "bg-secondary text-secondary-foreground",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface EntryCardProps {
  entry: ReviewLogEntry;
  index: number;
}

function EntryCard({ entry, index }: EntryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
      data-testid={`entry-card-${entry.id}`}
    >
      {/* Entry header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${TASK_TYPE_COLORS[entry.taskType]}`}
          data-testid={`entry-tasktype-${entry.id}`}
        >
          {entry.taskType}
        </span>
        <span className="text-xs text-muted-foreground font-medium" data-testid={`entry-date-${entry.id}`}>
          {formatDate(entry.date)}
        </span>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border/60 mb-3" />

      {/* Conversation */}
      <div className="px-4 pb-4 space-y-3">
        {/* Yamaguchi */}
        <div className="flex gap-3 items-start">
          <span className="text-xs font-bold text-primary shrink-0 mt-0.5 w-20 text-right leading-5">
            Yamaguchi:
          </span>
          <p
            className="text-sm text-foreground leading-relaxed flex-1"
            data-testid={`entry-user-${entry.id}`}
          >
            {entry.userText}
          </p>
        </div>

        {/* Mary */}
        <div className="flex gap-3 items-start">
          <span className="text-xs font-bold text-accent-foreground shrink-0 mt-0.5 w-20 text-right leading-5">
            Mary:
          </span>
          <p
            className="text-sm text-foreground/80 leading-relaxed flex-1 italic"
            data-testid={`entry-mary-${entry.id}`}
          >
            {entry.maryText}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function ReviewLogScreen() {
  const { entries } = useReviewLog();
  const { state } = useGameState();
  const currentLevel = state.level;

  const [activeTab, setActiveTab] = useState<number | "current">("current");

  const resolvedLevel = activeTab === "current" ? currentLevel : activeTab;

  const filtered = entries
    .filter((e) => e.level === resolvedLevel)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-8">

        {/* Header */}
        <h1
          className="text-2xl font-bold text-center text-foreground mb-6"
          data-testid="text-page-title"
        >
          Review Log
        </h1>

        {/* Mary bust-up */}
        <div className="flex items-center gap-4 mb-7">
          <MaryAvatar height={120} showEmote={false} className="scale-90 origin-left" />
          <motion.div
            className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-border flex-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <p className="text-sm font-medium text-foreground">
              Here are our conversations.
            </p>
          </motion.div>
        </div>

        {/* Level Tabs */}
        <div
          className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide"
          data-testid="level-tabs"
        >
          <button
            onClick={() => setActiveTab("current")}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === "current"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:border-primary/50"
            }`}
            data-testid="tab-current"
          >
            Current Level
          </button>
          {LEVEL_TABS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActiveTab(lvl)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === lvl
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:border-primary/50"
              }`}
              data-testid={`tab-level-${lvl}`}
            >
              Level {lvl}
            </button>
          ))}
        </div>

        {/* Level label */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-bold text-muted-foreground px-2">
            Level {resolvedLevel}
            {activeTab === "current" ? " (current)" : ""}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Entries */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center gap-4"
              data-testid="empty-state"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-bold text-muted-foreground text-sm">No entries yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Complete a talk session to see it here.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`entries-${resolvedLevel}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 pb-8"
              data-testid="entries-list"
            >
              {filtered.map((entry, i) => (
                <EntryCard key={entry.id} entry={entry} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      <BottomNav />
    </div>
  );
}
