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
  | "level-up"
  | "daily-talk"
  | "heart"
  | "seasonal"
  | "small-reward";

export interface GameState {
  level: number;
  xp: number;
  hearts: number;
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
  // Legacy fields kept for localStorage backwards-compat; no longer drive logic
  weeklyReadingCount: number;
  weeklyReadingMondayStr: string | null;
  lastReadingDate: string | null;
}

export interface SessionImportData {
  session_id?: string;
  date: string;
  task_type: string;
  xp_gained: number;
  daily_completed?: boolean;
  reading_talk_completed?: boolean; // legacy alias for practice_completed
  practice_completed?: boolean;
  special_completed?: boolean;      // legacy alias for review_completed
  review_completed?: boolean;
  rallies?: number;
  summary?: string;
}

export interface ImportResult {
  dailyNewlyCompleted: boolean;
  practiceNewlyCompleted: boolean;
  reviewNewlyCompleted: boolean;
  leveledUp: boolean;
}

interface GameContextValue {
  gs: GameState;
  dailyTalkDone: boolean;
  xpPercent: number;
  emote: EmoteState;
  activeModal: ModalType | null;
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
  streakCount: 0,
  lastDailyDate: null,
  practiceCount: 0,
  reviewCount: 0,
  lastDailyRallies: 0,
  lastPracticeRallies: 0,
  lastReviewRallies: 0,
  unlockedOutfits: ["black"],
  equippedOutfit: "black",
  weeklyReadingCount: 0,
  weeklyReadingMondayStr: null,
  lastReadingDate: null,
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
function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
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

// ─── Context ──────────────────────────────────────────────────────────────────
const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gs, setGsRaw] = useState<GameState>(() => loadState());
  const gsRef = useRef<GameState>(gs);
  const [emote, setEmoteRaw] = useState<EmoteState>("idle");
  const [modalQueue, setModalQueue] = useState<ModalType[]>([]);
  const activeModal: ModalType | null = modalQueue[0] ?? null;
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
    const newStreak = prev.lastDailyDate === dayBefore ? prev.streakCount + 1 : 1;
    next = { ...next, lastDailyDate: today, streakCount: newStreak };

    if (prev.hearts > 0 && newStreak >= 7) {
      next = applyXP(next, 100);
      next = { ...next, streakCount: 0 };
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
    update({ ...prev, hearts: prev.hearts + 1 });
    setEmote("smile");
    showModal("heart");
  }, [update, setEmote, showModal]);

  const removeHeart = useCallback(() => {
    const prev = gsRef.current;
    update({ ...prev, hearts: Math.max(0, prev.hearts - 1) });
  }, [update]);

  const resetData = useCallback(() => {
    update({ ...DEFAULT_STATE });
    setEmoteRaw("idle");
    setModalQueue([]);
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

  // ─ importSessionData ────────────────────────────────────────────────────────
  const importSessionData = useCallback((data: SessionImportData): ImportResult => {
    const prev = gsRef.current;
    const importDate = data.date;
    const result: ImportResult = {
      dailyNewlyCompleted: false,
      practiceNewlyCompleted: false,
      reviewNewlyCompleted: false,
      leveledUp: false,
    };

    let state = { ...prev };
    const tt = (data.task_type ?? "").trim();

    // 1. Add xp_gained (may level-up, resetting practiceCount/reviewCount)
    state = applyXP(state, data.xp_gained);

    // 2. Rally count tracking for display (based on task_type)
    if (data.rallies !== undefined) {
      if (tt === "Daily Talk" || data.daily_completed) {
        state = { ...state, lastDailyRallies: data.rallies };
      } else if (
        tt === "Practice Talk" || tt === "Reading Talk" ||
        (data.practice_completed ?? data.reading_talk_completed)
      ) {
        state = { ...state, lastPracticeRallies: data.rallies };
      } else if (
        tt === "Review Talk" || tt === "Review Challenge" ||
        (data.review_completed ?? data.special_completed)
      ) {
        state = { ...state, lastReviewRallies: data.rallies };
      }
    }

    // 3. daily_completed
    // Requires rallies >= 10 if provided; trusts flag if rallies absent (backwards compat)
    const dailyCanComplete =
      !!data.daily_completed &&
      (data.rallies === undefined || data.rallies >= DAILY_RALLY_TARGET);
    if (dailyCanComplete && state.lastDailyDate !== importDate) {
      const dayBefore = getDayBefore(importDate);
      const newStreak = state.lastDailyDate === dayBefore ? state.streakCount + 1 : 1;
      state = { ...state, lastDailyDate: importDate, streakCount: newStreak };
      if (prev.hearts > 0 && newStreak >= 7) {
        state = applyXP(state, 100);
        state = { ...state, streakCount: 0 };
      }
      result.dailyNewlyCompleted = true;
    }

    // 4. practice_completed (accepts practice_completed or legacy reading_talk_completed)
    // Requires rallies >= 3 if provided; trusts flag if rallies absent (backwards compat)
    const practiceFlag = data.practice_completed ?? data.reading_talk_completed ?? false;
    const practiceCanComplete =
      practiceFlag &&
      (data.rallies === undefined || data.rallies >= TASK_RALLY_TARGET) &&
      state.practiceCount < MAX_PRACTICE;
    if (practiceCanComplete) {
      state = { ...state, practiceCount: state.practiceCount + 1 };
      result.practiceNewlyCompleted = true;
    }

    // 5. review_completed (accepts review_completed or legacy special_completed)
    const reviewFlag = data.review_completed ?? data.special_completed ?? false;
    const reviewCanComplete =
      reviewFlag &&
      (data.rallies === undefined || data.rallies >= TASK_RALLY_TARGET) &&
      state.reviewCount < MAX_REVIEW;
    if (reviewCanComplete) {
      state = { ...state, reviewCount: state.reviewCount + 1 };
      result.reviewNewlyCompleted = true;
    }

    // 6. Level-up detection
    if (state.level > prev.level) {
      state = addOutfit(state, "level");
      result.leveledUp = true;
    }

    update(state);

    // 7. Queue modals + set emote
    if (result.leveledUp) {
      setEmote("celebration", false);
      if (result.dailyNewlyCompleted) showModal("daily-talk");
      showModal("level-up");
    } else if (result.dailyNewlyCompleted) {
      setEmote("cheer");
      showModal("daily-talk");
    }

    return result;
  }, [update, setEmote, showModal]);

  // ─ Derived ──────────────────────────────────────────────────────────────────
  const today = toDateStr(new Date());
  const dailyTalkDone = gs.lastDailyDate === today;
  const xpPercent = Math.min(100, (gs.xp / XP_PER_LEVEL) * 100);
  const isUnlocked = useCallback((id: string) => gs.unlockedOutfits.includes(id), [gs.unlockedOutfits]);

  const value: GameContextValue = {
    gs,
    dailyTalkDone,
    xpPercent,
    emote,
    activeModal,
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
