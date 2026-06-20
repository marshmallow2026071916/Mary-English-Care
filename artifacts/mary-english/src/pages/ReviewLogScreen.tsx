import { useState } from "react";
import { BookOpen } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import {
  useReviewLog,
  type ReviewLogEntry,
  type TaskType,
  type ReviewLogReward,
  type Message,
} from "@/hooks/useReviewLog";
import { useGame } from "@/context/GameContext";
import { getMaryBustPng, resolveOutfitId, OUTFIT_META } from "@/lib/maryAssets";

// ─── Badge helpers ────────────────────────────────────────────────────────────
const TASK_TYPE_COLORS: Record<TaskType, string> = {
  "Daily Talk": "bg-primary/15 text-primary",
  "Practice Talk": "bg-accent/20 text-accent-foreground",
  "Review Talk": "bg-secondary text-secondary-foreground",
  "Reading Talk": "bg-accent/20 text-accent-foreground",
  "Review Challenge": "bg-secondary text-secondary-foreground",
};

function displayTaskType(type: TaskType): string {
  if (type === "Reading Talk") return "Practice Talk";
  if (type === "Review Challenge") return "Review Talk";
  return type;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Small Mary avatar for messaging layout ───────────────────────────────────
function MaryBadge({ outfit }: { outfit: string }) {
  const id = resolveOutfitId(outfit);
  const meta = OUTFIT_META[id];
  return (
    <div className={`w-14 h-16 shrink-0 rounded-xl overflow-hidden border border-white/20 shadow-sm bg-gradient-to-br ${meta.cardBg}`}>
      <img
        src={getMaryBustPng(outfit)}
        alt="Mary"
        className="w-full h-full object-contain object-top"
        draggable={false}
      />
    </div>
  );
}

// ─── Conversation element builder ─────────────────────────────────────────────
type RenderElem =
  | { kind: "mary"; text: string; showAvatar: boolean }
  | { kind: "eikichi"; text: string }
  | { kind: "correction"; text: string }
  | { kind: "reward"; reward: ReviewLogReward }
  | { kind: "reward_msg"; text: string }
  | { kind: "summary"; text: string };

function buildElements(entry: ReviewLogEntry): RenderElem[] {
  const elems: RenderElem[] = [];
  let maryCount = 0;

  // v3.0 format — Message[]
  if (entry.messages && entry.messages.length > 0) {
    let maryBlockStarted = false;
    const sorted = [...entry.messages].sort((a, b) => a.id - b.id);
    for (const msg of sorted) {
      const isEikichi = msg.speaker !== "Mary";
      if (isEikichi) {
        elems.push({ kind: "eikichi", text: msg.text });
      } else if (msg.type === "correction") {
        elems.push({ kind: "correction", text: msg.text });
      } else if (msg.type === "reward") {
        elems.push({ kind: "reward_msg", text: msg.text });
      } else if (msg.type === "summary" || msg.type === "system") {
        elems.push({ kind: "summary", text: msg.text });
      } else {
        // intro, question, reply, and any future Mary types
        elems.push({ kind: "mary", text: msg.text, showAvatar: !maryBlockStarted });
        maryBlockStarted = true;
      }
    }
    // Also render any legacy afterMessageId rewards
    if (entry.rewards) {
      // rewards are already injected inline for old format — handled in older branch
      // for v3.0 messages they are in-stream, so nothing extra needed here
    }
    return elems;
  }

  // v2.1 format — Rally[]
  if (entry.rallies && entry.rallies.length > 0) {
    for (const rally of entry.rallies) {
      if (rally.user?.text) {
        elems.push({ kind: "eikichi", text: rally.user.text });
      }
      if (rally.correction?.text) {
        elems.push({ kind: "correction", text: rally.correction.text });
      }
      if (rally.reply?.text) {
        elems.push({ kind: "mary", text: rally.reply.text, showAvatar: maryCount === 0 });
        maryCount++;
      }
      // Inline rewards that belong after this rally
      if (entry.rewards) {
        for (const r of entry.rewards) {
          if (r.afterRally === rally.rally) {
            elems.push({ kind: "reward", reward: r });
          }
        }
      }
    }
    return elems;
  }

  // v2 flat format — ConversationItem[]
  if (entry.conversation && entry.conversation.length > 0) {
    for (const item of entry.conversation) {
      if (item.type === "user") {
        elems.push({ kind: "eikichi", text: item.text });
      } else if (item.type === "correction") {
        elems.push({ kind: "correction", text: item.text });
      } else if (item.type === "reply") {
        elems.push({ kind: "mary", text: item.text, showAvatar: maryCount === 0 });
        maryCount++;
      }
    }
    return elems;
  }

  // Legacy rich format — ConversationTurn[]
  if (entry.turns && entry.turns.length > 0) {
    if (entry.openingText) {
      elems.push({ kind: "mary", text: entry.openingText, showAvatar: true });
      maryCount++;
    }
    for (const turn of entry.turns) {
      if (turn.eikichiText) {
        elems.push({ kind: "eikichi", text: turn.eikichiText });
      }
      if (turn.correction) {
        elems.push({ kind: "correction", text: turn.correction });
      }
      elems.push({
        kind: "mary",
        text: turn.maryText,
        showAvatar: maryCount === 0,
      });
      maryCount++;
    }
    return elems;
  }

  // Legacy plain format — just a summary in maryText
  if (entry.maryText) {
    elems.push({ kind: "mary", text: entry.maryText, showAvatar: true });
  }
  return elems;
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({
  entry,
  readAloud,
  outfit,
}: {
  entry: ReviewLogEntry;
  readAloud: boolean;
  outfit: string;
}) {
  const allElems = buildElements(entry);
  // In Read Aloud mode show only Mary's messages
  const displayElems = readAloud
    ? allElems.filter((e) => e.kind === "mary")
    : allElems;

  return (
    <div
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
      data-testid={`entry-card-${entry.id}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 flex-wrap">
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${TASK_TYPE_COLORS[entry.taskType]}`}
          data-testid={`entry-tasktype-${entry.id}`}
        >
          {displayTaskType(entry.taskType)}
        </span>
        <span
          className="text-xs text-muted-foreground font-medium ml-auto shrink-0"
          data-testid={`entry-date-${entry.id}`}
        >
          {formatDate(entry.date)}
        </span>
      </div>

      <div className="mx-4 border-t border-border/60 mb-3" />

      {/* Conversation body */}
      <div className="px-4 pb-4 space-y-2.5">
        {displayElems.map((elem, i) => {
          if (elem.kind === "mary") {
            return (
              <div
                key={i}
                className={`flex items-start gap-2 ${!elem.showAvatar ? "ml-11" : ""}`}
              >
                {elem.showAvatar && <MaryBadge outfit={outfit} />}
                <div className="max-w-[82%] bg-white border border-border/60 rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p
                    className="text-sm text-foreground leading-relaxed"
                    data-testid={
                      i === 0 ? `entry-mary-${entry.id}` : undefined
                    }
                  >
                    {elem.text}
                  </p>
                </div>
              </div>
            );
          }

          if (elem.kind === "eikichi") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[75%] bg-primary/10 border border-primary/15 rounded-2xl rounded-tr-sm px-4 py-2.5">
                  <p
                    className="text-sm text-foreground leading-relaxed"
                    data-testid={
                      i === 0 ? `entry-user-${entry.id}` : undefined
                    }
                  >
                    {elem.text}
                  </p>
                </div>
              </div>
            );
          }

          if (elem.kind === "correction") {
            return (
              <div key={i} className="flex items-start gap-1.5 ml-4 mr-4">
                <span className="text-[10px] text-muted-foreground/55 mt-0.5 shrink-0 leading-5">
                  ✏
                </span>
                <p className="text-xs italic text-muted-foreground/70 leading-relaxed">
                  {elem.text}
                </p>
              </div>
            );
          }

          if (elem.kind === "reward") {
            return (
              <div key={i} className="flex justify-center">
                <span className="text-[11px] text-muted-foreground/50 italic tracking-wide px-3 py-0.5 rounded-full bg-muted/40">
                  ✓ {elem.reward.text}
                </span>
              </div>
            );
          }

          if (elem.kind === "reward_msg") {
            return (
              <div key={i} className="flex justify-center">
                <span className="text-[11px] text-muted-foreground/60 font-semibold tracking-wide px-3 py-0.5 rounded-full bg-primary/8 border border-primary/15">
                  ✓ {elem.text}
                </span>
              </div>
            );
          }

          if (elem.kind === "summary") {
            return (
              <div key={i} className="mx-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/40">
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed text-center">
                  {elem.text}
                </p>
              </div>
            );
          }

          return null;
        })}

        {displayElems.length === 0 && (
          <p className="text-sm text-muted-foreground/50 italic text-center py-2">
            No content.
          </p>
        )}
      </div>

      {/* Rewards footer — v3.0 and v2.1 show rewards inline; footer only for legacy entries */}
      {!entry.messages && !entry.rallies && entry.rewards && entry.rewards.length > 0 ? (
        <div className="mx-4 pb-3 pt-1 border-t border-border/40 flex flex-wrap gap-2 justify-center">
          {entry.rewards.map((r, i) => (
            <span key={i} className="text-[11px] text-muted-foreground/55 italic tracking-wide">
              ✓ {r.text}
            </span>
          ))}
        </div>
      ) : !entry.messages && !entry.rallies && entry.dailyCompleted ? (
        <div className="mx-4 pb-3 pt-1 border-t border-border/40 flex justify-center">
          <span className="text-[11px] text-muted-foreground/55 italic tracking-wide">
            ✓ Daily Talk Complete
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ReviewLogScreen() {
  const { entries } = useReviewLog();
  const { gs, emote } = useGame();
  const [activeTab, setActiveTab] = useState<number | "current">("current");
  const [readAloud, setReadAloud] = useState(false);

  const currentLevel = gs.level;
  const resolvedLevel =
    activeTab === "current" ? currentLevel : (activeTab as number);

  // Current Level tab: use current equipped outfit.
  // Past level tabs: use "black" (the always-available stable outfit).
  const tabOutfit = activeTab === "current" ? gs.equippedOutfit : "black";

  // Past tabs: currentLevel−1 down to 0 (newest first = descending)
  const pastLevels = Array.from(
    { length: currentLevel },
    (_, i) => currentLevel - 1 - i
  );

  const filtered = entries
    .filter((e) => e.level === resolvedLevel)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-8">

        {/* Title + Read Aloud toggle */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold text-foreground"
            data-testid="text-page-title"
          >
            Review Log
          </h1>
          <button
            onClick={() => setReadAloud((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              readAloud
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary border border-border text-muted-foreground hover:border-primary/40"
            }`}
            data-testid="btn-read-aloud"
          >
            {readAloud ? "Exit Read Aloud" : "Read Aloud"}
          </button>
        </div>

        {/* Mary header */}
        <div className="flex items-center gap-4 mb-7">
          <div className="w-36 h-44 flex-shrink-0">
            <img
              src={getMaryBustPng(gs.equippedOutfit)}
              alt="Mary portrait"
              className="w-full h-full object-contain object-top"
              draggable={false}
            />
          </div>
          <div className="bg-card px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-border flex-1">
            <p className="text-sm font-medium text-foreground">
              {readAloud
                ? "Read Aloud mode. Only my English is shown."
                : "Here are our conversations."}
            </p>
          </div>
        </div>

        {/* Level Tabs — horizontally scrollable, newest first */}
        <div
          className="flex gap-2 mb-5 overflow-x-auto pb-1"
          data-testid="level-tabs"
        >
          <button
            onClick={() => setActiveTab("current")}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === "current"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:border-primary/40"
            }`}
            data-testid="tab-current"
          >
            Current Level
          </button>
          {pastLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActiveTab(lvl)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === lvl
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:border-primary/40"
              }`}
              data-testid={`tab-level-${lvl}`}
            >
              Level {lvl}
            </button>
          ))}
        </div>

        {/* Level label divider */}
        <div className="flex items-center gap-2 mb-5">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-bold text-muted-foreground px-2">
            Level {resolvedLevel}
            {activeTab === "current" ? " — current" : ""}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Entries */}
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center gap-4"
            data-testid="empty-state"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-muted-foreground text-sm">
                No entries yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Complete a talk session to see it here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pb-8" data-testid="entries-list">
            {filtered.map((entry) => (
              <SessionCard
                key={entry.id}
                entry={entry}
                readAloud={readAloud}
                outfit={tabOutfit}
              />
            ))}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
