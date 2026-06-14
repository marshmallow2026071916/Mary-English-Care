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
  weeklyReadingCount: number;
  weeklyReadingMondayStr: string | null;
  lastReadingDate: string | null;
  unlockedOutfits: string[];
  equippedOutfit: string;
}

export interface SessionImportData {
  session_id?: string;
  date: string;
  task_type: string;
  xp_gained: number;
  daily_completed?: boolean;
  reading_talk_completed?: boolean;
  special_completed?: boolean;
  rallies?: number;
  summary?: string;
}

export interface ImportResult {
  dailyNewlyCompleted: boolean;
  readingNewlyCompleted: boolean;
  leveledUp: boolean;
}

interface GameContextValue {
  gs: GameState;
  dailyTalkDone: boolean;
  weeklyReadingCount: number;
  xpPercent: number;
  emote: EmoteState;
  activeModal: ModalType | null;
  closeModal: () => void;
  isUnlocked: (id: string) => boolean;
  actions: {
    addXP: (n: number) => void;
    completeDailyTalk: () => void;
    completeReadingTalk: () => void;
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

const DEFAULT_STATE: GameState = {
  level: 1,
  xp: 0,
  hearts: 1,
  streakCount: 0,
  lastDailyDate: null,
  weeklyReadingCount: 0,
  weeklyReadingMondayStr: null,
  lastReadingDate: null,
  unlockedOutfits: ["black"],
  equippedOutfit: "black",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}
function getMondayStr(date: Date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
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
function applyXP(state: GameState, amount: number): GameState {
  if (amount <= 0) return state;
  let xp = state.xp + amount;
  let level = state.level;
  while (xp >= XP_PER_LEVEL) {
    xp -= XP_PER_LEVEL;
    level++;
  }
  return { ...state, xp, level };
}
function effectiveWeeklyReading(state: GameState) {
  const monday = getMondayStr(new Date());
  if (state.weeklyReadingMondayStr !== monday) return { count: 0, monday };
  return { count: state.weeklyReadingCount, monday };
}
function effectiveWeeklyReadingForDate(state: GameState, dateStr: string) {
  const monday = getMondayStr(new Date(dateStr + "T00:00:00Z"));
  if (state.weeklyReadingMondayStr !== monday) return { count: 0, monday };
  return { count: state.weeklyReadingCount, monday };
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
  // Modal queue — modals are shown in order, next appears when current closes
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

  const completeReadingTalk = useCallback(() => {
    const prev = gsRef.current;
    const today = toDateStr(new Date());
    const { count, monday } = effectiveWeeklyReading(prev);
    if (count >= 3 || prev.lastReadingDate === today) return;

    const next = applyXP(
      { ...prev, weeklyReadingCount: count + 1, weeklyReadingMondayStr: monday, lastReadingDate: today },
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
    const result: ImportResult = { dailyNewlyCompleted: false, readingNewlyCompleted: false, leveledUp: false };

    let state = { ...prev };

    // 1. Add xp_gained
    state = applyXP(state, data.xp_gained);

    // 2. daily_completed
    if (data.daily_completed && state.lastDailyDate !== importDate) {
      const dayBefore = getDayBefore(importDate);
      const newStreak = state.lastDailyDate === dayBefore ? state.streakCount + 1 : 1;
      state = { ...state, lastDailyDate: importDate, streakCount: newStreak };
      if (prev.hearts > 0 && newStreak >= 7) {
        state = applyXP(state, 100);
        state = { ...state, streakCount: 0 };
      }
      result.dailyNewlyCompleted = true;
    }

    // 3. reading_talk_completed
    if (data.reading_talk_completed && state.lastReadingDate !== importDate) {
      const { count, monday } = effectiveWeeklyReadingForDate(state, importDate);
      if (count < 3) {
        state = applyXP(
          { ...state, weeklyReadingCount: count + 1, weeklyReadingMondayStr: monday, lastReadingDate: importDate },
          10
        );
        result.readingNewlyCompleted = true;
      }
    }

    // 4. Level-up detection
    if (state.level > prev.level) {
      state = addOutfit(state, "level");
      result.leveledUp = true;
    }

    update(state);

    // 5. Queue modals in correct order + set emote
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
  const { count: weeklyReadingCount } = effectiveWeeklyReading(gs);
  const dailyTalkDone = gs.lastDailyDate === today;
  const xpPercent = Math.min(100, (gs.xp / XP_PER_LEVEL) * 100);
  const isUnlocked = useCallback((id: string) => gs.unlockedOutfits.includes(id), [gs.unlockedOutfits]);

  const value: GameContextValue = {
    gs,
    dailyTalkDone,
    weeklyReadingCount,
    xpPercent,
    emote,
    activeModal,
    closeModal,
    isUnlocked,
    actions: {
      addXP,
      completeDailyTalk,
      completeReadingTalk,
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
