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
  | "small-reward"
  | null;

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

interface GameContextValue {
  gs: GameState;
  dailyTalkDone: boolean;
  weeklyReadingCount: number;
  xpPercent: number;
  emote: EmoteState;
  activeModal: ModalType;
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
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const emoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync ref on every render (cheap)
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

  // ─ closeModal ────────────────────────────────────────────────────────────────
  const closeModal = useCallback(() => {
    setActiveModal(null);
    setEmote("idle", false);
  }, [setEmote]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const addXP = useCallback((amount: number) => {
    const prev = gsRef.current;
    const next = applyXP(prev, amount);
    if (next.level > prev.level) {
      const withOutfit = addOutfit(next, "level");
      update(withOutfit);
      setEmote("celebration", false);
      setActiveModal("level-up");
    } else {
      update(next);
    }
  }, [update, setEmote]);

  const completeDailyTalk = useCallback(() => {
    const prev = gsRef.current;
    const today = toDateStr(new Date());
    if (prev.lastDailyDate === today) return;

    let next = applyXP(prev, 10);
    next = { ...next, lastDailyDate: today };

    if (prev.hearts > 0) {
      const yesterday = toDateStr(new Date(Date.now() - 86_400_000));
      const newStreak = prev.lastDailyDate === yesterday ? prev.streakCount + 1 : 1;
      next = { ...next, streakCount: newStreak };
      if (newStreak >= 7) {
        next = applyXP(next, 100);
        next = { ...next, streakCount: 0 };
      }
    }

    // detect level-up within this action too
    if (next.level > prev.level) {
      next = addOutfit(next, "level");
      update(next);
      setEmote("celebration", false);
      setActiveModal("level-up");
    } else {
      update(next);
      setEmote("cheer");
      setActiveModal("daily-talk");
    }
  }, [update, setEmote]);

  const completeReadingTalk = useCallback(() => {
    const prev = gsRef.current;
    const today = toDateStr(new Date());
    const { count, monday } = effectiveWeeklyReading(prev);
    if (count >= 3 || prev.lastReadingDate === today) return;

    const next = applyXP(
      {
        ...prev,
        weeklyReadingCount: count + 1,
        weeklyReadingMondayStr: monday,
        lastReadingDate: today,
      },
      10
    );

    if (next.level > prev.level) {
      const withOutfit = addOutfit(next, "level");
      update(withOutfit);
      setEmote("celebration", false);
      setActiveModal("level-up");
    } else {
      update(next);
    }
  }, [update, setEmote]);

  const addHeart = useCallback(() => {
    const prev = gsRef.current;
    if (prev.hearts >= MAX_HEARTS) return;
    update({ ...prev, hearts: prev.hearts + 1 });
    setEmote("smile");
    setActiveModal("heart");
  }, [update, setEmote]);

  const removeHeart = useCallback(() => {
    const prev = gsRef.current;
    update({ ...prev, hearts: Math.max(0, prev.hearts - 1) });
  }, [update]);

  const resetData = useCallback(() => {
    update({ ...DEFAULT_STATE });
    setEmoteRaw("idle");
    setActiveModal(null);
  }, [update]);

  const equipOutfit = useCallback((id: string) => {
    const prev = gsRef.current;
    if (!prev.unlockedOutfits.includes(id)) return;
    update({ ...prev, equippedOutfit: id });
    setEmote("smile");
  }, [update, setEmote]);

  const unlockOutfit = useCallback((id: string) => {
    const prev = gsRef.current;
    update(addOutfit(prev, id));
  }, [update]);

  const unlockSeasonalOutfit = useCallback(() => {
    const prev = gsRef.current;
    update(addOutfit(prev, "seasonal"));
    setEmote("celebration", false);
    setActiveModal("seasonal");
  }, [update, setEmote]);

  const resetWardrobe = useCallback(() => {
    const prev = gsRef.current;
    update({ ...prev, unlockedOutfits: ["black"], equippedOutfit: "black" });
  }, [update]);

  const triggerSmallReward = useCallback(() => {
    setEmote("smile");
    setActiveModal("small-reward");
  }, [setEmote]);

  const triggerLevelUpReward = useCallback(() => {
    const prev = gsRef.current;
    update(addOutfit(prev, "level"));
    setEmote("celebration", false);
    setActiveModal("level-up");
  }, [update, setEmote]);

  const triggerHeartReward = useCallback(() => {
    setEmote("smile");
    setActiveModal("heart");
  }, [setEmote]);

  const unlockLevelRewardOutfit = useCallback(() => {
    const prev = gsRef.current;
    update(addOutfit(prev, "level"));
  }, [update]);

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
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
