import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type EmoteState = "idle" | "smile" | "cheer" | "celebration" | "shy";

export type ModalType =
  | "xp-gained"
  | "small-reward"
  | "weekly-bonus"
  | "level-up"
  | "level-outfit"
  | "emote-reward"
  | "review-progress"
  | "review-reward"
  | "outfit-popup"
  | "background-popup"
  // Legacy — kept for actions called outside the import flow:
  | "heart"
  | "seasonal"
  | "daily-talk";

// Data bundle read by popup components for the current import sequence.
// Populated by importSessionData; cleared on reset.
export interface PopupCtx {
  xpGained: number;
  xpBefore: number;
  xpAfterMod: number;          // xp mod XP_PER_LEVEL after import (0–199)
  levelBefore: number;
  levelAfter: number;
  smallRewardLabel: "Daily Talk Complete" | "Practice Complete";
  emoteReward: EmoteState;     // emote unlocked at this 5-level milestone
  reviewCountAfter: number;
  reviewMax: number;
  heartRecovered: boolean;
  seasonalUnlocked: boolean;
  newReviewRewardId: string | null; // review reward image ID just earned (e.g. "review_reward_002")
  bonusXpGained: number;       // weeklyStreak bonus XP replayed from imported Session JSON
  newOutfitEmoteKey: string | null;  // outfit-emote key to showcase in the Outfit popup (presentation only)
  newBackgroundId: string | null;    // background id to showcase in the Background popup (presentation only)
}

export interface GameState {
  level: number;
  xp: number;
  hearts: number;
  maxHearts: number;
  lastHeartChangedAt: string | null;
  streakCount: number;
  lastDailyDate: string | null;
  // Practice Tasks — per-level, max 3, reset on level-up
  practiceCount: number;
  // Review Tasks — per-level, max 3, reset on level-up
  reviewCount: number;
  // Rally counts for progress display
  lastDailyRallies: number;
  lastPracticeRallies: number;
  lastReviewRallies: number;
  // Wardrobe
  unlockedOutfits: string[];
  equippedOutfit: string;
  // Set directly from progress.dailyTalkCompleted on every import
  importedDailyCompleted: boolean;
  // Kept for backward-compat with older stored states; no longer drives dailyTalkDone
  lastImportDate: string | null;
  // Legacy fields kept for localStorage backwards-compat; no longer drive logic
  weeklyReadingCount: number;
  weeklyReadingMondayStr: string | null;
  lastReadingDate: string | null;
  // ─── Wardrobe ───────────────────────────────────────────────────────────────
  selectedOutfit: string;               // e.g. "outfit_000"
  selectedEmote: string;                // "idle" | "shy" | "smile" | "wave" | "cheer"
  selectedReviewReward: string | null;  // e.g. "review_reward_001" or null
  selectedBackground: string;           // e.g. "background_001"
  unlockedOutfitEmotes: string[];       // e.g. ["outfit_000_idle", "outfit_001_shy"]
  unlockedBackgrounds: string[];        // e.g. ["background_001"]
  unlockedReviewRewards: string[];      // e.g. ["review_reward_001"]
}

export interface SessionImportData {
  date: string;
  dailyTalkCompleted: boolean;
  practiceTalkCompleted: boolean;
  reviewChallengeCompleted: boolean;
  dailyXp: number;
  practiceXp: number;
  reviewXp: number;
  bonusXp: number;
  totalXp: number;
  weeklyStreak?: number;
  // Legacy singular spelling; "hearts" (below) is the preferred field name going
  // forward. When both are present, "hearts" wins.
  heart?: number;
  level?: number;
  notes?: string[];
  // v3.2: date of last Heart change, as YYYY-MM-DD. Optional for backward compat with v3.1.
  lastHeartChanged?: string;

  // ─── v3.3: Current State fields (source of truth — restored directly, never
  // inferred from hearts/level/review events). See reconstructOutfitsForLevel /
  // reconstructBackgroundsForLevel / reconstructReviewRewardsForCount below. ───
  hearts?: number;                    // current heart count (0..MAX_HEARTS) — preferred over "heart"
  outfitUnlockedLevel?: number;       // highest outfit/emote unlock level reached
  backgroundUnlockedLevel?: number;   // highest background unlock level reached (multiple of 5)
  reviewRewardUnlockedCount?: number; // review rewards earned AFTER the default review_reward_001
  // Exact current task-progress snapshot for the level, restored verbatim — never
  // recalculated or incremented from practiceTalkCompleted/reviewChallengeCompleted.
  // "Remaining" counterparts are accepted for authoring convenience but are not
  // stored separately; MAX_PRACTICE/MAX_REVIEW are fixed, so remaining = MAX - completed.
  practiceTasksCompleted?: number;
  practiceTasksRemaining?: number;
  reviewTasksCompleted?: number;
  reviewTasksRemaining?: number;

  // ─── v3.3: Popup / Presentation flags — presentation ONLY. Showing a popup
  // must never modify XP/level/hearts/counts/unlocks/selections. ───
  showOutfitPopup?: boolean;
  showBackgroundPopup?: boolean;
  showReviewRewardPopup?: boolean;
  showHeartPopup?: boolean;
}

export interface ImportResult {
  // Task completion flags
  dailyNewlyCompleted: boolean;
  practiceNewlyCompleted: boolean;
  reviewNewlyCompleted: boolean;
  leveledUp: boolean;
  // Enriched popup data
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  levelOutfitNewlyUnlocked: boolean; // level-up AND outfit wasn't already in wardrobe (informational only — see note at queue build)
  emoteRewardUnlocked: boolean;      // level-up AND new level % 5 === 0
  reviewCountAfter: number;
  reviewJustCompleted: boolean;      // reviewCount just reached MAX_REVIEW
  heartRecovered: boolean;           // review completed + hearts below max
  seasonalOutfitUnlocked: boolean;   // review completed + hearts already full
  newReviewRewardId: string | null;  // review reward image ID just unlocked (non-seasonal case)
}

// ─── Full Progress Restore ────────────────────────────────────────────────────
// Sent to restoreFullProgress() when the JSON contains restoreMode: "full_progress_restore".
// All fields except date and restoreMode are optional; missing values fall back to defaults
// or are reconstructed from the restored level.
//
// restoreMode spec (three official values, see useSessionImport.ts):
//   "session"                  → normal Session JSON, may trigger popups
//   "full_progress_restore"    → Game Restore JSON (this type), never triggers popups
//   "legacy_reviewlog_restore" → ReviewLog Restore JSON, never touches progress
// A Session JSON mistagged with "full_progress_restore" is NOT treated as a Game
// Restore — shape detection in useSessionImport.ts takes priority over this flag.
export interface FullProgressRestoreData {
  date: string;                         // YYYY-MM-DD (used as lastImportDate / lastDailyDate)
  // Kept optional for backward compat; superseded by jsonType: "game" going forward.
  restoreMode?: "full_progress_restore";
  level?: number;
  xpInCurrentLevel?: number;            // XP within the current level (preferred)
  totalXp?: number;                     // fallback: totalXp - level*200
  weeklyStreak?: number;
  heart?: number;                       // current hearts (both spellings accepted)
  hearts?: number;
  maxHeart?: number;                    // max hearts (both spellings accepted)
  maxHearts?: number;
  lastHeartChanged?: string;            // YYYY-MM-DD
  dailyTalkCompleted?: boolean;
  practiceTasksCompleted?: number;
  reviewTasksCompleted?: number;
  reviewRewardEarned?: boolean;         // true → add "seasonal" outfit if absent
  currentOutfit?: string;              // maps to equippedOutfit
  // Optional explicit collections — if absent, reconstructed from level
  unlockedOutfits?: string[];
  unlockedEmotes?: string[];            // maps to unlockedOutfitEmotes
  unlockedBackgrounds?: string[];
  unlockedReviewRewards?: string[];
}

interface GameContextValue {
  gs: GameState;
  dailyTalkDone: boolean;
  xpPercent: number;
  emote: EmoteState;
  activeModal: ModalType | null;
  isLastModal: boolean;
  popupCtx: PopupCtx;
  closeModal: () => void;
  isUnlocked: (id: string) => boolean;
  actions: {
    addXP: (n: number) => void;
    completeDailyTalk: () => void;
    completePracticeTalk: () => void;
    completeReviewTalk: () => void;
    addHeart: () => void;
    removeHeart: () => void;
    resetData: () => void;
    equipOutfit: (id: string) => void;
    unlockOutfit: (id: string) => void;
    unlockSeasonalOutfit: () => void;
    resetWardrobe: () => void;
    triggerSmallReward: () => void;
    triggerLevelUpReward: () => void;
    triggerHeartReward: () => void;
    unlockLevelRewardOutfit: () => void;
    setImportedDailyCompleted: (val: boolean) => void;
    importSessionData: (data: SessionImportData) => ImportResult;
    restoreFullProgress: (data: FullProgressRestoreData) => void;
    selectOutfit: (id: string) => void;
    selectEmote: (emote: string) => void;
    selectReviewReward: (rewardId: string | null) => void;
    selectBackground: (bgId: string) => void;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "mary-english-state";
const MAX_HEARTS = 2;
const XP_PER_LEVEL = 200;
const EMOTE_RESET_MS = 3000;
const MAX_PRACTICE = 3;
const MAX_REVIEW = 3;
const DAILY_RALLY_TARGET = 10;
const TASK_RALLY_TARGET = 3;

const DEFAULT_STATE: GameState = {
  level: 0,
  xp: 0,
  hearts: 1,
  maxHearts: MAX_HEARTS,
  lastHeartChangedAt: null,
  streakCount: 0,
  lastDailyDate: null,
  practiceCount: 0,
  reviewCount: 0,
  lastDailyRallies: 0,
  lastPracticeRallies: 0,
  lastReviewRallies: 0,
  unlockedOutfits: ["black", "outfit_000"],
  equippedOutfit: "black",
  importedDailyCompleted: false,
  lastImportDate: null,
  weeklyReadingCount: 0,
  weeklyReadingMondayStr: null,
  lastReadingDate: null,
  selectedOutfit: "outfit_000",
  selectedEmote: "idle",
  selectedReviewReward: null,
  selectedBackground: "background_001",
  unlockedOutfitEmotes: ["outfit_000_idle", "outfit_000_shy", "outfit_000_smile", "outfit_000_wave", "outfit_000_cheer"],
  // background_002 unlocked from the start for Level 0 testing
  unlockedBackgrounds: ["background_001", "background_002"],
  // review_reward_001 unlocked from the start for Level 0 testing
  unlockedReviewRewards: ["review_reward_001"],
};

const DEFAULT_POPUP_CTX: PopupCtx = {
  xpGained: 0,
  xpBefore: 0,
  xpAfterMod: 0,
  levelBefore: 0,
  levelAfter: 0,
  smallRewardLabel: "Daily Talk Complete",
  emoteReward: "smile",
  reviewCountAfter: 0,
  reviewMax: MAX_REVIEW,
  heartRecovered: false,
  seasonalUnlocked: false,
  newReviewRewardId: null,
  bonusXpGained: 0,
  newOutfitEmoteKey: null,
  newBackgroundId: null,
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}
function getDayBefore(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

// Sets hearts to newHearts (clamped to 0–MAX_HEARTS) and records the timestamp.
function setHeartCount(state: GameState, newHearts: number): GameState {
  const clamped = Math.max(0, Math.min(MAX_HEARTS, newHearts));
  return { ...state, hearts: clamped, lastHeartChangedAt: new Date().toISOString() };
}

// Applies the 14-day inactivity decay rule on app load (called synchronously in loadState).
// Each 14-day period without a heart change decreases hearts by 1, min 0.
// If lastHeartChangedAt is absent (first load with new field), initialises it to now with no decay.
function applyInactivityDecay(state: GameState): GameState {
  if (state.hearts === 0) return state;
  const now = new Date();
  if (!state.lastHeartChangedAt) {
    return { ...state, lastHeartChangedAt: now.toISOString() };
  }
  const diffMs = now.getTime() - new Date(state.lastHeartChangedAt).getTime();
  const steps = Math.floor(diffMs / FOURTEEN_DAYS_MS);
  if (steps <= 0) return state;
  return { ...state, hearts: Math.max(0, state.hearts - steps), lastHeartChangedAt: now.toISOString() };
}

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const loaded: GameState = { ...DEFAULT_STATE, ...JSON.parse(raw) };

    // Always ensure the Level-0 test assets are present, even for users whose
    // stored state pre-dates their addition to DEFAULT_STATE. Using Set merges
    // so we never create duplicates.
    const bgSet = new Set(loaded.unlockedBackgrounds);
    DEFAULT_STATE.unlockedBackgrounds.forEach((id) => bgSet.add(id));

    const rwSet = new Set(loaded.unlockedReviewRewards);
    DEFAULT_STATE.unlockedReviewRewards.forEach((id) => rwSet.add(id));

    const patched: GameState = {
      ...loaded,
      unlockedBackgrounds: [...bgSet],
      unlockedReviewRewards: [...rwSet],
    };

    const decayed = applyInactivityDecay(patched);
    // Persist so next load doesn't need patching
    persist(decayed !== patched ? decayed : patched);
    return decayed !== patched ? decayed : patched;
  } catch {
    return { ...DEFAULT_STATE };
  }
}
function persist(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
// ─── Wardrobe level-unlock helpers ────────────────────────────────────────────

const EMOTE_ORDER = ["idle", "shy", "smile", "wave", "cheer"] as const;

// Returns the outfit-emote key and background id unlocked at a given level.
// Level 0 → nothing (all of outfit_000 is in DEFAULT_STATE).
// Levels 1-5 → outfit_001 emotes one by one; level 5 also unlocks background_002.
function getWardrobeRewardsForLevel(level: number): { outfitEmoteKey?: string; backgroundId?: string } {
  if (level === 0) return {};
  const outfitNum = Math.ceil(level / 5);
  const emoteIndex = (level - 1) % 5;
  const outfitId = `outfit_${String(outfitNum).padStart(3, "0")}`;
  const emote = EMOTE_ORDER[emoteIndex];
  const result: { outfitEmoteKey?: string; backgroundId?: string } = {
    outfitEmoteKey: `${outfitId}_${emote}`,
  };
  if (level % 5 === 0) {
    // background_001 and background_002 are unlocked from the start (Level 0).
    // Level 5 → background_003, level 10 → background_004, etc.
    const bgNum = Math.floor(level / 5) + 2;
    result.backgroundId = `background_${String(bgNum).padStart(3, "0")}`;
  }
  return result;
}

// Applies wardrobe unlocks for a single newly-reached level.
// Unlocks the outfit-emote combo, auto-displays it, and auto-applies any new background.
function applyWardrobeUnlocksForLevel(state: GameState, level: number): GameState {
  const { outfitEmoteKey, backgroundId } = getWardrobeRewardsForLevel(level);
  let next = state;

  if (outfitEmoteKey && !next.unlockedOutfitEmotes.includes(outfitEmoteKey)) {
    const parts = outfitEmoteKey.split("_"); // ["outfit", "001", "shy"]
    const emote = parts[parts.length - 1];   // "shy"
    const outfitId = parts.slice(0, -1).join("_"); // "outfit_001"
    next = {
      ...next,
      unlockedOutfitEmotes: [...next.unlockedOutfitEmotes, outfitEmoteKey],
      selectedOutfit: outfitId,
      selectedEmote: emote,
      selectedReviewReward: null,
    };
    if (!next.unlockedOutfits.includes(outfitId)) {
      next = { ...next, unlockedOutfits: [...next.unlockedOutfits, outfitId] };
    }
  }

  if (backgroundId && !next.unlockedBackgrounds.includes(backgroundId)) {
    next = {
      ...next,
      unlockedBackgrounds: [...next.unlockedBackgrounds, backgroundId],
      selectedBackground: backgroundId,
    };
  }

  return next;
}

// ─── Unlock-state reconstruction (Current State, source of truth) ────────────
// These fully rebuild the unlocked collections from an explicit snapshot value
// (outfitUnlockedLevel / backgroundUnlockedLevel / reviewRewardUnlockedCount).
// They never infer unlocks from hearts, level diffs, or review completions —
// the imported JSON value is the only input. Reuses getWardrobeRewardsForLevel
// so the outfit/emote/background pattern itself never changes, only how the
// resulting set is restored (reconstruction vs incremental per-level diffing).

// Level 0 already unlocks all five outfit_000 emotes (see DEFAULT_STATE).
function reconstructOutfitsForLevel(outfitUnlockedLevel: number): {
  outfitIds: string[];
  emoteKeys: string[];
} {
  const outfitIds = new Set<string>(["outfit_000"]);
  const emoteKeys = new Set<string>(EMOTE_ORDER.map((e) => `outfit_000_${e}`));
  const clamped = Math.max(0, outfitUnlockedLevel);
  for (let lvl = 1; lvl <= clamped; lvl++) {
    const { outfitEmoteKey } = getWardrobeRewardsForLevel(lvl);
    if (!outfitEmoteKey) continue;
    emoteKeys.add(outfitEmoteKey);
    const parts = outfitEmoteKey.split("_");
    outfitIds.add(parts.slice(0, -1).join("_"));
  }
  return { outfitIds: [...outfitIds], emoteKeys: [...emoteKeys] };
}

// background_001 and background_002 are unlocked from the start (Level 0).
// Every 5 levels thereafter unlocks the next background in sequence.
function reconstructBackgroundsForLevel(backgroundUnlockedLevel: number): string[] {
  const backgrounds = new Set<string>(["background_001", "background_002"]);
  const clamped = Math.max(0, backgroundUnlockedLevel);
  const steps = Math.floor(clamped / 5);
  for (let i = 1; i <= steps; i++) {
    backgrounds.add(`background_${String(i + 2).padStart(3, "0")}`);
  }
  return [...backgrounds];
}

// review_reward_001 is unlocked by default (count 0). Each additional count
// unlocks the next sequential reward id.
function reconstructReviewRewardsForCount(reviewRewardUnlockedCount: number): string[] {
  const clamped = Math.max(0, reviewRewardUnlockedCount);
  const rewards = ["review_reward_001"];
  for (let i = 1; i <= clamped; i++) {
    rewards.push(`review_reward_${String(i + 1).padStart(3, "0")}`);
  }
  return rewards;
}

// Returns the background id newly reached at a given backgroundUnlockedLevel
// snapshot value, for popup display only (null at level 0 — nothing "new").
function getBackgroundIdForLevel(backgroundUnlockedLevel: number): string | null {
  if (backgroundUnlockedLevel <= 0) return null;
  const bgNum = Math.floor(backgroundUnlockedLevel / 5) + 2;
  return `background_${String(bgNum).padStart(3, "0")}`;
}

// Applies XP and auto-resets practiceCount/reviewCount on level-up.
// Also applies wardrobe unlocks for every new level gained.
function applyXP(state: GameState, amount: number): GameState {
  if (amount <= 0) return state;
  let xp = state.xp + amount;
  const prevLevel = state.level;
  let level = prevLevel;
  while (xp >= XP_PER_LEVEL) {
    xp -= XP_PER_LEVEL;
    level++;
  }
  let next: GameState = { ...state, xp, level };
  if (level > prevLevel) {
    next = { ...next, practiceCount: 0, reviewCount: 0 };
    for (let lvl = prevLevel + 1; lvl <= level; lvl++) {
      next = applyWardrobeUnlocksForLevel(next, lvl);
    }
  }
  return next;
}

function addOutfit(state: GameState, id: string): GameState {
  if (state.unlockedOutfits.includes(id)) return state;
  return { ...state, unlockedOutfits: [...state.unlockedOutfits, id] };
}

// Maps a 5-level milestone to the emote reward shown at that level.
// Cycles through non-idle emotes so every milestone feels fresh.
const LEVEL_EMOTES: EmoteState[] = ["smile", "cheer", "celebration", "shy"];
function getEmoteReward(level: number): EmoteState {
  const raw = Math.floor(level / 5) - 1;
  const idx = ((raw % LEVEL_EMOTES.length) + LEVEL_EMOTES.length) % LEVEL_EMOTES.length;
  return LEVEL_EMOTES[idx];
}

// ─── Context ──────────────────────────────────────────────────────────────────
const GameContext = createContext<GameContextValue | null>(null);

// ─── Dedicated daily-completed persistence (separate from GameState) ──────────
// Written by importSession regardless of alreadyImported, read here directly.
// Using a separate key avoids any React batch-update ordering issues.
const DAILY_STATUS_KEY = "mary-english-daily-status";
function loadDailyStatus(): boolean {
  return localStorage.getItem(DAILY_STATUS_KEY) === "true";
}
function saveDailyStatus(val: boolean) {
  localStorage.setItem(DAILY_STATUS_KEY, val ? "true" : "false");
}
function clearDailyStatus() {
  localStorage.removeItem(DAILY_STATUS_KEY);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [gs, setGsRaw] = useState<GameState>(() => loadState());
  const gsRef = useRef<GameState>(gs);
  const [emote, setEmoteRaw] = useState<EmoteState>("idle");
  const [modalQueue, setModalQueue] = useState<ModalType[]>([]);
  const [popupCtx, setPopupCtx] = useState<PopupCtx>(() => ({ ...DEFAULT_POPUP_CTX }));
  // Separate state for imported daily completion — avoids gsRef/update ordering issues.
  const [importedDailyCompleted, setImportedDailyCompletedState] = useState<boolean>(
    () => loadDailyStatus()
  );

  const activeModal: ModalType | null = modalQueue[0] ?? null;
  const isLastModal = modalQueue.length <= 1;
  const emoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  gsRef.current = gs;

  // ─ Core updater ─────────────────────────────────────────────────────────────
  const update = useCallback((next: GameState) => {
    gsRef.current = next;
    persist(next);
    setGsRaw(next);
  }, []);

  // ─ Emote helper ─────────────────────────────────────────────────────────────
  const setEmote = useCallback((e: EmoteState, autoReset = true) => {
    setEmoteRaw(e);
    if (autoReset && e !== "idle") {
      if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
      emoteTimerRef.current = setTimeout(() => setEmoteRaw("idle"), EMOTE_RESET_MS);
    }
  }, []);

  // ─ Modal queue helpers ───────────────────────────────────────────────────────
  const showModal = useCallback((type: ModalType) => {
    setModalQueue((prev) => [...prev, type]);
  }, []);

  const closeModal = useCallback(() => {
    setModalQueue((prev) => {
      const next = prev.slice(1);
      if (next.length === 0) setEmoteRaw("idle");
      return next;
    });
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const addXP = useCallback((amount: number) => {
    const prev = gsRef.current;
    const next = applyXP(prev, amount);
    if (next.level > prev.level) {
      const withOutfit = addOutfit(next, "level");
      update(withOutfit);
      setEmote("celebration", false);
      showModal("level-up");
    } else {
      update(next);
    }
  }, [update, setEmote, showModal]);

  const completeDailyTalk = useCallback(() => {
    const prev = gsRef.current;
    const today = toDateStr(new Date());
    if (prev.lastDailyDate === today) return;

    let next = applyXP(prev, 10);
    const dayBefore = getDayBefore(today);

    if (prev.hearts > 0) {
      const newStreak = prev.lastDailyDate === dayBefore ? prev.streakCount + 1 : 1;
      next = { ...next, lastDailyDate: today, streakCount: newStreak };
      if (newStreak >= 7) {
        next = applyXP(next, 100);
        next = { ...next, streakCount: 0 };
      }
    } else {
      // hearts = 0: streak counter stays at 0, no bonus
      next = { ...next, lastDailyDate: today, streakCount: 0 };
    }

    if (next.level > prev.level) {
      next = addOutfit(next, "level");
      update(next);
      setEmote("celebration", false);
      showModal("daily-talk");
      showModal("level-up");
    } else {
      update(next);
      setEmote("cheer");
      showModal("daily-talk");
    }
  }, [update, setEmote, showModal]);

  const completePracticeTalk = useCallback(() => {
    const prev = gsRef.current;
    if (prev.practiceCount >= MAX_PRACTICE) return;

    const next = applyXP(
      { ...prev, practiceCount: prev.practiceCount + 1 },
      10
    );

    if (next.level > prev.level) {
      const withOutfit = addOutfit(next, "level");
      update(withOutfit);
      setEmote("celebration", false);
      showModal("level-up");
    } else {
      update(next);
    }
  }, [update, setEmote, showModal]);

  const completeReviewTalk = useCallback(() => {
    const prev = gsRef.current;
    if (prev.reviewCount >= MAX_REVIEW) return;

    const next = applyXP(
      { ...prev, reviewCount: prev.reviewCount + 1 },
      10
    );

    if (next.level > prev.level) {
      const withOutfit = addOutfit(next, "level");
      update(withOutfit);
      setEmote("celebration", false);
      showModal("level-up");
    } else {
      update(next);
    }
  }, [update, setEmote, showModal]);

  const addHeart = useCallback(() => {
    const prev = gsRef.current;
    if (prev.hearts >= MAX_HEARTS) return;
    update(setHeartCount(prev, prev.hearts + 1));
    setEmote("smile");
    showModal("heart");
  }, [update, setEmote, showModal]);

  const removeHeart = useCallback(() => {
    const prev = gsRef.current;
    if (prev.hearts <= 0) return;
    update(setHeartCount(prev, prev.hearts - 1));
  }, [update]);

  const resetData = useCallback(() => {
    update({ ...DEFAULT_STATE });
    clearDailyStatus();
    setImportedDailyCompletedState(false);
    setEmoteRaw("idle");
    setModalQueue([]);
    setPopupCtx({ ...DEFAULT_POPUP_CTX });
  }, [update]);

  const equipOutfit = useCallback((id: string) => {
    const prev = gsRef.current;
    if (!prev.unlockedOutfits.includes(id)) return;
    update({ ...prev, equippedOutfit: id });
    setEmote("smile");
  }, [update, setEmote]);

  const unlockOutfit = useCallback((id: string) => {
    update(addOutfit(gsRef.current, id));
  }, [update]);

  const unlockSeasonalOutfit = useCallback(() => {
    const prev = gsRef.current;
    let next = addOutfit(prev, "seasonal");
    if (!next.unlockedReviewRewards.includes("review_reward_001")) {
      next = { ...next, unlockedReviewRewards: [...next.unlockedReviewRewards, "review_reward_001"] };
    }
    update(next);
    setEmote("celebration", false);
    showModal("seasonal");
  }, [update, setEmote, showModal]);

  const resetWardrobe = useCallback(() => {
    const prev = gsRef.current;
    update({
      ...prev,
      unlockedOutfits: ["black", "outfit_000"],
      equippedOutfit: "black",
      selectedOutfit: "outfit_000",
      selectedEmote: "idle",
      selectedReviewReward: null,
      selectedBackground: "background_001",
      unlockedOutfitEmotes: ["outfit_000_idle", "outfit_000_shy", "outfit_000_smile", "outfit_000_wave", "outfit_000_cheer"],
      unlockedBackgrounds: ["background_001"],
      unlockedReviewRewards: [],
    });
  }, [update]);

  const triggerSmallReward = useCallback(() => {
    setEmote("smile");
    showModal("small-reward");
  }, [setEmote, showModal]);

  const triggerLevelUpReward = useCallback(() => {
    update(addOutfit(gsRef.current, "level"));
    setEmote("celebration", false);
    showModal("level-up");
  }, [update, setEmote, showModal]);

  const triggerHeartReward = useCallback(() => {
    setEmote("smile");
    showModal("heart");
  }, [setEmote, showModal]);

  const unlockLevelRewardOutfit = useCallback(() => {
    update(addOutfit(gsRef.current, "level"));
  }, [update]);

  // ─ Wardrobe selection actions ────────────────────────────────────────────────
  const selectOutfit = useCallback((outfitId: string) => {
    const prev = gsRef.current;
    if (!prev.unlockedOutfitEmotes.some((k) => k.startsWith(outfitId + "_"))) return;
    update({ ...prev, selectedOutfit: outfitId, selectedEmote: "idle", selectedReviewReward: null });
  }, [update]);

  const selectEmote = useCallback((emote: string) => {
    const prev = gsRef.current;
    // Availability is determined by the unlock state for the currently selected
    // outfit in the wardrobe (selectedOutfit) — never by equippedOutfit.
    const key = `${prev.selectedOutfit}_${emote}`;
    if (!prev.unlockedOutfitEmotes.includes(key)) return;
    update({ ...prev, selectedEmote: emote, selectedReviewReward: null });
  }, [update]);

  const selectReviewReward = useCallback((rewardId: string | null) => {
    const prev = gsRef.current;
    if (rewardId !== null && !prev.unlockedReviewRewards.includes(rewardId)) return;
    update({ ...prev, selectedReviewReward: rewardId });
  }, [update]);

  const selectBackground = useCallback((bgId: string) => {
    const prev = gsRef.current;
    if (!prev.unlockedBackgrounds.includes(bgId)) return;
    update({ ...prev, selectedBackground: bgId });
  }, [update]);

  // ─ restoreFullProgress ───────────────────────────────────────────────────────
  // Silently overwrites game state from a recovery JSON.
  // NO modals, NO emotes, NO animations. Wardrobe collections are reconstructed
  // from the restored level when absent from the JSON.
  const restoreFullProgress = useCallback((data: FullProgressRestoreData) => {
    const level = Math.max(0, data.level ?? 0);

    // XP within current level
    let xp: number;
    if (data.xpInCurrentLevel !== undefined) {
      xp = data.xpInCurrentLevel;
    } else if (data.totalXp !== undefined) {
      xp = data.totalXp - level * XP_PER_LEVEL;
    } else {
      xp = 0;
    }
    xp = Math.max(0, Math.min(XP_PER_LEVEL - 1, xp));

    const maxHearts = data.maxHearts ?? data.maxHeart ?? MAX_HEARTS;
    const hearts = Math.max(0, Math.min(maxHearts, data.hearts ?? data.heart ?? 1));
    const streakCount = Math.max(0, data.weeklyStreak ?? 0);
    const practiceCount = Math.min(data.practiceTasksCompleted ?? 0, MAX_PRACTICE);
    const reviewCount = Math.min(data.reviewTasksCompleted ?? 0, MAX_REVIEW);

    // Heart timestamp — use provided date or fall back to now
    let lastHeartChangedAt: string;
    if (data.lastHeartChanged && /^\d{4}-\d{2}-\d{2}$/.test(data.lastHeartChanged)) {
      lastHeartChangedAt = new Date(data.lastHeartChanged + "T00:00:00Z").toISOString();
    } else {
      lastHeartChangedAt = new Date().toISOString();
    }

    // Build wardrobe by replaying level-up unlocks from the restored level.
    // This is the source-of-truth when the JSON omits explicit collections.
    let wardrobeBase: GameState = { ...DEFAULT_STATE };
    for (let lvl = 1; lvl <= level; lvl++) {
      wardrobeBase = applyWardrobeUnlocksForLevel(wardrobeBase, lvl);
    }

    let unlockedOutfits = data.unlockedOutfits ?? wardrobeBase.unlockedOutfits;
    const unlockedOutfitEmotes = data.unlockedEmotes ?? wardrobeBase.unlockedOutfitEmotes;
    const unlockedBackgrounds = data.unlockedBackgrounds ?? wardrobeBase.unlockedBackgrounds;
    const unlockedReviewRewards = data.unlockedReviewRewards ?? wardrobeBase.unlockedReviewRewards;

    // Honor reviewRewardEarned → seasonal outfit
    if (data.reviewRewardEarned && !unlockedOutfits.includes("seasonal")) {
      unlockedOutfits = [...unlockedOutfits, "seasonal"];
    }

    const equippedOutfit = data.currentOutfit ?? wardrobeBase.equippedOutfit;
    const dailyTalkCompleted = data.dailyTalkCompleted ?? false;

    const restored: GameState = {
      ...DEFAULT_STATE,
      level,
      xp,
      hearts,
      maxHearts,
      lastHeartChangedAt,
      streakCount,
      lastDailyDate: dailyTalkCompleted ? data.date : null,
      practiceCount,
      reviewCount,
      lastDailyRallies: 0,
      lastPracticeRallies: 0,
      lastReviewRallies: 0,
      equippedOutfit,
      importedDailyCompleted: dailyTalkCompleted,
      lastImportDate: data.date,
      unlockedOutfits,
      unlockedOutfitEmotes,
      unlockedBackgrounds,
      unlockedReviewRewards,
      selectedOutfit: wardrobeBase.selectedOutfit,
      selectedEmote: wardrobeBase.selectedEmote,
      selectedReviewReward: null,
      selectedBackground: wardrobeBase.selectedBackground,
    };

    // Persist and update React state — fully silent (no modals, no emote)
    update(restored);
    saveDailyStatus(dailyTalkCompleted);
    setImportedDailyCompletedState(dailyTalkCompleted);
  }, [update]);

  // Write directly to its own localStorage key AND update the separate useState.
  // This bypasses gsRef/update entirely, eliminating any React batch-ordering risk.
  const setImportedDailyCompleted = useCallback((val: boolean) => {
    saveDailyStatus(val);
    setImportedDailyCompletedState(val);
  }, []);

  // ─ importSessionData ────────────────────────────────────────────────────────
  // Applies all session state changes, then queues the Step 7 popup sequence.
  // XP/level/count formulas are unchanged — only adds review reward logic.
  const importSessionData = useCallback((data: SessionImportData): ImportResult => {
    const prev = gsRef.current;
    const prevLevel = prev.level;
    const importDate = data.date;

    // Session XP gained THIS session — a breakdown replayed for popups. This is
    // distinct from data.totalXp, which (like FullProgressRestoreData) is the
    // absolute cumulative snapshot value, not a delta to add.
    const sessionXpGained = data.dailyXp + data.practiceXp + data.reviewXp + data.bonusXp;

    const result: ImportResult = {
      dailyNewlyCompleted: false,
      practiceNewlyCompleted: false,
      reviewNewlyCompleted: false,
      leveledUp: false,
      xpGained: sessionXpGained,
      levelBefore: prevLevel,
      levelAfter: prevLevel,
      levelOutfitNewlyUnlocked: false,
      emoteRewardUnlocked: false,
      reviewCountAfter: prev.reviewCount,
      reviewJustCompleted: false,
      heartRecovered: false,
      seasonalOutfitUnlocked: false,
      newReviewRewardId: null,
    };

    let state = { ...prev };

    // ── 1. Restore the progress SNAPSHOT by REPLACEMENT ──────────────────────
    // level / totalXp / weeklyStreak / heart describe the resulting game state
    // after the session, not deltas to add on top of the current state — mirrors
    // restoreFullProgress's xp = totalXp - level*XP_PER_LEVEL formula. Wardrobe
    // unlocks + practice/review count resets still apply for every level actually
    // crossed, same as a normal in-app level-up.
    if (data.level !== undefined) {
      const newLevel = data.level;
      const newXp = Math.max(0, Math.min(XP_PER_LEVEL - 1, data.totalXp - newLevel * XP_PER_LEVEL));
      state = { ...state, level: newLevel, xp: newXp };
      if (newLevel > prevLevel) {
        state = { ...state, practiceCount: 0, reviewCount: 0 };
        for (let lvl = prevLevel + 1; lvl <= newLevel; lvl++) {
          state = applyWardrobeUnlocksForLevel(state, lvl);
        }
      }
    } else {
      // Backward compat only: older Session JSONs without a "level" field can't be
      // replaced, so fall back to additive XP application.
      state = applyXP(state, data.totalXp);
    }

    if (data.weeklyStreak !== undefined) {
      state = { ...state, streakCount: Math.max(0, data.weeklyStreak) };
    }

    // "hearts" is the preferred v3.3 field name; "heart" is kept for backward compat.
    const heartsValue = data.hearts !== undefined ? data.hearts : data.heart;
    if (heartsValue !== undefined) {
      state = setHeartCount(state, heartsValue);
    }

    // ── 1b. Unlock-state fields (Current State, source of truth) ─────────────
    // These fully RECONSTRUCT the unlocked collections from the imported
    // snapshot value, overriding whatever the per-level-diff loop above
    // produced. They are never inferred from hearts, level diffs, or review
    // completions — the imported JSON value is the only input.
    if (data.outfitUnlockedLevel !== undefined) {
      const { outfitIds, emoteKeys } = reconstructOutfitsForLevel(data.outfitUnlockedLevel);
      // Preserve any specially-earned outfits (e.g. "black", "level", "seasonal")
      // that fall outside the outfit_NNN level pattern this field governs.
      const nonPatternOutfits = state.unlockedOutfits.filter((id) => !/^outfit_\d{3}$/.test(id));
      state = {
        ...state,
        unlockedOutfits: [...new Set([...nonPatternOutfits, ...outfitIds])],
        unlockedOutfitEmotes: emoteKeys,
      };
    }
    if (data.backgroundUnlockedLevel !== undefined) {
      state = { ...state, unlockedBackgrounds: reconstructBackgroundsForLevel(data.backgroundUnlockedLevel) };
    }
    if (data.reviewRewardUnlockedCount !== undefined) {
      state = { ...state, unlockedReviewRewards: reconstructReviewRewardsForCount(data.reviewRewardUnlockedCount) };
    }

    // ── 1c. Practice/Review task-progress (Current State, source of truth) ───
    // When the JSON supplies an exact count, restore it VERBATIM (clamped only
    // to the valid 0..MAX range) — never recalculated or incremented from the
    // practiceTalkCompleted/reviewChallengeCompleted presentation flags below.
    const hasExplicitPracticeCount = data.practiceTasksCompleted !== undefined;
    const hasExplicitReviewCount = data.reviewTasksCompleted !== undefined;
    if (hasExplicitPracticeCount) {
      state = {
        ...state,
        practiceCount: Math.max(0, Math.min(MAX_PRACTICE, data.practiceTasksCompleted!)),
      };
    }
    if (hasExplicitReviewCount) {
      state = {
        ...state,
        reviewCount: Math.max(0, Math.min(MAX_REVIEW, data.reviewTasksCompleted!)),
      };
    }

    // ── 2. Replay session-result flags (presentation only) ───────────────────
    // These flags describe what happened during the session for popup/label
    // purposes (e.g. "Practice Talk Complete", "+10 XP") — they must NEVER
    // modify practiceCount/reviewCount when an explicit count was already
    // restored above. The increment fallback below only fires for older
    // Session JSONs that omit practiceTasksCompleted/reviewTasksCompleted.
    if (data.dailyTalkCompleted) {
      state = { ...state, lastDailyDate: importDate };
      result.dailyNewlyCompleted = data.dailyXp > 0;
    }

    if (!hasExplicitPracticeCount && data.practiceTalkCompleted && state.practiceCount < MAX_PRACTICE) {
      state = { ...state, practiceCount: state.practiceCount + 1 };
    }
    result.practiceNewlyCompleted = data.practiceTalkCompleted && data.practiceXp > 0;

    if (!hasExplicitReviewCount && data.reviewChallengeCompleted && state.reviewCount < MAX_REVIEW) {
      state = { ...state, reviewCount: state.reviewCount + 1 };
    }
    result.reviewNewlyCompleted = data.reviewChallengeCompleted && data.reviewXp > 0;

    // ── 3. Level-up popup/reward flags ────────────────────────────────────────
    // level is already the authoritative replaced value from step 1; this only
    // decides which popups/rewards to grant for the levels that were crossed.
    if (state.level > prevLevel) {
      // Silently grant the generic "level" reward outfit, same as every other
      // in-app level-up path (addXP/completeDailyTalk/completePracticeTalk/
      // completeReviewTalk) — none of them show a dedicated "New Outfit!" popup
      // for it, only the Level Up modal. Import replays the same behavior.
      state = addOutfit(state, "level");
      result.leveledUp = true;
      result.levelOutfitNewlyUnlocked = !prev.unlockedOutfits.includes("level");
      result.emoteRewardUnlocked = state.level % 5 === 0;
    }

    // ── 4. Review completion bookkeeping ──────────────────────────────────────
    // NOTE: Hearts, the seasonal outfit, and Review Reward unlocks are NEVER
    // inferred from review-task completion counts. They are restored directly
    // from the Current State fields (hearts / reviewRewardUnlockedCount) in
    // steps 1/1b above. This step only tracks that the 3rd review task of the
    // level was reached, for the (unlock-independent) "review-progress" popup.
    if (result.reviewNewlyCompleted && state.reviewCount === MAX_REVIEW) {
      result.reviewJustCompleted = true;
    }

    // Weekly Streak Bonus replay — presentation only, driven directly by bonusXp.
    const bonusAwarded = data.bonusXp > 0;

    // ── 5. Populate remaining result fields from final state ─────────────────
    result.levelAfter = state.level;
    result.reviewCountAfter = state.reviewCount;

    // ── 6. Apply final state to storage + React ───────────────────────────────
    //    Note: importedDailyCompleted is managed by the separate DAILY_STATUS_KEY
    //    mechanism (set by setImportedDailyCompleted in useSessionImport) rather
    //    than here, to avoid React batch-update ordering issues.
    state = { ...state, lastImportDate: importDate };

    // v3.2: If the JSON includes lastHeartChanged (YYYY-MM-DD), use it to set
    // lastHeartChangedAt so that the 14-day inactivity decay uses the correct
    // reference date even after a localStorage reset. Falls back silently for
    // v3.1 JSONs that omit the field.
    if (data.lastHeartChanged && /^\d{4}-\d{2}-\d{2}$/.test(data.lastHeartChanged)) {
      state = {
        ...state,
        lastHeartChangedAt: new Date(data.lastHeartChanged + "T00:00:00Z").toISOString(),
      };
    }

    update(state);

    // ── 7. Build ordered popup queue — driven by the imported session-result
    //    flags (what happened), not by diffing before/after state.
    // Popup / Presentation flags (showOutfitPopup / showBackgroundPopup /
    // showReviewRewardPopup / showHeartPopup) are presentation ONLY — they were
    // never used above to decide what to unlock, only here to decide what to show.
    const queue: ModalType[] = [];
    if (sessionXpGained > 0)                                           queue.push("xp-gained");
    if (result.dailyNewlyCompleted || result.practiceNewlyCompleted)   queue.push("small-reward");
    if (bonusAwarded)                                                  queue.push("weekly-bonus");
    if (result.leveledUp)                                              queue.push("level-up");
    // Note: the generic "level" reward outfit is granted silently (step 3 above),
    // matching every other in-app level-up path — none of them show a dedicated
    // "New Outfit!" popup for it, so import must not invent one here either.
    if (result.emoteRewardUnlocked)                                    queue.push("emote-reward");
    if (result.reviewNewlyCompleted)                                   queue.push("review-progress");
    if (data.showOutfitPopup)                                          queue.push("outfit-popup");
    if (data.showBackgroundPopup)                                      queue.push("background-popup");
    if (data.showReviewRewardPopup)                                    queue.push("review-reward");
    if (data.showHeartPopup)                                           queue.push("heart");

    // ── 8. Set popup context so each modal component can read session-specific data
    const newReviewRewardId =
      data.showReviewRewardPopup && data.reviewRewardUnlockedCount !== undefined
        ? `review_reward_${String(data.reviewRewardUnlockedCount + 1).padStart(3, "0")}`
        : null;
    const newOutfitEmoteKey =
      data.showOutfitPopup && data.outfitUnlockedLevel !== undefined
        ? getWardrobeRewardsForLevel(data.outfitUnlockedLevel).outfitEmoteKey ?? "outfit_000_idle"
        : null;
    const newBackgroundId =
      data.showBackgroundPopup && data.backgroundUnlockedLevel !== undefined
        ? getBackgroundIdForLevel(data.backgroundUnlockedLevel)
        : null;

    setPopupCtx({
      xpGained: sessionXpGained,
      xpBefore: prev.xp,
      xpAfterMod: state.xp,
      levelBefore: prevLevel,
      levelAfter: state.level,
      smallRewardLabel: result.dailyNewlyCompleted ? "Daily Talk Complete" : "Practice Complete",
      emoteReward: result.emoteRewardUnlocked ? getEmoteReward(state.level) : "smile",
      reviewCountAfter: state.reviewCount,
      reviewMax: MAX_REVIEW,
      heartRecovered: false,
      seasonalUnlocked: false,
      newReviewRewardId,
      bonusXpGained: data.bonusXp,
      newOutfitEmoteKey,
      newBackgroundId,
    });

    // ── 9. Set main avatar emote for the session
    if (result.leveledUp) {
      setEmote("celebration", false);
    } else if (result.dailyNewlyCompleted || result.practiceNewlyCompleted) {
      setEmote("cheer");
    } else if (result.reviewNewlyCompleted) {
      setEmote("smile");
    }

    // ── 10. Activate the popup queue
    setModalQueue(queue);

    return result;
  }, [update, setEmote]);

  // ─ Derived ──────────────────────────────────────────────────────────────────
  const today = toDateStr(new Date());
  // dailyTalkDone: reads from the dedicated importedDailyCompleted useState which
  // is backed by its own localStorage key (written unconditionally on every import).
  // The today fallback preserves the dev-panel "Complete Daily Talk" button.
  const dailyTalkDone = importedDailyCompleted || gs.lastDailyDate === today;
  const xpPercent = Math.min(100, (gs.xp / XP_PER_LEVEL) * 100);
  const isUnlocked = useCallback((id: string) => gs.unlockedOutfits.includes(id), [gs.unlockedOutfits]);

  const value: GameContextValue = {
    gs,
    dailyTalkDone,
    xpPercent,
    emote,
    activeModal,
    isLastModal,
    popupCtx,
    closeModal,
    isUnlocked,
    actions: {
      addXP,
      completeDailyTalk,
      completePracticeTalk,
      completeReviewTalk,
      addHeart,
      removeHeart,
      resetData,
      equipOutfit,
      unlockOutfit,
      unlockSeasonalOutfit,
      resetWardrobe,
      triggerSmallReward,
      triggerLevelUpReward,
      triggerHeartReward,
      unlockLevelRewardOutfit,
      setImportedDailyCompleted,
      importSessionData,
      restoreFullProgress,
      selectOutfit,
      selectEmote,
      selectReviewReward,
      selectBackground,
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
