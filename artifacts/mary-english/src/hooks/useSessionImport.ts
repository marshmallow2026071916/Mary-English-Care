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
  if (data.session_id) return data.session_id;
  const snippet = (data.summary ?? "").trim().slice(0, 60);
  return `${data.date}|${data.task_type}|${snippet}`;
}

function clearImported(): void {
  localStorage.removeItem(IMPORTED_KEY);
}

// ─── Validation ───────────────────────────────────────────────────────────────
function normalizeTaskType(raw: string): TaskType {
  if (raw === "Reading Talk") return "Reading Talk";
  if (raw === "Review Challenge") return "Review Challenge";
  return "Daily Talk";
}

function validate(data: unknown): { ok: true; data: SessionImportData } | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "JSON must be an object." };
  const d = data as unknown as Record<string, unknown>;

  if (typeof d.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
    return { ok: false, error: 'Missing or invalid "date" field (expected YYYY-MM-DD).' };
  }
  if (typeof d.xp_gained !== "number") {
    return { ok: false, error: 'Missing or invalid "xp_gained" field (expected number).' };
  }
  if (d.task_type !== undefined && typeof d.task_type !== "string") {
    return { ok: false, error: '"task_type" must be a string.' };
  }

  return { ok: true, data: d as unknown as SessionImportData };
}

// ─── Sample JSON generators ───────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const SAMPLE_JSON = {
  dailyTalk: () =>
    JSON.stringify(
      {
        date: todayStr(),
        task_type: "Daily Talk",
        xp_gained: 10,
        daily_completed: true,
        reading_talk_completed: false,
        special_completed: false,
        rallies: 8,
        summary:
          "Eikichi talked about his weekend trip to Buzen City. Mary asked follow-up questions about local food and transportation.",
      },
      null,
      2
    ),
  readingTalk: () =>
    JSON.stringify(
      {
        date: todayStr(),
        task_type: "Reading Talk",
        xp_gained: 0,
        daily_completed: false,
        reading_talk_completed: true,
        special_completed: false,
        rallies: 5,
        summary:
          "Eikichi read Chapter 27 of Charlie and the Chocolate Factory. We discussed what happened to Mike Teavee and new vocabulary: shrink, restore, transmit.",
      },
      null,
      2
    ),
  specialTask: () =>
    JSON.stringify(
      {
        date: todayStr(),
        task_type: "Review Challenge",
        xp_gained: 0,
        daily_completed: false,
        reading_talk_completed: false,
        special_completed: true,
        rallies: 0,
        summary:
          "Completed a review challenge. Practiced vocabulary from last week and answered comprehension questions about the reading.",
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

    // 4. Capture level before import (for review log entry)
    const levelAtImport = gs.level;

    // 5. Process in game context
    actions.importSessionData(data);

    // 6. Add Review Log entry if summary provided
    if (data.summary && data.summary.trim()) {
      const taskType = normalizeTaskType(data.task_type ?? "Daily Talk");
      const ralliesNote = data.rallies != null && data.rallies > 0 ? ` (${data.rallies} rallies)` : "";
      addEntry({
        date: new Date(data.date + "T00:00:00Z").toISOString(),
        level: levelAtImport,
        taskType,
        userText: `Imported session${ralliesNote}`,
        maryText: data.summary.trim(),
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
