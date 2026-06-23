import { useState } from "react";
import { BookOpen } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import {
  useReviewLog,
  type ReviewLogEntry,
  type TaskType,
  type Message,
} from "@/hooks/useReviewLog";
import { useGame } from "@/context/GameContext";
import { getMaryBustPng, resolveOutfitId, OUTFIT_META } from "@/lib/maryAssets";

// ─── Task type helpers ────────────────────────────────────────────────────────

// Task types that appear in Review Log (End Talk is excluded)
const DISPLAYED_TASK_TYPES = new Set<TaskType>([
  "Daily Talk",
  "Practice Talk",
  "Review Talk",
  "Reading Talk",
  "Review Challenge",
  "Continue Talk",
]);

const TASK_TYPE_COLORS: Record<TaskType, string> = {
  "Daily Talk":      "bg-primary/15 text-primary",
  "Practice Talk":   "bg-accent/20 text-accent-foreground",
  "Review Talk":     "bg-secondary text-secondary-foreground",
  "Reading Talk":    "bg-accent/20 text-accent-foreground",
  "Review Challenge":"bg-secondary text-secondary-foreground",
  "Continue Talk":   "bg-teal-500/15 text-teal-700",
};

function displayTaskType(type: TaskType): string {
  if (type === "Reading Talk")  return "Practice Talk";   // legacy alias
  if (type === "Review Talk")   return "Review Challenge"; // legacy → new name
  return type;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Small Mary avatar badge ──────────────────────────────────────────────────
function MaryBadge({ outfit }: { outfit: string }) {
  return (
    <div className="w-11 h-13 shrink-0 rounded-xl overflow-hidden shadow-sm bg-gradient-to-br from-primary/20 to-accent/20">
      <img
        src={getMaryBustPng(outfit)}
        alt="Mary"
        className="w-full h-full object-contain object-top"
        draggable={false}
      />
    </div>
  );
}

// ─── Render element types ─────────────────────────────────────────────────────
type CorrectionSubtype = "excellent" | "perfect" | "suggestion" | "correction";

type RenderElem =
  | { kind: "mary";        text: string; showAvatar: boolean }
  | { kind: "eikichi";     text: string }
  | { kind: "review_card"; subtype: CorrectionSubtype; text: string; corrected?: string };

// ─── Correction grade detection ───────────────────────────────────────────────
const VALID_SUBTYPES = new Set<string>(["excellent", "perfect", "suggestion", "correction"]);

function detectSubtype(msg: Message): CorrectionSubtype {
  // v3.1.1+: prefer explicit grade field
  if (msg.grade && VALID_SUBTYPES.has(msg.grade)) {
    return msg.grade as CorrectionSubtype;
  }
  // Backward compat: legacy subtype field
  if (msg.subtype && VALID_SUBTYPES.has(msg.subtype)) {
    return msg.subtype as CorrectionSubtype;
  }
  // Infer: compact correction format → correction card
  if (msg.original !== undefined || msg.corrected !== undefined) {
    return "correction";
  }
  // Legacy free-form text → default to correction
  return "correction";
}

// ─── Build render elements from any entry format ──────────────────────────────
function buildElements(entry: ReviewLogEntry): RenderElem[] {
  const elems: RenderElem[] = [];

  // ── v3.0+ message format ──────────────────────────────────────────────────
  if (entry.messages && entry.messages.length > 0) {
    const sorted = [...entry.messages].sort((a, b) => a.id - b.id);

    for (const msg of sorted) {
      switch (msg.type) {
        case "intro":
        case "question":
        case "reply":
          // Conversation speech — always shown
          elems.push({ kind: "mary", text: msg.text, showAvatar: true });
          break;
        case "answer":
          elems.push({ kind: "eikichi", text: msg.text });
          break;
        case "correction":
          elems.push({
            kind: "review_card",
            subtype: detectSubtype(msg),
            text: msg.text ?? "",
            corrected: msg.corrected,
          });
          break;
        // summary, reward, system → intentionally skipped (game/meta info)
        default:
          // Unknown types: if speaker looks like Mary, show as a Mary bubble
          if (
            msg.speaker &&
            msg.speaker.toLowerCase() !== "eikichi" &&
            msg.speaker.toLowerCase() !== "user" &&
            msg.speaker.toLowerCase() !== "correction" &&
            msg.speaker.toLowerCase() !== "system"
          ) {
            elems.push({ kind: "mary", text: msg.text, showAvatar: true });
          }
          break;
      }
    }
    return elems;
  }

  // ── v2.1 rally format ─────────────────────────────────────────────────────
  if (entry.rallies && entry.rallies.length > 0) {
    for (const rally of entry.rallies) {
      if (rally.user?.text) {
        elems.push({ kind: "eikichi", text: rally.user.text });
      }
      if (rally.correction?.text) {
        elems.push({ kind: "review_card", subtype: "correction", text: rally.correction.text });
      }
      if (rally.reply?.text) {
        elems.push({ kind: "mary", text: rally.reply.text, showAvatar: true });
      }
    }
    return elems;
  }

  // ── v2 flat format ────────────────────────────────────────────────────────
  if (entry.conversation && entry.conversation.length > 0) {
    for (const item of entry.conversation) {
      if (item.type === "user") {
        elems.push({ kind: "eikichi", text: item.text });
      } else if (item.type === "correction") {
        elems.push({ kind: "review_card", subtype: "correction", text: item.text });
      } else if (item.type === "reply") {
        elems.push({ kind: "mary", text: item.text, showAvatar: true });
      }
    }
    return elems;
  }

  // ── Legacy rich format (turns) ────────────────────────────────────────────
  if (entry.turns && entry.turns.length > 0) {
    if (entry.openingText) {
      elems.push({ kind: "mary", text: entry.openingText, showAvatar: true });
    }
    for (const turn of entry.turns) {
      if (turn.eikichiText) {
        elems.push({ kind: "eikichi", text: turn.eikichiText });
      }
      if (turn.correction) {
        elems.push({ kind: "review_card", subtype: "correction", text: turn.correction });
      }
      elems.push({ kind: "mary", text: turn.maryText, showAvatar: true });
    }
    return elems;
  }

  // ── Legacy plain format ───────────────────────────────────────────────────
  if (entry.maryText) {
    elems.push({ kind: "mary", text: entry.maryText, showAvatar: true });
  }
  return elems;
}

// ─── Bubble / card renderers ──────────────────────────────────────────────────

function MaryBubble({
  elem,
  outfit,
  testId,
}: {
  elem: Extract<RenderElem, { kind: "mary" }>;
  outfit: string;
  testId?: string;
}) {
  return (
    <div className={`flex items-start gap-2.5 ${!elem.showAvatar ? "pl-[3.375rem]" : ""}`}>
      {elem.showAvatar && <MaryBadge outfit={outfit} />}
      <div className="max-w-[82%] bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
        <p
          className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
          data-testid={testId}
        >
          {elem.text}
        </p>
      </div>
    </div>
  );
}

function EikichiBubble({
  elem,
  testId,
}: {
  elem: Extract<RenderElem, { kind: "eikichi" }>;
  testId?: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] bg-primary/10 border border-primary/15 rounded-2xl rounded-tr-sm px-4 py-2.5">
        <p
          className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
          data-testid={testId}
        >
          {elem.text}
        </p>
      </div>
    </div>
  );
}

// Four review card types (v3.1.1):
// 🌟 Excellent!        — praise
// ✅ Perfect!          — sentence already natural
// 💡 Mary's Suggestion — more natural alternative (show corrected only)
// ✏️ Mary's Correction — error corrected (show corrected only)
function ReviewCard({
  subtype,
  text,
  corrected,
}: {
  subtype: CorrectionSubtype;
  text: string;
  corrected?: string;
}) {
  if (subtype === "excellent") {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3">
        <p className="text-xs font-bold text-yellow-700 mb-1.5">🌟 Excellent!</p>
        <p className="text-sm text-yellow-900 leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      </div>
    );
  }

  if (subtype === "perfect") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-xs font-bold text-green-700 mb-1.5">✅ Perfect!</p>
        <p className="text-sm text-green-900 leading-relaxed">Perfect!</p>
      </div>
    );
  }

  if (subtype === "suggestion") {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-xs font-bold text-blue-700 mb-1.5">💡 Mary's Suggestion</p>
        <p className="text-sm text-blue-900 font-medium leading-relaxed whitespace-pre-wrap">
          {corrected ?? text}
        </p>
      </div>
    );
  }

  // Default: "correction"
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-xs font-bold text-amber-700 mb-1.5">✏️ Mary's Correction</p>
      <p className="text-sm text-amber-900 font-medium leading-relaxed whitespace-pre-wrap">
        {corrected ?? text}
      </p>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({
  entry,
  outfit,
}: {
  entry: ReviewLogEntry;
  outfit: string;
}) {
  const displayElems = buildElements(entry);

  const colorClass = TASK_TYPE_COLORS[entry.taskType] ?? "bg-secondary text-secondary-foreground";

  return (
    <div
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
      data-testid={`entry-card-${entry.id}`}
    >
      {/* Header: ✔ task badge + date */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 flex-wrap">
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${colorClass}`}
          data-testid={`entry-tasktype-${entry.id}`}
        >
          ✔ {displayTaskType(entry.taskType)}
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
              <MaryBubble
                key={i}
                elem={elem}
                outfit={outfit}
                testId={i === 0 ? `entry-mary-${entry.id}` : undefined}
              />
            );
          }
          if (elem.kind === "eikichi") {
            return (
              <EikichiBubble
                key={i}
                elem={elem}
                testId={i === 0 ? `entry-user-${entry.id}` : undefined}
              />
            );
          }
          if (elem.kind === "review_card") {
            return (
              <ReviewCard
                key={i}
                subtype={elem.subtype}
                text={elem.text}
                corrected={elem.corrected}
              />
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
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ReviewLogScreen() {
  const { entries } = useReviewLog();
  const { gs } = useGame();
  const [activeTab, setActiveTab] = useState<number | "current">("current");

  const currentLevel = gs.level;
  const resolvedLevel =
    activeTab === "current" ? currentLevel : (activeTab as number);
  const tabOutfit = activeTab === "current" ? gs.equippedOutfit : "black";

  const pastLevels = Array.from(
    { length: currentLevel },
    (_, i) => currentLevel - 1 - i
  );

  // Oldest first; filter out any entry whose taskType is not in the display set
  const filtered = entries
    .filter(
      (e) =>
        e.level === resolvedLevel &&
        DISPLAYED_TASK_TYPES.has(e.taskType)
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-8">

        {/* Title */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold text-foreground"
            data-testid="text-page-title"
          >
            Review Log
          </h1>
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
              Here are our conversations.
            </p>
          </div>
        </div>

        {/* Level Tabs */}
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

        {/* Entries — oldest at top, newest at bottom */}
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
