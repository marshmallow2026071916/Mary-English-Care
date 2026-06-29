import { useState, useCallback } from "react";
import { useGame, type SessionImportData, type FullProgressRestoreData } from "@/context/GameContext";
import {
  useReviewLog,
  type TaskType,
  type Message,
  type Rally,
  type ConversationItem,
  type ReviewLogReward,
  type ReviewLogEntry,
} from "@/hooks/useReviewLog";

// Accepted import versions.
const SUPPORTED_VERSIONS = new Set(["3.0", "3.1", "3.2"]);

// ─── Types ────────────────────────────────────────────────────────────────────
type ProgressData = Omit<SessionImportData, "date">;

interface ReviewLogData {
  level?: number;
  talkType?: string;
  maryAvatarVariant?: string;
  levelOutfit?: string;
  messages?: Message[];
  // v2.1 legacy
  rallies?: Rally[];
  // v2 legacy
  conversation?: Array<{ speaker: string; type: string; text: string }>;
  rewards?: ReviewLogReward[];
}

interface DailyImportJSON {
  date: string;
  part?: number;       // optional — used to verify part order when both JSONs have it
  totalParts?: number; // optional — informational
  progress: ProgressData;
  reviewLog?: ReviewLogData;
}

// ─── Full Progress Restore parser ─────────────────────────────────────────────
// Called when JSON 1 contains restoreMode: "full_progress_restore".
// All fields except restoreMode are optional — missing values get sensible defaults.
function parseRestoreJSON(
  raw: unknown
): { ok: true; data: FullProgressRestoreData } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "JSON must be an object." };
  const d = raw as Record<string, unknown>;

  if (d.restoreMode !== "full_progress_restore")
    return { ok: false, error: '"restoreMode" must be "full_progress_restore".' };

  const date =
    typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date)
      ? d.date
      : new Date().toISOString().slice(0, 10);

  const num = (key: string) => (typeof d[key] === "number" ? (d[key] as number) : undefined);
  const bool = (key: string) => (typeof d[key] === "boolean" ? (d[key] as boolean) : undefined);
  const str = (key: string) => (typeof d[key] === "string" ? (d[key] as string) : undefined);
  const arr = (key: string) =>
    Array.isArray(d[key]) ? (d[key] as string[]) : undefined;

  return {
    ok: true,
    data: {
      date,
      restoreMode: "full_progress_restore",
      level: num("level"),
      xpInCurrentLevel: num("xpInCurrentLevel"),
      totalXp: num("totalXp"),
      weeklyStreak: num("weeklyStreak"),
      heart: num("heart"),
      hearts: num("hearts"),
      maxHeart: num("maxHeart"),
      maxHearts: num("maxHearts"),
      lastHeartChanged: str("lastHeartChanged"),
      dailyTalkCompleted: bool("dailyTalkCompleted"),
      practiceTasksCompleted: num("practiceTasksCompleted"),
      reviewTasksCompleted: num("reviewTasksCompleted"),
      reviewRewardEarned: bool("reviewRewardEarned"),
      currentOutfit: str("currentOutfit"),
      unlockedOutfits: arr("unlockedOutfits"),
      unlockedEmotes: arr("unlockedEmotes"),
      unlockedBackgrounds: arr("unlockedBackgrounds"),
      unlockedReviewRewards: arr("unlockedReviewRewards"),
    },
  };
}

// ─── Review Log Recovery types & parser ───────────────────────────────────────

// Exported so TasksScreen can render the conflict resolution UI.
export interface PendingConflict {
  newEntry: Omit<ReviewLogEntry, "id">;
  existingEntry: ReviewLogEntry;
  nextPartIfAppend: number;       // pre-computed for display in Append button
}

interface ReviewLogRecoveryData {
  date: string;
  part: number;                   // always normalised; 1 if absent in JSON
  level: number;                  // always normalised; 0 if absent in JSON
  conversationType: string;
  messages: Message[];
  levelOutfit?: string;
  maryAvatarVariant?: string;
}

// A JSON is a Review Log Recovery if it has `date` + `reviewLog` but no `progress`
// and no `restoreMode` (those two are reserved for the other import modes).
function isReviewLogRecovery(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const d = raw as Record<string, unknown>;
  return (
    !d.progress &&
    !d.restoreMode &&
    typeof d.date === "string" &&
    d.reviewLog !== undefined
  );
}

function parseReviewLogRecovery(
  raw: unknown
): { ok: true; data: ReviewLogRecoveryData } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object")
    return { ok: false, error: "JSON must be an object." };
  const d = raw as Record<string, unknown>;

  if (typeof d.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.date))
    return { ok: false, error: 'Missing or invalid "date" field (expected YYYY-MM-DD).' };

  const rl = d.reviewLog;
  if (!rl || typeof rl !== "object")
    return { ok: false, error: 'Missing "reviewLog" object.' };
  const rlObj = rl as Record<string, unknown>;
  if (!Array.isArray(rlObj.messages))
    return { ok: false, error: '"reviewLog.messages" must be an array.' };

  return {
    ok: true,
    data: {
      date: d.date,
      part: typeof d.part === "number" ? d.part : 1,
      level: typeof d.level === "number" ? d.level : 0,
      conversationType:
        typeof d.conversationType === "string" ? d.conversationType : "",
      messages: rlObj.messages as Message[],
      levelOutfit:
        typeof rlObj.levelOutfit === "string" ? rlObj.levelOutfit : undefined,
      maryAvatarVariant:
        typeof rlObj.maryAvatarVariant === "string"
          ? rlObj.maryAvatarVariant
          : undefined,
    },
  };
}

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

  // Accept both spellings; normalize to the field name GameContext reads.
  const practiceTalkCompleted = d.practiceTalkCompleted ?? d.practiceTaskCompleted;
  if (typeof practiceTalkCompleted !== "boolean")
    return { ok: false, error: '"progress.practiceTalkCompleted" must be a boolean.' };

  if (typeof d.reviewChallengeCompleted !== "boolean")
    return { ok: false, error: '"progress.reviewChallengeCompleted" must be a boolean.' };

  if (typeof d.totalXp !== "number")
    return {
      ok: false,
      error: "progress.totalXp is missing. Please use the full Mary English progress format.",
    };
  if (typeof d.dailyXp !== "number")
    return { ok: false, error: '"progress.dailyXp" must be a number.' };
  if (typeof d.practiceXp !== "number")
    return { ok: false, error: '"progress.practiceXp" must be a number.' };
  if (typeof d.reviewXp !== "number")
    return { ok: false, error: '"progress.reviewXp" must be a number.' };
  if (typeof d.bonusXp !== "number")
    return { ok: false, error: '"progress.bonusXp" must be a number.' };

  // Return normalized progress so GameContext always receives practiceTalkCompleted.
  return {
    ok: true,
    data: {
      ...(d as unknown as ProgressData),
      practiceTalkCompleted,
    },
  };
}

function validate(
  data: unknown
): { ok: true; data: DailyImportJSON } | { ok: false; error: string } {
  if (!data || typeof data !== "object")
    return { ok: false, error: "JSON must be an object." };
  const d = data as Record<string, unknown>;

  if (!SUPPORTED_VERSIONS.has(String(d.version)))
    return {
      ok: false,
      error: `Unsupported version. Expected "version": "3.0", "3.1", or "3.2".`,
    };

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
      if (typeof msg.text !== "string" && msg.text !== undefined)
        return { ok: false, error: 'Each message "text" must be a string.' };
    }
  }
  if (rl && rl.rallies !== undefined && !Array.isArray(rl.rallies))
    return { ok: false, error: '"reviewLog.rallies" must be an array.' };

  return {
    ok: true,
    data: {
      date: d.date,
      part: typeof d.part === "number" ? d.part : undefined,
      totalParts: typeof d.totalParts === "number" ? d.totalParts : undefined,
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

// ─── Sample JSON ──────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const SAMPLE_JSON = {
  dailyTalk: () =>
    JSON.stringify(
      {
        version: "3.2",
        date: todayStr(),
        part: 1,
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
          lastHeartChanged: todayStr(),
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
        version: "3.2",
        date: todayStr(),
        part: 1,
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
          lastHeartChanged: todayStr(),
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
            { id: 3, speaker: "Correction", type: "correction", original: "Today, I read aloud Chapter 28.", corrected: "Today, I read Chapter 28 aloud." },
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
        version: "3.2",
        date: todayStr(),
        part: 1,
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
          lastHeartChanged: todayStr(),
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
  const [json1Text, setJson1Text] = useState("");
  const [json2Text, setJson2Text] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const { gs, actions } = useGame();
  const { upsertByDate, insertWithMode, entries } = useReviewLog();
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null);

  const clearAll = useCallback(() => {
    setJson1Text("");
    setJson2Text("");
    setStatus("idle");
    setStatusMsg("");
    setPendingConflict(null);
  }, []);

  // ── Execute the actual state / localStorage changes for a validated DailyImportJSON
  const executeImport = useCallback(
    (data: DailyImportJSON): boolean => {
      const imported = loadImported();
      const alreadyImported = imported.has(data.date);
      const levelAtImport = gs.level;

      let levelForLog = levelAtImport;
      if (!alreadyImported) {
        const importResult = actions.importSessionData({ ...data.progress, date: data.date });
        levelForLog = importResult.levelAfter;
      }

      actions.setImportedDailyCompleted(data.progress.dailyTalkCompleted);

      const rl = data.reviewLog;
      if (rl) {
        const taskType = normalizeTaskType(rl.talkType ?? "");
        upsertByDate(data.date, {
          date: new Date(data.date + "T00:00:00Z").toISOString(),
          level: levelForLog,
          taskType,
          messages: rl.messages,
          levelOutfit: rl.levelOutfit,
          maryAvatarVariant: rl.maryAvatarVariant,
          rallies: rl.messages ? undefined : rl.rallies,
          conversation:
            rl.messages || rl.rallies
              ? undefined
              : (rl.conversation as ConversationItem[] | undefined),
          rewards: rl.rewards,
          dailyCompleted: data.progress.dailyTalkCompleted,
        });
      }

      imported.add(data.date);
      saveImported(imported);

      return alreadyImported;
    },
    [gs.level, actions, upsertByDate]
  );

  // ── Core import logic — accepts text strings directly.
  // Used by both the file-upload path and the text-paste path.
  const importTexts = useCallback(
    (text1: string, text2: string) => {
      // 1. Text 1 required
      if (!text1.trim()) {
        setStatus("error");
        setStatusMsg("JSON File 1 is required.");
        return;
      }

      // 2. Parse JSON 1
      let parsed1: unknown;
      try {
        parsed1 = JSON.parse(text1);
      } catch {
        setStatus("error");
        setStatusMsg("JSON could not be parsed. Please check the file.");
        return;
      }

      // 3a. Full Progress Restore mode — bypass normal session import entirely
      if (
        parsed1 &&
        typeof parsed1 === "object" &&
        (parsed1 as Record<string, unknown>).restoreMode === "full_progress_restore"
      ) {
        const restoreResult = parseRestoreJSON(parsed1);
        if (!restoreResult.ok) {
          setStatus("error");
          setStatusMsg(restoreResult.error);
          return;
        }
        actions.restoreFullProgress(restoreResult.data);
        setStatus("success");
        setStatusMsg("Progress restored. No popups. Review Log is unchanged.");
        return;
      }

      // 3b. Review Log Recovery mode — restore conversation history only, no game state changes
      if (isReviewLogRecovery(parsed1)) {
        const r = parseReviewLogRecovery(parsed1);
        if (!r.ok) {
          setStatus("error");
          setStatusMsg(r.error);
          return;
        }
        const data = r.data;
        const dateKey = data.date;

        const newEntry: Omit<ReviewLogEntry, "id"> = {
          date: new Date(dateKey + "T00:00:00Z").toISOString(),
          level: data.level,
          taskType: normalizeTaskType(data.conversationType),
          messages: data.messages,
          part: data.part,
          levelOutfit: data.levelOutfit,
          maryAvatarVariant: data.maryAvatarVariant,
        };

        // Duplicate check: same date + level + part
        const conflict = entries.find(
          (e) =>
            e.date.startsWith(dateKey) &&
            e.level === data.level &&
            (e.part ?? 1) === data.part
        );

        if (conflict) {
          const existingParts = entries
            .filter((e) => e.date.startsWith(dateKey) && e.level === data.level)
            .map((e) => e.part ?? 1);
          const nextPartIfAppend =
            existingParts.length > 0 ? Math.max(...existingParts) + 1 : 2;
          setPendingConflict({ newEntry, existingEntry: conflict, nextPartIfAppend });
          setStatus("duplicate");
          setStatusMsg(
            `A Review Log already exists for ${dateKey} · Part ${data.part} · Level ${data.level}. Choose an action below.`
          );
          return;
        }

        // No conflict — insert directly
        insertWithMode(newEntry, "overwrite");
        setStatus("success");
        setStatusMsg(`Review Log imported: ${dateKey} · Part ${data.part}.`);
        return;
      }

      // 3c. Normal session — validate
      const v1 = validate(parsed1);
      if (!v1.ok) {
        setStatus("error");
        setStatusMsg(v1.error);
        return;
      }

      let finalData: DailyImportJSON;

      if (text2.trim()) {
        // ── Two-JSON mode ────────────────────────────────────────────────────

        let parsed2: unknown;
        try {
          parsed2 = JSON.parse(text2);
        } catch {
          setStatus("error");
          setStatusMsg("JSON could not be parsed. Please check the file.");
          return;
        }

        const v2 = validate(parsed2);
        if (!v2.ok) {
          setStatus("error");
          setStatusMsg(v2.error);
          return;
        }

        let data1 = v1.data;
        let data2 = v2.data;

        if (data1.date !== data2.date) {
          setStatus("error");
          setStatusMsg("JSON File 1 and JSON File 2 have different dates.");
          return;
        }

        // Respect part order if part fields are present — swap if necessary
        if (
          data1.part !== undefined &&
          data2.part !== undefined &&
          data1.part > data2.part
        ) {
          [data1, data2] = [data2, data1];
        }

        const msgs1 = data1.reviewLog?.messages ?? [];
        const msgs2 = data2.reviewLog?.messages ?? [];

        // Offset part 2 IDs so they sort after part 1
        const maxId1 = msgs1.length > 0 ? Math.max(...msgs1.map((m) => m.id)) : 0;
        const offsetMsgs2 = msgs2.map((m) => ({ ...m, id: m.id + maxId1 }));
        const combinedMessages = [...msgs1, ...offsetMsgs2];

        if (combinedMessages.length === 0 && (data1.reviewLog || data2.reviewLog)) {
          setStatus("error");
          setStatusMsg("reviewLog.messages is missing.");
          return;
        }

        finalData = {
          date: data1.date,
          progress: data2.progress,
          reviewLog: data2.reviewLog
            ? {
                ...data2.reviewLog,
                messages: combinedMessages.length > 0 ? combinedMessages : undefined,
              }
            : data1.reviewLog
            ? {
                ...data1.reviewLog,
                messages: combinedMessages.length > 0 ? combinedMessages : undefined,
              }
            : undefined,
        };
      } else {
        // ── Single JSON mode ─────────────────────────────────────────────────
        finalData = v1.data;
      }

      executeImport(finalData);

      setStatus("success");
      setStatusMsg("JSON file import completed.");
    },
    [executeImport, entries, insertWithMode]
  );

  // Convenience wrapper for the text-paste path (reads from state).
  const importSession = useCallback(() => {
    importTexts(json1Text, json2Text);
    setJson1Text("");
    setJson2Text("");
  }, [json1Text, json2Text, importTexts]);

  // Resolves a pending Review Log conflict (set by the duplicate-detection branch above).
  const resolveConflict = useCallback(
    (mode: "skip" | "overwrite" | "append") => {
      if (!pendingConflict) return;
      const dateStr = pendingConflict.newEntry.date.slice(0, 10);
      const part = pendingConflict.newEntry.part ?? 1;

      if (mode !== "skip") {
        insertWithMode(pendingConflict.newEntry, mode);
      }

      setPendingConflict(null);
      setStatus("success");
      if (mode === "skip") {
        setStatusMsg("Review Log skipped. Existing entry kept.");
      } else if (mode === "overwrite") {
        setStatusMsg(`Review Log overwritten: ${dateStr} · Part ${part}.`);
      } else {
        setStatusMsg(
          `Review Log imported as Part ${pendingConflict.nextPartIfAppend}: ${dateStr}.`
        );
      }
    },
    [pendingConflict, insertWithMode]
  );

  const resetImportHistory = useCallback(() => {
    clearImported();
    setStatus("idle");
    setStatusMsg("Import history cleared.");
  }, []);

  const showError = useCallback((msg: string) => {
    setStatus("error");
    setStatusMsg(msg);
  }, []);

  return {
    json1Text,
    setJson1Text,
    json2Text,
    setJson2Text,
    importTexts,
    importSession,
    clearAll,
    showError,
    status,
    statusMsg,
    resetImportHistory,
    pendingConflict,
    resolveConflict,
  };
}
