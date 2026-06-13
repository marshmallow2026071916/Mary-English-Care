import { useState, useCallback } from "react";

const STORAGE_KEY = "mary-english-review-log";

export type TaskType = "Daily Talk" | "Reading Talk" | "Review Challenge";

export interface ReviewLogEntry {
  id: string;
  date: string;
  level: number;
  taskType: TaskType;
  userText: string;
  maryText: string;
}

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

export function useReviewLog() {
  const [entries, setEntriesRaw] = useState<ReviewLogEntry[]>(() => loadEntries());

  const setEntries = useCallback((updater: (prev: ReviewLogEntry[]) => ReviewLogEntry[]) => {
    setEntriesRaw((prev) => {
      const next = updater(prev);
      saveEntries(next);
      return next;
    });
  }, []);

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
      const samples: Record<TaskType, { userText: string; maryText: string }> = {
        "Daily Talk": {
          userText: "I went to Buzen City for work.",
          maryText: "That sounds like a busy day. How long did it take you to get there?",
        },
        "Reading Talk": {
          userText: "Today I read Chapter 27 of Charlie and the Chocolate Factory.",
          maryText: "Great. What was the most interesting part of the chapter?",
        },
        "Review Challenge": {
          userText: "Mike Teavee became very small.",
          maryText: "Yes, that's right. He was sent by television and became tiny.",
        },
      };

      addEntry({
        date: new Date().toISOString(),
        level,
        taskType,
        userText: samples[taskType].userText,
        maryText: samples[taskType].maryText,
      });
    },
    [addEntry]
  );

  return { entries, addEntry, addSampleEntry, clearLog };
}
