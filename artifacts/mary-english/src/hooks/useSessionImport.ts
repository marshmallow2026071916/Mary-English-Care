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
        version: "3.1",
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
        version: "3.1",
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
        version: "3.1",
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
  const [json1Text, setJson1Text] = useState("");
  const [json2Text, setJson2Text] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const { gs, actions } = useGame();
  const { upsertByDate } = useReviewLog();

  const clearAll = useCallback(() => {
    setJson1Text("");
    setJson2Text("");
    setStatus("idle");
    setStatusMsg("");
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

  const importSession = useCallback(() => {
    // ── 1. JSON 1 required
    if (!json1Text.trim()) {
      setStatus("error");
      setStatusMsg("JSON 1 is required.");
      return;
    }

    // ── 2. Parse JSON 1
    let parsed1: unknown;
    try {
      parsed1 = JSON.parse(json1Text);
    } catch {
      setStatus("error");
      setStatusMsg("JSON could not be parsed. Please check the format.");
      return;
    }

    // ── 3. Validate JSON 1
    const v1 = validate(parsed1);
    if (!v1.ok) {
      setStatus("error");
      setStatusMsg(v1.error);
      return;
    }

    let finalData: DailyImportJSON;

    if (json2Text.trim()) {
      // ── Two-JSON mode ──────────────────────────────────────────────────────

      // Parse JSON 2
      let parsed2: unknown;
      try {
        parsed2 = JSON.parse(json2Text);
      } catch {
        setStatus("error");
        setStatusMsg("JSON could not be parsed. Please check the format.");
        return;
      }

      // Validate JSON 2
      const v2 = validate(parsed2);
      if (!v2.ok) {
        setStatus("error");
        setStatusMsg(v2.error);
        return;
      }

      let data1 = v1.data;
      let data2 = v2.data;

      // Validate same date
      if (data1.date !== data2.date) {
        setStatus("error");
        setStatusMsg("JSON 1 and JSON 2 have different dates.");
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

      // Combine messages: part 1 messages first, then part 2
      const msgs1 = data1.reviewLog?.messages ?? [];
      const msgs2 = data2.reviewLog?.messages ?? [];

      // Offset part 2 IDs so they sort after part 1 (avoids ID collisions on sort)
      const maxId1 = msgs1.length > 0 ? Math.max(...msgs1.map((m) => m.id)) : 0;
      const offsetMsgs2 = msgs2.map((m) => ({ ...m, id: m.id + maxId1 }));
      const combinedMessages = [...msgs1, ...offsetMsgs2];

      // Warn if reviewLog exists but produced no messages at all
      if (combinedMessages.length === 0 && (data1.reviewLog || data2.reviewLog)) {
        setStatus("error");
        setStatusMsg("reviewLog.messages is missing.");
        return;
      }

      // Use part 2's progress (final state) and reviewLog metadata
      finalData = {
        date: data1.date,
        progress: data2.progress,
        reviewLog: data2.reviewLog
          ? {
              ...data2.reviewLog,
              messages: combinedMessages.length > 0 ? combinedMessages : undefined,
            }
          : data1.reviewLog
          ? { ...data1.reviewLog, messages: combinedMessages.length > 0 ? combinedMessages : undefined }
          : undefined,
      };
    } else {
      // ── Single JSON mode ───────────────────────────────────────────────────
      finalData = v1.data;
    }

    // ── Execute import
    const alreadyImported = executeImport(finalData);

    setJson1Text("");
    setJson2Text("");
    setStatus("success");
    setStatusMsg(
      alreadyImported ? "Session updated successfully." : "Session imported successfully."
    );
  }, [json1Text, json2Text, executeImport]);

  const resetImportHistory = useCallback(() => {
    clearImported();
    setStatus("idle");
    setStatusMsg("Import history cleared.");
  }, []);

  return {
    json1Text,
    setJson1Text,
    json2Text,
    setJson2Text,
    importSession,
    clearAll,
    status,
    statusMsg,
    resetImportHistory,
  };
}
