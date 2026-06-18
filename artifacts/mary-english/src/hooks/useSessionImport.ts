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
  if (raw === "Practice Talk" || raw === "Reading Talk") return "Practice Talk";
  if (raw === "Review Talk" || raw === "Review Challenge") return "Review Talk";
  return "Daily Talk";
}

function validate(
  data: unknown
): { ok: true; data: SessionImportData } | { ok: false; error: string } {
  if (!data || typeof data !== "object")
    return { ok: false, error: "JSON must be an object." };
  const d = data as unknown as Record<string, unknown>;

  if (
    typeof d.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(d.date)
  ) {
    return {
      ok: false,
      error: 'Missing or invalid "date" field (expected YYYY-MM-DD).',
    };
  }
  if (typeof d.xp_gained !== "number") {
    return {
      ok: false,
      error: 'Missing or invalid "xp_gained" field (expected number).',
    };
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
        practice_completed: false,
        review_completed: false,
        rallies: 12,
        opening: "Hello, Eikichi! What shall we talk about today?",
        turns: [
          {
            eikichi: "I went to Buzen City for work yesterday.",
            correction: null,
            mary: "That sounds like a busy day! How long did it take to get there?",
          },
          {
            eikichi: "It taked about one hour by car.",
            correction: "It took about one hour by car.",
            mary: "Ah, one hour isn't bad at all. Did you enjoy the drive?",
          },
        ],
        summary:
          "Eikichi talked about his work trip to Buzen City and discussed travel time.",
      },
      null,
      2
    ),

  practiceTalk: () =>
    JSON.stringify(
      {
        date: todayStr(),
        task_type: "Practice Talk",
        xp_gained: 0,
        daily_completed: false,
        practice_completed: true,
        review_completed: false,
        rallies: 5,
        opening:
          "Ready to practice? Let's talk about what you've been reading.",
        turns: [
          {
            eikichi:
              "Today I read Chapter 27 of Charlie and the Chocolate Factory.",
            correction: null,
            mary: "Wonderful! What was the most interesting part?",
          },
          {
            eikichi: "Mike Teavee was shrunked by the TV.",
            correction: "Mike Teavee was shrunk by the TV.",
            mary: "Exactly right! He was sent by television and became tiny. Great reading!",
          },
        ],
        summary:
          "Eikichi read Chapter 27 of Charlie and the Chocolate Factory. Practiced vocabulary: shrink, restore, transmit.",
      },
      null,
      2
    ),

  reviewTask: () =>
    JSON.stringify(
      {
        date: todayStr(),
        task_type: "Review Talk",
        xp_gained: 0,
        daily_completed: false,
        practice_completed: false,
        review_completed: true,
        rallies: 4,
        opening: "Let's review what we've learned together, Eikichi.",
        turns: [
          {
            eikichi: "The word 'transmit' means to send something.",
            correction: null,
            mary: "Very good! Can you use it in a sentence?",
          },
          {
            eikichi: "The TV can transmit a person through television signals.",
            correction: null,
            mary: "Excellent! That's a perfect example. You're doing really well.",
          },
        ],
        summary:
          "Reviewed vocabulary from last week. Practiced using words in sentences.",
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

    // 6. Add Review Log entry
    const taskType = normalizeTaskType(data.task_type ?? "Daily Talk");
    const hasTurns = Array.isArray(data.turns) && data.turns.length > 0;

    if (hasTurns) {
      // Rich format: full conversation turns
      addEntry({
        date: new Date(data.date + "T00:00:00Z").toISOString(),
        level: levelAtImport,
        taskType,
        openingText: data.opening?.trim() || undefined,
        turns: (data.turns ?? []).map((t) => ({
          eikichiText: t.eikichi,
          correction: t.correction ?? null,
          maryText: t.mary,
        })),
        dailyCompleted: !!data.daily_completed,
      });
    } else if (data.summary && data.summary.trim()) {
      // Legacy format: just a summary
      const ralliesNote =
        data.rallies != null && data.rallies > 0
          ? ` (${data.rallies} rallies)`
          : "";
      addEntry({
        date: new Date(data.date + "T00:00:00Z").toISOString(),
        level: levelAtImport,
        taskType,
        userText: `Imported session${ralliesNote}`,
        maryText: data.summary.trim(),
        dailyCompleted: !!data.daily_completed,
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
