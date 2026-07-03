---
name: Mary English Session JSON import semantics
description: How restoreMode "session" imports should treat progress fields vs popup triggers in GameContext's importSessionData.
---

For `restoreMode: "session"` imports (`importSessionData` in `GameContext.tsx`), there are two independent layers that must not be conflated:

1. **Progress snapshot fields (level, totalXp, weeklyStreak, heart) are replaced, never added.** `totalXp` is the absolute cumulative XP after the session (same formula as `restoreFullProgress`: `xp = totalXp - level*XP_PER_LEVEL`, clamped to one level's range), not a per-session delta. Applying it via addition (e.g. `applyXP(state, data.totalXp)`) is a recurring bug class here — always check whether a "restore" path is adding a snapshot value instead of assigning it.

2. **Popups are presentation-only and replayed from the JSON's session-result flags**, not from before/after state diffing: `dailyTalkCompleted && dailyXp>0` → Daily reward, `practiceTalkCompleted && practiceXp>0` → Practice reward, `reviewChallengeCompleted && reviewXp>0` → Review progress, `bonusXp>0` → Weekly Streak Bonus popup. The "XP Gained" popup amount is `dailyXp+practiceXp+reviewXp+bonusXp` (the session's delta breakdown), not `totalXp` (the absolute snapshot) — using `totalXp` there would show a huge/wrong number and fire on every import.

**Why:** The JSON's `dailyXp`/`practiceXp`/`reviewXp`/`bonusXp` fields describe *what happened this session* (event replay), while `totalXp`/`level`/`weeklyStreak`/`heart` describe *the resulting absolute game state* — they are not the same kind of value even though `totalXp` sounds like it could be a sum of the other Xp fields.

**How to apply:** When touching `importSessionData` or the Session JSON sample data (`SAMPLE_JSON` in `useSessionImport.ts`), keep `totalXp` internally consistent with `level` (e.g. level 1 + 10 xp-into-level ⇒ `totalXp: 210`, not `10`). Wardrobe unlocks / practice-review count resets still fire by comparing prev level to the newly-assigned (replaced) level — that comparison is fine, it's just not used to compute the level value itself.
