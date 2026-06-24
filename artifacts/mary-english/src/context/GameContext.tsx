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
  | "level-up"
  | "level-outfit"
  | "emote-reward"
  | "review-progress"
  | "review-reward"
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
  heart?: number;
  level?: number;
  notes?: string[];
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
  levelOutfitNewlyUnlocked: boolean; // level-up AND outfit wasn't already in wardrobe
  emoteRewardUnlocked: boolean;      // level-up AND new level % 5 === 0
  reviewCountAfter: number;
  reviewJustCompleted: boolean;      // reviewCount just reached MAX_REVIEW
  heartRecovered: boolean;           // review completed + hearts below max
  seasonalOutfitUnlocked: boolean;   // review completed + hearts already full
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
  unlockedOutfits: ["black"],
  equippedOutfit: "black",
  importedDailyCompleted: false,
  lastImportDate: null,
  weeklyReadingCount: 0,
  weeklyReadingMondayStr: null,
  lastReadingDate: null,
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
    const decayed = applyInactivityDecay(loaded);
    if (decayed !== loaded) persist(decayed);
    return decayed;
  } catch {
    return { ...DEFAULT_STATE };
  }
}
function persist(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
// Applies XP and auto-resets practiceCount/reviewCount on level-up
function applyXP(state: GameState, amount: number): GameState {
  if (amount <= 0) return state;
  let xp = state.xp + amount;
  let level = state.level;
  let practiceCount = state.practiceCount;
  let reviewCount = state.reviewCount;
  while (xp >= XP_PER_LEVEL) {
    xp -= XP_PER_LEVEL;
    level++;
  }
  if (level > state.level) {
    practiceCount = 0;
    reviewCount = 0;
  }
  return { ...state, xp, level, practiceCount, reviewCount };
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
    update(addOutfit(gsRef.current, "seasonal"));
    setEmote("celebration", false);
    showModal("seasonal");
  }, [update, setEmote, showModal]);

  const resetWardrobe = useCallback(() => {
    const prev = gsRef.current;
    update({ ...prev, unlockedOutfits: ["black"], equippedOutfit: "black" });
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
    const importDate = data.date;

    const result: ImportResult = {
      dailyNewlyCompleted: false,
      practiceNewlyCompleted: false,
      reviewNewlyCompleted: false,
      leveledUp: false,
      xpGained: data.totalXp,
      levelBefore: prev.level,
      levelAfter: prev.level,
      levelOutfitNewlyUnlocked: false,
      emoteRewardUnlocked: false,
      reviewCountAfter: prev.reviewCount,
      reviewJustCompleted: false,
      heartRecovered: false,
      seasonalOutfitUnlocked: false,
    };

    let state = { ...prev };

    // 1. Add totalXp (may level-up, resetting practiceCount/reviewCount)
    state = applyXP(state, data.totalXp);

    // 2. dailyTalkCompleted
    if (data.dailyTalkCompleted && state.lastDailyDate !== importDate) {
      const dayBefore = getDayBefore(importDate);
      if (prev.hearts > 0) {
        const newStreak = state.lastDailyDate === dayBefore ? state.streakCount + 1 : 1;
        state = { ...state, lastDailyDate: importDate, streakCount: newStreak };
        if (newStreak >= 7) {
          state = applyXP(state, 100);
          state = { ...state, streakCount: 0 };
        }
      } else {
        // hearts = 0: streak counter stays at 0, no bonus
        state = { ...state, lastDailyDate: importDate, streakCount: 0 };
      }
      result.dailyNewlyCompleted = true;
    }

    // 3. practiceTalkCompleted
    if (data.practiceTalkCompleted && state.practiceCount < MAX_PRACTICE) {
      state = { ...state, practiceCount: state.practiceCount + 1 };
      result.practiceNewlyCompleted = true;
    }

    // 4. reviewChallengeCompleted
    if (data.reviewChallengeCompleted && state.reviewCount < MAX_REVIEW) {
      state = { ...state, reviewCount: state.reviewCount + 1 };
      result.reviewNewlyCompleted = true;
    }

    // 5. Level-up detection
    if (state.level > prev.level) {
      state = addOutfit(state, "level");
      result.leveledUp = true;
      result.levelOutfitNewlyUnlocked = !prev.unlockedOutfits.includes("level");
      result.emoteRewardUnlocked = state.level % 5 === 0;
    }

    // 6. Review reward: when all 3 review tasks complete, recover a heart or
    //    unlock the seasonal outfit (whichever applies first).
    //    When hearts are already full and the outfit is granted, hearts drop from 2→1.
    if (result.reviewNewlyCompleted && state.reviewCount === MAX_REVIEW) {
      result.reviewJustCompleted = true;
      if (state.hearts < MAX_HEARTS) {
        state = setHeartCount(state, state.hearts + 1);
        result.heartRecovered = true;
      } else if (!state.unlockedOutfits.includes("seasonal")) {
        state = addOutfit(state, "seasonal");
        state = setHeartCount(state, state.hearts - 1); // hearts 2→1 after outfit reward
        result.seasonalOutfitUnlocked = true;
      }
    }

    // 7. Populate remaining result fields from final state
    result.levelAfter = state.level;
    result.reviewCountAfter = state.reviewCount;

    // 8. Apply final state to storage + React
    //    Note: importedDailyCompleted is managed by the separate DAILY_STATUS_KEY
    //    mechanism (set by setImportedDailyCompleted in useSessionImport) rather
    //    than here, to avoid React batch-update ordering issues.
    state = { ...state, lastImportDate: importDate };
    update(state);

    // 9. Build ordered popup queue — skip types whose event did not occur
    const queue: ModalType[] = [];
    if (data.totalXp > 0)                                              queue.push("xp-gained");
    if (result.dailyNewlyCompleted || result.practiceNewlyCompleted)   queue.push("small-reward");
    if (result.leveledUp)                                              queue.push("level-up");
    if (result.levelOutfitNewlyUnlocked)                               queue.push("level-outfit");
    if (result.emoteRewardUnlocked)                                    queue.push("emote-reward");
    if (result.reviewNewlyCompleted)                                   queue.push("review-progress");
    if (result.reviewJustCompleted)                                    queue.push("review-reward");

    // 10. Set popup context so each modal component can read session-specific data
    setPopupCtx({
      xpGained: data.totalXp,
      xpBefore: prev.xp,
      xpAfterMod: state.xp,
      levelBefore: prev.level,
      levelAfter: state.level,
      smallRewardLabel: result.dailyNewlyCompleted ? "Daily Talk Complete" : "Practice Complete",
      emoteReward: result.emoteRewardUnlocked ? getEmoteReward(state.level) : "smile",
      reviewCountAfter: state.reviewCount,
      reviewMax: MAX_REVIEW,
      heartRecovered: result.heartRecovered,
      seasonalUnlocked: result.seasonalOutfitUnlocked,
    });

    // 11. Set main avatar emote for the session
    if (result.leveledUp) {
      setEmote("celebration", false);
    } else if (result.dailyNewlyCompleted || result.practiceNewlyCompleted) {
      setEmote("cheer");
    } else if (result.reviewNewlyCompleted) {
      setEmote("smile");
    }

    // 12. Activate the popup queue
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
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
