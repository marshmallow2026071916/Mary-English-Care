import { useState, useCallback } from "react";
import { useGame, type SessionImportData } from "@/context/GameContext";
import {
  useReviewLog,
  type TaskType,
  type Rally,
  type ConversationItem,
  type ReviewLogReward,
} from "@/hooks/useReviewLog";

// "2.1" is the current official version; 2 (number) is accepted for legacy data.
const SUPPORTED_VERSIONS: Array<string | number> = ["2.1", 2];

// ─── Types for the daily JSON format ─────────────────────────────────────────
type ProgressData = Omit<SessionImportData, "date">;

interface ReviewLogData {
  level?: number;
  talkType?: string;
  maryAvatarVariant?: string;
  levelOutfit?: string;
  // v2.1
  rallies?: Rally[];
  // v2 legacy
  conversation?: Array<{ speaker: string; type: string; text: string }>;
  rewards?: ReviewLogReward[];
}

interface DailyImportJSON {
  date: string;
  progress: ProgressData;
  reviewLog?: ReviewLogData;
}

// ─── Duplicate tracking (keyed by date) ───────────────────────────────────────
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

function clearImported(): void {
  localStorage.removeItem(IMPORTED_KEY);
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateProgress(
  p: unknown
): { ok: true; data: ProgressData } | { ok: false; error: string } {
  if (!p || typeof p !== "object")
    return { ok: false, error: '"progress" must be an object.' };
  const d = p as Record<string, unknown>;

  if (typeof d.dailyTalkCompleted !== "boolean")
    return { ok: false, error: '"progress.dailyTalkCompleted" must be a boolean.' };
  if (typeof d.practiceTalkCompleted !== "boolean")
    return { ok: false, error: '"progress.practiceTalkCompleted" must be a boolean.' };
  if (typeof d.reviewChallengeCompleted !== "boolean")
    return { ok: false, error: '"progress.reviewChallengeCompleted" must be a boolean.' };
  if (typeof d.totalXp !== "number")
    return { ok: false, error: '"progress.totalXp" must be a number.' };
  if (typeof d.dailyXp !== "number")
    return { ok: false, error: '"progress.dailyXp" must be a number.' };
  if (typeof d.practiceXp !== "number")
    return { ok: false, error: '"progress.practiceXp" must be a number.' };
  if (typeof d.reviewXp !== "number")
    return { ok: false, error: '"progress.reviewXp" must be a number.' };
  if (typeof d.bonusXp !== "number")
    return { ok: false, error: '"progress.bonusXp" must be a number.' };

  return { ok: true, data: d as unknown as ProgressData };
}

function validate(
  data: unknown
): { ok: true; data: DailyImportJSON } | { ok: false; error: string } {
  if (!data || typeof data !== "object")
    return { ok: false, error: "JSON must be an object." };
  const d = data as Record<string, unknown>;

  if (!SUPPORTED_VERSIONS.includes(d.version as string | number))
    return { ok: false, error: `Unsupported version. Expected "version": "2.1".` };

  if (typeof d.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.date))
    return { ok: false, error: 'Missing or invalid "date" field (expected YYYY-MM-DD).' };

  if (!d.progress)
    return { ok: false, error: 'Missing "progress" object.' };

  const progressResult = validateProgress(d.progress);
  if (!progressResult.ok) return progressResult;

  // v2.1: rallies must be an array when present
  const rl = d.reviewLog as Record<string, unknown> | undefined;
  if (rl && rl.rallies !== undefined && !Array.isArray(rl.rallies))
    return { ok: false, error: '"reviewLog.rallies" must be an array.' };

  return {
    ok: true,
    data: {
      date: d.date,
      progress: progressResult.data,
      reviewLog: d.reviewLog as ReviewLogData | undefined,
    },
  };
}

// ─── Task type normalization ──────────────────────────────────────────────────
function normalizeTaskType(raw: string): TaskType {
  if (raw === "Practice Talk" || raw === "Reading Talk") return "Practice Talk";
  if (raw === "Review Talk" || raw === "Review Challenge") return "Review Talk";
  return "Daily Talk";
}

// ─── Official sample JSON (keys match TasksScreen buttons) ────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const SAMPLE_JSON = {
  dailyTalk: () =>
    JSON.stringify(
      {
        version: "2.1",
        date: todayStr(),
        progress: {
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
        reviewLog: {
          level: 1,
          talkType: "Daily Talk",
          maryAvatarVariant: "bust",
          levelOutfit: "black",
          rallies: [
            {
              rally: 1,
              user: { speaker: "Eikichi", text: "I went to Buzen City for work yesterday." },
              reply: { speaker: "Mary", text: "That sounds like a busy day! How long did it take to get there?" },
            },
            {
              rally: 2,
              user: { speaker: "Eikichi", text: "It taked about one hour by car." },
              correction: { speaker: "Mary", text: "It took about one hour by car." },
              reply: { speaker: "Mary", text: "Ah, one hour isn't bad at all. Did you enjoy the drive?" },
            },
          ],
          rewards: [{ afterRally: 2, type: "daily", emote: "cheer", text: "Daily Talk completed." }],
        },
      },
      null,
      2
    ),

  practiceTalk: () =>
    JSON.stringify(
      {
        version: "2.1",
        date: todayStr(),
        progress: {
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
        reviewLog: {
          level: 1,
          talkType: "Practice Talk",
          maryAvatarVariant: "bust",
          levelOutfit: "black",
          rallies: [
            {
              rally: 1,
              user: { speaker: "Eikichi", text: "Today, I read aloud Chapter 28 of Charlie and the Chocolate Factory." },
              correction: { speaker: "Mary", text: "Today, I read aloud Chapter 28 of Charlie and the Chocolate Factory." },
              reply: { speaker: "Mary", text: "That sounds great! What part did you enjoy the most?" },
            },
          ],
          rewards: [{ afterRally: 1, type: "practice", emote: "smile", text: "Practice Talk completed." }],
        },
      },
      null,
      2
    ),

  reviewTask: () =>
    JSON.stringify(
      {
        version: "2.1",
        date: todayStr(),
        progress: {
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
        reviewLog: {
          level: 1,
          talkType: "Review Talk",
          maryAvatarVariant: "bust",
          levelOutfit: "black",
          rallies: [
            {
              rally: 1,
              user: { speaker: "Eikichi", text: "The word 'transmit' means to send something." },
              reply: { speaker: "Mary", text: "Very good! Can you use it in a sentence?" },
            },
            {
              rally: 2,
              user: { speaker: "Eikichi", text: "The TV can transmit a person through television signals." },
              reply: { speaker: "Mary", text: "Excellent! That's a perfect example. You're doing really well." },
            },
          ],
          rewards: [{ afterRally: 2, type: "review", emote: "smile", text: "Review Challenge completed." }],
        },
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
  const { upsertByDate } = useReviewLog();

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

    // 3. Check whether this date has already been imported
    const imported = loadImported();
    const alreadyImported = imported.has(data.date);

    // 4. Capture level BEFORE any state changes (review log stores starting level)
    const levelAtImport = gs.level;

    // 5. Apply progress only on first import for this date (avoid double-XP on re-import)
    if (!alreadyImported) {
      actions.importSessionData({ ...data.progress, date: data.date });
    }

    // 6. Always upsert review log — replaces any existing entry for the same date
    const rl = data.reviewLog;
    if (rl) {
      const taskType = normalizeTaskType(rl.talkType ?? "");
      upsertByDate(data.date, {
        date: new Date(data.date + "T00:00:00Z").toISOString(),
        level: rl.level ?? levelAtImport,
        taskType,
        // v2.1 rally format takes priority; fall back to v2 flat conversation
        rallies: rl.rallies,
        conversation: rl.rallies ? undefined : (rl.conversation as ConversationItem[] | undefined),
        rewards: rl.rewards,
        dailyCompleted: data.progress.dailyTalkCompleted,
      });
    }

    // 7. Mark date as imported (no-op if already there)
    imported.add(data.date);
    saveImported(imported);

    // 8. Done — differentiate first import from update
    setJsonText("");
    setStatus("success");
    setStatusMsg(
      alreadyImported
        ? "Session updated successfully."
        : "Session imported successfully."
    );
  }, [jsonText, gs.level, actions, upsertByDate]);

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
