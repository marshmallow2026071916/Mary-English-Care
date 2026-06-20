import { useState, useCallback } from "react";
import { useGame, type SessionImportData } from "@/context/GameContext";
import {
  useReviewLog,
  type TaskType,
  type Message,
  type Rally,
  type ConversationItem,
  type ReviewLogReward,
} from "@/hooks/useReviewLog";

// "3.0" is the only accepted import version. Old stored data still renders via Review Log.
const SUPPORTED_VERSION = "3.0";

// ─── Types for the daily JSON format ─────────────────────────────────────────
type ProgressData = Omit<SessionImportData, "date">;

interface ReviewLogData {
  level?: number;
  talkType?: string;
  maryAvatarVariant?: string;
  levelOutfit?: string;
  // v3.0
  messages?: Message[];
  // v2.1 legacy
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

  if (d.version !== SUPPORTED_VERSION)
    return { ok: false, error: `Unsupported version. Expected "version": "3.0".` };

  if (typeof d.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.date))
    return { ok: false, error: 'Missing or invalid "date" field (expected YYYY-MM-DD).' };

  if (!d.progress)
    return { ok: false, error: 'Missing "progress" object.' };

  const progressResult = validateProgress(d.progress);
  if (!progressResult.ok) return progressResult;

  const rl = d.reviewLog as Record<string, unknown> | undefined;
  if (rl && rl.messages !== undefined) {
    if (!Array.isArray(rl.messages))
      return { ok: false, error: '"reviewLog.messages" must be an array.' };
    for (const m of rl.messages as unknown[]) {
      if (!m || typeof m !== "object") continue;
      const msg = m as Record<string, unknown>;
      if (typeof msg.id !== "number")
        return { ok: false, error: 'Each message must have a numeric "id".' };
      if (typeof msg.speaker !== "string")
        return { ok: false, error: 'Each message must have a "speaker" string.' };
      if (typeof msg.type !== "string")
        return { ok: false, error: 'Each message must have a "type" string.' };
      if (typeof msg.text !== "string")
        return { ok: false, error: 'Each message must have a "text" string.' };
    }
  }
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
        version: "3.0",
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
          messages: [
            { id: 1, speaker: "Mary", type: "question", text: "What did you do yesterday?" },
            { id: 2, speaker: "Eikichi", type: "answer", text: "I went to Buzen City for work yesterday." },
            { id: 3, speaker: "Mary", type: "reply", text: "That sounds like a busy day! How long did it take to get there?" },
            { id: 4, speaker: "Eikichi", type: "answer", text: "It taked about one hour by car." },
            { id: 5, speaker: "Mary", type: "correction", text: "It took about one hour by car." },
            { id: 6, speaker: "Mary", type: "reply", text: "Ah, one hour isn't bad at all. Did you enjoy the drive?" },
            { id: 7, speaker: "Mary", type: "reward", text: "Daily Talk Complete!" },
            { id: 8, speaker: "Mary", type: "summary", text: "Daily Talk: Complete." },
          ],
        },
      },
      null,
      2
    ),

  practiceTalk: () =>
    JSON.stringify(
      {
        version: "3.0",
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
          messages: [
            { id: 1, speaker: "Mary", type: "question", text: "What did you read aloud today?" },
            { id: 2, speaker: "Eikichi", type: "answer", text: "Today, I read aloud Chapter 28 of Charlie and the Chocolate Factory." },
            { id: 3, speaker: "Mary", type: "correction", text: "Today, I read aloud Chapter 28 of Charlie and the Chocolate Factory." },
            { id: 4, speaker: "Mary", type: "reply", text: "That sounds great! What part did you enjoy the most?" },
            { id: 5, speaker: "Mary", type: "reward", text: "Practice Talk Complete!" },
            { id: 6, speaker: "Mary", type: "summary", text: "Practice Talk: Complete." },
          ],
        },
      },
      null,
      2
    ),

  reviewTask: () =>
    JSON.stringify(
      {
        version: "3.0",
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
          messages: [
            { id: 1, speaker: "Mary", type: "question", text: "Can you use the word 'transmit' in a sentence?" },
            { id: 2, speaker: "Eikichi", type: "answer", text: "The TV can transmit a person through television signals." },
            { id: 3, speaker: "Mary", type: "reply", text: "Excellent! That's a perfect example. You're doing really well." },
            { id: 4, speaker: "Mary", type: "reward", text: "Review Talk Complete!" },
            { id: 5, speaker: "Mary", type: "summary", text: "Review Talk: Complete." },
          ],
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

    // 5. Apply progress only on first import for this date (avoid double-XP on re-import).
    //    Capture levelAfter so the review log entry goes under the correct level tab.
    let levelForLog = levelAtImport;
    if (!alreadyImported) {
      const importResult = actions.importSessionData({ ...data.progress, date: data.date });
      // Use the level AFTER XP is applied so the entry appears under the Current Level tab.
      levelForLog = importResult.levelAfter;
    }

    // 5b. Always write importedDailyCompleted — even on re-import.
    //     Uses a dedicated localStorage key + separate useState to avoid any
    //     React batch-update ordering issues with the main GameState.
    actions.setImportedDailyCompleted(data.progress.dailyTalkCompleted);

    // 6. Always upsert review log — replaces any existing entry for the same date
    const rl = data.reviewLog;
    if (rl) {
      const taskType = normalizeTaskType(rl.talkType ?? "");
      upsertByDate(data.date, {
        date: new Date(data.date + "T00:00:00Z").toISOString(),
        // levelForLog = importResult.levelAfter (first import) or gs.level (re-import).
        // Matches what the "Current Level" tab shows after import.
        level: levelForLog,
        taskType,
        // v3.0 messages take priority; then v2.1 rallies; then v2 flat conversation
        messages: rl.messages,
        rallies: rl.messages ? undefined : rl.rallies,
        conversation: rl.messages || rl.rallies ? undefined : (rl.conversation as ConversationItem[] | undefined),
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
