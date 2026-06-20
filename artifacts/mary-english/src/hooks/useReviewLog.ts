import { useState, useCallback } from "react";

const STORAGE_KEY = "mary-english-review-log";

export type TaskType =
  | "Daily Talk"
  | "Practice Talk"
  | "Review Talk"
  | "Reading Talk"
  | "Review Challenge";

// ─── New conversation format ───────────────────────────────────────────────────
export interface ConversationItem {
  speaker: string;
  type: "user" | "correction" | "reply";
  text: string;
}

export interface ReviewLogReward {
  type: string;
  emote: string;
  text: string;
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
  // New conversation format:
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

  return { entries, addEntry, addSampleEntry, clearLog };
}
