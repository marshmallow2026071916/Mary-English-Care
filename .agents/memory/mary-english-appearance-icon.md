---
name: Mary English "Current Appearance Icon" convention
description: Defines the small icon asset vs full-body display image distinction in the Mary English app, and which screens use which.
---

"Current Appearance Icon" means the small icon asset representing Mary's current
appearance — `icon_outfit_NNN.png` or `icon_review_reward_NNN.png` — NEVER a
full-body (`outfit_idle_NNN.png`), bust, or raw reward showcase image
(`review_reward_NNN.png`).

**Why:** these terms sound interchangeable in conversation ("Mary's picture",
"her image") but map to visually very different assets; using the wrong one
silently ships the wrong art size/crop everywhere that screen is shown.

**Screens that must use the icon** (all use `getActiveIconImage()` /
`getLogLevelIconImage()` / `getOutfitIconImage()` from `maryAssets.ts`):
- Tasks screen (header + bust-up/speech-bubble section)
- Review Log header
- Mary Profile screen — including its "Mary says" message box (this IS what
  "Mary Says" refers to, confirmed by user; NOT the Home screen)
- Outfit cards (Options screen, Outfits tab)
- Review Log conversation cards — keyed off `reviewLog.level`, not the
  globally selected outfit/reward

**Screens that intentionally keep the full-body/raw display image** (out of
scope, do not "fix" these):
- Home/Top screen's large Mary Display Area — explicit user instruction: keep
  full-body, never shrink to icon.
- Splash/Intro screens.
- Reward popup (`RewardModal`) and the Options "Rewards" tab preview cards —
  these showcase the actual reward artwork on purpose.

**How to apply:** when asked to fix "Mary's icon" or "current appearance"
anywhere in this app, check which of the two buckets above the screen falls
into before touching `maryAssets.ts` helpers or swapping image sources.
