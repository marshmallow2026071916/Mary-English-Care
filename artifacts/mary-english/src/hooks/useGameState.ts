import { useState, useCallback } from "react";

const STORAGE_KEY = "mary-english-state";
const MAX_HEARTS = 2;
const XP_PER_LEVEL = 200;

export interface GameState {
  level: number;
  xp: number;
  hearts: number;
  streakCount: number;
  lastDailyDate: string | null;
  weeklyReadingCount: number;
  weeklyReadingMondayStr: string | null;
  lastReadingDate: string | null;
}

const DEFAULT_STATE: GameState = {
  level: 1,
  xp: 0,
  hearts: 1,
  streakCount: 0,
  lastDailyDate: null,
  weeklyReadingCount: 0,
  weeklyReadingMondayStr: null,
  lastReadingDate: null,
};

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMondayStr(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
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

function saveState(state: GameState): void {
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

function getEffectiveWeeklyReading(state: GameState): { count: number; mondayStr: string } {
  const currentMonday = getMondayStr(new Date());
  if (state.weeklyReadingMondayStr !== currentMonday) {
    return { count: 0, mondayStr: currentMonday };
  }
  return { count: state.weeklyReadingCount, mondayStr: currentMonday };
}

export function useGameState() {
  const [state, setStateRaw] = useState<GameState>(() => loadState());

  const setState = useCallback((updater: (prev: GameState) => GameState) => {
    setStateRaw((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const addXP = useCallback((amount: number) => {
    setState((prev) => applyXP(prev, amount));
  }, [setState]);

  const completeDailyTalk = useCallback(() => {
    setState((prev) => {
      const today = toDateStr(new Date());
      if (prev.lastDailyDate === today) return prev;

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

      return next;
    });
  }, [setState]);

  const completeReadingTalk = useCallback(() => {
    setState((prev) => {
      const today = toDateStr(new Date());
      const { count, mondayStr } = getEffectiveWeeklyReading(prev);

      if (count >= 3) return prev;
      if (prev.lastReadingDate === today) return prev;

      let next = applyXP(prev, 10);
      next = {
        ...next,
        weeklyReadingCount: count + 1,
        weeklyReadingMondayStr: mondayStr,
        lastReadingDate: today,
      };
      return next;
    });
  }, [setState]);

  const addHeart = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hearts: Math.min(MAX_HEARTS, prev.hearts + 1),
    }));
  }, [setState]);

  const removeHeart = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hearts: Math.max(0, prev.hearts - 1),
    }));
  }, [setState]);

  const resetData = useCallback(() => {
    setState(() => ({ ...DEFAULT_STATE }));
  }, [setState]);

  const today = toDateStr(new Date());
  const { count: weeklyReadingCount } = getEffectiveWeeklyReading(state);
  const dailyTalkDone = state.lastDailyDate === today;
  const xpPercent = Math.min(100, (state.xp / XP_PER_LEVEL) * 100);

  return {
    state,
    dailyTalkDone,
    weeklyReadingCount,
    xpPercent,
    actions: {
      addXP,
      completeDailyTalk,
      completeReadingTalk,
      addHeart,
      removeHeart,
      resetData,
    },
  };
}
