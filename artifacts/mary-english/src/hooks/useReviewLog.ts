import { useState, useCallback } from "react";

const STORAGE_KEY = "mary-english-review-log";

export type TaskType =
  | "Daily Talk"
  | "Practice Talk"
  | "Review Talk"
  | "Reading Talk"
  | "Review Challenge"
  | "Continue Talk";

// ─── Conversation formats ──────────────────────────────────────────────────────

// v2 flat format (legacy)
export interface ConversationItem {
  speaker: string;
  type: "user" | "correction" | "reply";
  text: string;
}

// v2.1 rally format
export interface RallyMessage {
  speaker: string;
  text: string;
}

export interface Rally {
  rally: number;
  user: RallyMessage;
  correction?: RallyMessage;
  reply: RallyMessage;
}

// v3.0+ message format
export interface Message {
  id: number;
  speaker: string;
  type:
    | "intro"
    | "question"
    | "answer"
    | "correction"
    | "reply"
    | "reward"
    | "summary"
    | "system"
    | string;
  text: string;
  // Compact correction format (v3.2+): original/corrected instead of free-form text
  original?: string;
  corrected?: string;
  // Correction grade (v3.1.1+): determines which review card to show.
  // "excellent"  → 🌟 Excellent!
  // "perfect"    → ✅ Perfect!
  // "suggestion" → 💡 Mary's Suggestion
  // "correction" → ✏️ Mary's Correction  (default for old entries)
  grade?: "excellent" | "perfect" | "suggestion" | "correction";
  // Legacy alias kept for backward compat — prefer grade
  subtype?: "excellent" | "perfect" | "suggestion" | "correction";
}

export interface ReviewLogReward {
  type: string;
  emote: string;
  text: string;
  afterRally?: number;     // v2.1: show inline after this rally number
  afterMessageId?: number; // v3.0: show inline after message with this id
}

// ─── Legacy rich conversation format (backward compat) ────────────────────────
export interface ConversationTurn {
  eikichiText: string;
  correction?: string | null;
  maryText: string;
}

export interface ReviewLogEntry {
  id: string;
  date: string;
  level: number;
  taskType: TaskType;
  // Part number for multi-conversation days (1-indexed). Absent on older entries → treated as 1.
  part?: number;
  // v3.1 / v3.0 message format:
  messages?: Message[];
  levelOutfit?: string;      // outfit worn during this session (v3.1)
  maryAvatarVariant?: string; // avatar variant hint (v3.1)
  // v2.1 rally format:
  rallies?: Rally[];
  // v2 flat format (legacy):
  conversation?: ConversationItem[];
  rewards?: ReviewLogReward[];
  // Legacy fields (backward compat):
  userText?: string;
  maryText?: string;
  openingText?: string;
  turns?: ConversationTurn[];
  dailyCompleted?: boolean;
}

// ─── Storage ──────────────────────────────────────────────────────────────────
function loadEntries(): ReviewLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReviewLogEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: ReviewLogEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Sort helper ──────────────────────────────────────────────────────────────
// Canonical sort order for Review Log storage: date asc, then part asc.
// Absent part is treated as 1 (backward compat with pre-part entries).
function sortReviewLog(arr: ReviewLogEntry[]): ReviewLogEntry[] {
  return [...arr].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (da !== db) return da - db;
    return (a.part ?? 1) - (b.part ?? 1);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useReviewLog() {
  const [entries, setEntriesRaw] = useState<ReviewLogEntry[]>(() => loadEntries());

  const setEntries = useCallback(
    (updater: (prev: ReviewLogEntry[]) => ReviewLogEntry[]) => {
      setEntriesRaw((prev) => {
        const next = updater(prev);
        saveEntries(next);
        return next;
      });
    },
    []
  );

  const addEntry = useCallback(
    (entry: Omit<ReviewLogEntry, "id">) => {
      setEntries((prev) => [...prev, { ...entry, id: makeId() }]);
    },
    [setEntries]
  );

  // Replace any existing entry whose date starts with dateKey (YYYY-MM-DD).
  // Used when reimporting the same date to update the conversation without appending a duplicate.
  const upsertByDate = useCallback(
    (dateKey: string, entry: Omit<ReviewLogEntry, "id">) => {
      setEntries((prev) => {
        const filtered = prev.filter((e) => !e.date.startsWith(dateKey));
        return [...filtered, { ...entry, id: makeId() }];
      });
    },
    [setEntries]
  );

  // Insert or update an entry according to the chosen conflict resolution mode.
  //   skip     → do nothing (caller should not call if they intend to skip)
  //   overwrite → remove the conflicting entry (same date + level + part) and add new one
  //   append   → add as a new entry with the next available part number
  const insertWithMode = useCallback(
    (
      entry: Omit<ReviewLogEntry, "id">,
      mode: "skip" | "overwrite" | "append"
    ): void => {
      if (mode === "skip") return;
      const dateKey = entry.date.slice(0, 10);
      const entryLevel = entry.level;
      const entryPart = entry.part ?? 1;

      setEntries((prev) => {
        if (mode === "overwrite") {
          const filtered = prev.filter(
            (e) =>
              !(
                e.date.startsWith(dateKey) &&
                e.level === entryLevel &&
                (e.part ?? 1) === entryPart
              )
          );
          return sortReviewLog([...filtered, { ...entry, id: makeId() }]);
        }
        // append: assign the next available part for this date + level
        const existingParts = prev
          .filter((e) => e.date.startsWith(dateKey) && e.level === entryLevel)
          .map((e) => e.part ?? 1);
        const nextPart =
          existingParts.length > 0 ? Math.max(...existingParts) + 1 : 2;
        return sortReviewLog([...prev, { ...entry, part: nextPart, id: makeId() }]);
      });
    },
    [setEntries]
  );

  // Atomic session-import upsert used by Session JSON import.
  // Keeps entries strictly BEFORE dateKey (earlier dates), keeps same-date entries
  // with part < sessionPart, replaces/adds the entry at dateKey+sessionPart, and
  // removes all same-date entries with part > sessionPart and all entries after dateKey.
  // Result is always in canonical sort order (date asc, part asc).
  const upsertSessionEntry = useCallback(
    (dateKey: string, sessionPart: number, entry: Omit<ReviewLogEntry, "id">) => {
      setEntries((prev) => {
        const kept = prev.filter((e) => {
          const eDate = e.date.slice(0, 10);
          if (eDate < dateKey) return true;   // before session date → keep
          if (eDate > dateKey) return false;  // after session date → remove
          // same date: keep only parts strictly before this session's part
          return (e.part ?? 1) < sessionPart;
        });
        return sortReviewLog([...kept, { ...entry, id: makeId() }]);
      });
    },
    [setEntries]
  );

  const clearLog = useCallback(() => {
    setEntries(() => []);
  }, [setEntries]);

  const addSampleEntry = useCallback(
    (taskType: TaskType, level: number) => {
      type SampleDef = {
        openingText: string;
        turns: ConversationTurn[];
        dailyCompleted: boolean;
      };
      const samples: Record<TaskType, SampleDef> = {
        "Daily Talk": {
          openingText: "Hello, Eikichi! What shall we talk about today?",
          turns: [
            {
              eikichiText: "I went to Buzen City for work yesterday.",
              correction: null,
              maryText:
                "That sounds like a busy day! How long did it take you to get there?",
            },
            {
              eikichiText: "It taked about one hour by car.",
              correction: "It took about one hour by car.",
              maryText:
                "Ah, one hour isn't bad at all. Did you enjoy the drive?",
            },
          ],
          dailyCompleted: true,
        },
        "Practice Talk": {
          openingText:
            "Ready to practice? Let's talk about what you've been reading.",
          turns: [
            {
              eikichiText:
                "Today I read Chapter 27 of Charlie and the Chocolate Factory.",
              correction: null,
              maryText: "Wonderful! What was the most interesting part?",
            },
            {
              eikichiText: "Mike Teavee was shrunked by the TV.",
              correction: "Mike Teavee was shrunk by the TV.",
              maryText:
                "Exactly right! He was sent by television and became tiny. Great reading!",
            },
          ],
          dailyCompleted: false,
        },
        "Review Talk": {
          openingText: "Let's review what we've learned together, Eikichi.",
          turns: [
            {
              eikichiText: "The word 'transmit' means to send something.",
              correction: null,
              maryText: "Very good! Can you use it in a sentence?",
            },
            {
              eikichiText:
                "The TV can transmit a person through television signals.",
              correction: null,
              maryText:
                "Excellent! That's a perfect example. You're doing really well.",
            },
          ],
          dailyCompleted: false,
        },
        "Reading Talk": {
          openingText:
            "Ready to practice? Let's talk about what you've been reading.",
          turns: [
            {
              eikichiText:
                "Today I read Chapter 27 of Charlie and the Chocolate Factory.",
              correction: null,
              maryText: "Wonderful! What was the most interesting part?",
            },
          ],
          dailyCompleted: false,
        },
        "Review Challenge": {
          openingText: "Let's review what we've learned together, Eikichi.",
          turns: [
            {
              eikichiText: "The word 'transmit' means to send something.",
              correction: null,
              maryText: "Very good! Can you use it in a sentence?",
            },
          ],
          dailyCompleted: false,
        },
        "Continue Talk": {
          openingText: "Sure! Let's continue.",
          turns: [
            {
              eikichiText: "Let's continue our conversation from where we left off.",
              correction: null,
              maryText: "Of course! Where were we?",
            },
          ],
          dailyCompleted: false,
        },
      };

      const s = samples[taskType];
      addEntry({
        date: new Date().toISOString(),
        level,
        taskType,
        openingText: s.openingText,
        turns: s.turns,
        dailyCompleted: s.dailyCompleted,
      });
    },
    [addEntry]
  );

  // Session-import upsert: replaces an existing entry with the same date + part + taskType
  // (idempotent re-import of the same session), or appends as a new entry otherwise.
  //
  // Conflict resolution:
  //   exact match (date + part + taskType) → overwrite in place
  //   same date + part but different taskType → assign next available part, append
  //   no conflict → append directly
  //
  // This function is intentionally additive — it never removes entries from other dates.
  // The old `upsertSessionEntry` would wipe all same-date entries, which caused later
  // imports of different task types on the same day to silently destroy earlier entries.
  const appendOrReplaceEntry = useCallback(
    (entry: Omit<ReviewLogEntry, "id">): void => {
      const dateKey = entry.date.slice(0, 10);
      const sessionPart = entry.part ?? 1;

      setEntries((prev) => {
        // 1. Exact match: same date + part + taskType → idempotent overwrite
        const exactIdx = prev.findIndex(
          (e) =>
            e.date.slice(0, 10) === dateKey &&
            (e.part ?? 1) === sessionPart &&
            e.taskType === entry.taskType
        );
        if (exactIdx >= 0) {
          const next = [...prev];
          next[exactIdx] = { ...entry, id: makeId() };
          return sortReviewLog(next);
        }

        // 2. Same date + part but different taskType → assign next available part
        const slotTaken = prev.some(
          (e) => e.date.slice(0, 10) === dateKey && (e.part ?? 1) === sessionPart
        );
        if (slotTaken) {
          const existingParts = prev
            .filter((e) => e.date.slice(0, 10) === dateKey)
            .map((e) => e.part ?? 1);
          const nextPart = Math.max(...existingParts) + 1;
          return sortReviewLog([...prev, { ...entry, part: nextPart, id: makeId() }]);
        }

        // 3. No conflict → append directly
        return sortReviewLog([...prev, { ...entry, id: makeId() }]);
      });
    },
    [setEntries]
  );

  // Remove all Review Log entries whose level matches the given level number.
  // Does not touch game progress (XP, streak, hearts, wardrobe, etc.).
  const clearByLevel = useCallback(
    (level: number) => {
      setEntries((prev) => prev.filter((e) => e.level !== level));
    },
    [setEntries]
  );

  return { entries, addEntry, upsertByDate, insertWithMode, upsertSessionEntry, appendOrReplaceEntry, addSampleEntry, clearLog, clearByLevel };
}
