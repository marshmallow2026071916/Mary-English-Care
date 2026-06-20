import { useState, useCallback } from "react";
import { useGame, type SessionImportData } from "@/context/GameContext";
import { useReviewLog, type TaskType } from "@/hooks/useReviewLog";

// ─── Duplicate tracking ───────────────────────────────────────────────────────
const IMPORTED_KEY = "mary-english-imported-sessions";

function loadImported(): Set<string> {
  try {
    const raw = localStorage.getItem(IMPORTED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveImported(set: Set<string>): void {
  localStorage.setItem(IMPORTED_KEY, JSON.stringify([...set]));
}

function makeSessionKey(data: SessionImportData): string {
  return [
    data.date,
    data.dailyTalkCompleted ? "D" : "d",
    data.practiceTalkCompleted ? "P" : "p",
    data.reviewChallengeCompleted ? "R" : "r",
    data.totalXp,
  ].join("|");
}

function clearImported(): void {
  localStorage.removeItem(IMPORTED_KEY);
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(
  data: unknown
): { ok: true; data: SessionImportData } | { ok: false; error: string } {
  if (!data || typeof data !== "object")
    return { ok: false, error: "JSON must be an object." };
  const d = data as Record<string, unknown>;

  if (typeof d.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.date))
    return { ok: false, error: 'Missing or invalid "date" field (expected YYYY-MM-DD).' };

  if (typeof d.dailyTalkCompleted !== "boolean")
    return { ok: false, error: '"dailyTalkCompleted" must be a boolean.' };

  if (typeof d.practiceTalkCompleted !== "boolean")
    return { ok: false, error: '"practiceTalkCompleted" must be a boolean.' };

  if (typeof d.reviewChallengeCompleted !== "boolean")
    return { ok: false, error: '"reviewChallengeCompleted" must be a boolean.' };

  if (typeof d.totalXp !== "number")
    return { ok: false, error: '"totalXp" must be a number.' };

  if (typeof d.dailyXp !== "number")
    return { ok: false, error: '"dailyXp" must be a number.' };

  if (typeof d.practiceXp !== "number")
    return { ok: false, error: '"practiceXp" must be a number.' };

  if (typeof d.reviewXp !== "number")
    return { ok: false, error: '"reviewXp" must be a number.' };

  if (typeof d.bonusXp !== "number")
    return { ok: false, error: '"bonusXp" must be a number.' };

  return { ok: true, data: d as unknown as SessionImportData };
}

// ─── Task type derived from completion flags ───────────────────────────────────
function deriveTaskType(data: SessionImportData): TaskType {
  if (data.dailyTalkCompleted) return "Daily Talk";
  if (data.practiceTalkCompleted) return "Practice Talk";
  return "Review Talk";
}

// ─── Official sample JSON ─────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const SAMPLE_JSON = {
  dailyTalk: () =>
    JSON.stringify(
      {
        date: todayStr(),
        dailyTalkCompleted: true,
        practiceTalkCompleted: false,
        reviewChallengeCompleted: false,
        dailyXp: 10,
        practiceXp: 0,
        reviewXp: 0,
        bonusXp: 0,
        totalXp: 10,
        weeklyStreak: 1,
        heart: 2,
        level: 1,
        notes: ["Daily Talk completed."],
      },
      null,
      2
    ),

  practiceTalk: () =>
    JSON.stringify(
      {
        date: todayStr(),
        dailyTalkCompleted: false,
        practiceTalkCompleted: true,
        reviewChallengeCompleted: false,
        dailyXp: 0,
        practiceXp: 10,
        reviewXp: 0,
        bonusXp: 0,
        totalXp: 10,
        weeklyStreak: 1,
        heart: 2,
        level: 1,
        notes: ["Practice Talk completed."],
      },
      null,
      2
    ),

  reviewTask: () =>
    JSON.stringify(
      {
        date: todayStr(),
        dailyTalkCompleted: false,
        practiceTalkCompleted: false,
        reviewChallengeCompleted: true,
        dailyXp: 0,
        practiceXp: 0,
        reviewXp: 10,
        bonusXp: 0,
        totalXp: 10,
        weeklyStreak: 1,
        heart: 2,
        level: 1,
        notes: ["Review Challenge completed."],
      },
      null,
      2
    ),
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export type ImportStatus = "idle" | "success" | "duplicate" | "error";

export function useSessionImport() {
  const [jsonText, setJsonText] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const { gs, actions } = useGame();
  const { addEntry } = useReviewLog();

  const clearText = useCallback(() => {
    setJsonText("");
    setStatus("idle");
    setStatusMsg("");
  }, []);

  const importSession = useCallback(() => {
    // 1. Parse
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setStatus("error");
      setStatusMsg("Invalid JSON. Please check the format and try again.");
      return;
    }

    // 2. Validate
    const validation = validate(parsed);
    if (!validation.ok) {
      setStatus("error");
      setStatusMsg(validation.error);
      return;
    }
    const data = validation.data;

    // 3. Duplicate check
    const imported = loadImported();
    const key = makeSessionKey(data);
    if (imported.has(key)) {
      setStatus("duplicate");
      setStatusMsg("This session has already been imported.");
      return;
    }

    // 4. Capture level BEFORE import (session stays at starting level)
    const levelAtImport = gs.level;

    // 5. Process in game context
    actions.importSessionData(data);

    // 6. Add Review Log entry using notes as summary
    const taskType = deriveTaskType(data);
    const notesText = (data.notes ?? []).filter(Boolean).join(" ");

    if (notesText) {
      addEntry({
        date: new Date(data.date + "T00:00:00Z").toISOString(),
        level: levelAtImport,
        taskType,
        userText: "Imported session",
        maryText: notesText,
        dailyCompleted: data.dailyTalkCompleted,
      });
    } else {
      addEntry({
        date: new Date(data.date + "T00:00:00Z").toISOString(),
        level: levelAtImport,
        taskType,
        dailyCompleted: data.dailyTalkCompleted,
      });
    }

    // 7. Mark as imported
    imported.add(key);
    saveImported(imported);

    // 8. Done
    setJsonText("");
    setStatus("success");
    setStatusMsg("Session imported successfully.");
  }, [jsonText, gs.level, actions, addEntry]);

  const resetImportHistory = useCallback(() => {
    clearImported();
    setStatus("idle");
    setStatusMsg("Import history cleared.");
  }, []);

  return {
    jsonText,
    setJsonText,
    importSession,
    clearText,
    status,
    statusMsg,
    resetImportHistory,
  };
}
