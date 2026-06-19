import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, CheckCircle2, Upload, X,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle, Gift,
} from "lucide-react";
import { MaryAvatar } from "@/components/MaryAvatar";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useGame } from "@/context/GameContext";
import { useSessionImport, SAMPLE_JSON } from "@/hooks/useSessionImport";

const COMMANDS = [
  { id: "daily",    label: "Daily Talk",    text: "Let's have our daily English conversation." },
  { id: "practice", label: "Practice Talk", text: "Let's do a practice talk session." },
  { id: "review",   label: "Review Talk",   text: "Give me a review talk based on our conversations." },
  { id: "end",      label: "End Talk",      text: "Let's end today's session. Please give me a summary." },
];

const DAILY_RALLY_MAX = 10;
const TASK_RALLY_MAX = 3;

// ─── Progress Row ──────────────────────────────────────────────────────────────
interface ProgressRowProps {
  label: string;
  current: number;
  max: number;
  completed: boolean;
  rallies?: number;
  rallyMax?: number;
  showRally?: boolean;
}

function ProgressRow({
  label,
  current,
  max,
  completed,
  rallies,
  rallyMax,
  showRally = true,
}: ProgressRowProps) {
  const displayRally = showRally && rallies !== undefined && rallyMax !== undefined;

  return (
    <div
      className={`px-4 py-3.5 rounded-2xl border flex justify-between items-center gap-3 transition-colors ${
        completed
          ? "bg-secondary/50 border-border"
          : "bg-primary/[0.07] border-primary/20"
      }`}
    >
      <span
        className={`font-semibold text-sm ${
          completed ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {label}
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {completed ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground/60" />
            <span className="text-sm font-bold text-muted-foreground">
              {max}/{max}
            </span>
            {displayRally && (
              <span className="text-xs text-muted-foreground/50">
                ({rallies}/{rallyMax})
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-sm font-bold text-primary">
              {current}/{max}
            </span>
            {displayRally && (
              <span className="text-xs text-primary/55">
                ({rallies}/{rallyMax})
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Import Section ───────────────────────────────────────────────────────────
function ImportSection() {
  const [devOpen, setDevOpen] = useState(false);
  const {
    jsonText, setJsonText,
    importSession, clearText,
    status, statusMsg,
    resetImportHistory,
  } = useSessionImport();

  const isEmpty = jsonText.trim() === "";

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-foreground mb-1 pl-2 border-l-4 border-primary">
        Import Session Data
      </h2>
      <p className="text-xs text-muted-foreground mb-4 pl-3 italic">
        Paste the JSON from ChatGPT after End Talk.
      </p>

      <div className="relative">
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`{\n  "date": "2026-06-14",\n  "task_type": "Daily Talk",\n  "xp_gained": 10,\n  "daily_completed": true,\n  ...\n}`}
          rows={7}
          className="w-full bg-card border border-border rounded-2xl p-4 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
          data-testid="import-textarea"
          spellCheck={false}
        />
        {!isEmpty && (
          <button
            onClick={clearText}
            className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="import-clear-x"
            aria-label="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {status !== "idle" && statusMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`mt-3 flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                status === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : status === "duplicate"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
              data-testid="import-status-msg"
            >
              {status === "success" ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 mt-3">
        <button
          onClick={importSession}
          disabled={isEmpty}
          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-primary-foreground font-bold py-3 rounded-2xl shadow-sm border-b-4 border-primary-foreground/20"
          data-testid="import-btn"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
        <button
          onClick={clearText}
          disabled={isEmpty}
          className="px-5 bg-secondary hover:bg-secondary/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-secondary-foreground font-bold py-3 rounded-2xl"
          data-testid="import-clear-btn"
        >
          Clear
        </button>
      </div>

      <div className="mt-4">
        <button
          onClick={() => setDevOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="import-dev-toggle"
        >
          {devOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Developer: fill with sample JSON
        </button>

        <AnimatePresence>
          {devOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => { setJsonText(SAMPLE_JSON.dailyTalk()); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 transition-all active:scale-95"
                  data-testid="import-fill-daily"
                >
                  Fill: Daily Talk JSON
                </button>
                <button
                  onClick={() => { setJsonText(SAMPLE_JSON.practiceTalk()); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 transition-all active:scale-95"
                  data-testid="import-fill-practice"
                >
                  Fill: Practice Talk JSON
                </button>
                <button
                  onClick={() => { setJsonText(SAMPLE_JSON.reviewTask()); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 transition-all active:scale-95"
                  data-testid="import-fill-review"
                >
                  Fill: Review Talk JSON
                </button>
                <button
                  onClick={resetImportHistory}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-all active:scale-95"
                  data-testid="import-reset-history"
                >
                  Reset Import History
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TasksScreen() {
  const { toast } = useToast();
  const [showStartMessage, setShowStartMessage] = useState(false);
  const { gs, dailyTalkDone, emote } = useGame();
  const {
    streakCount, equippedOutfit, practiceCount, reviewCount,
    lastDailyRallies, lastPracticeRallies, lastReviewRallies,
  } = gs;

  const practiceCompleted = practiceCount >= 3;
  const reviewCompleted = reviewCount >= 3;
  const anyTaskCompleted = practiceCompleted || reviewCompleted;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copied!", duration: 2000 });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-8">

        <h1
          className="text-2xl font-bold text-center text-foreground mb-8"
          data-testid="text-page-title"
        >
          Tasks
        </h1>

        {/* Mary header */}
        <div className="flex items-center gap-4 mb-8">
          <MaryAvatar
            height={120}
            showEmote={false}
            outfit={equippedOutfit}
            emote={emote}
            variant="bust"
            className="scale-90 origin-left"
          />
          <motion.div
            className="bg-card px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-border flex-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <p className="text-sm font-medium text-foreground">Can we talk today?</p>
          </motion.div>
        </div>

        {/* ── Section 1: Progress Rewards ───────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-0.5">
            Progress Rewards
          </p>

          <div className="space-y-2.5">
            {/* Daily Talk */}
            <ProgressRow
              label="Daily Talk"
              current={dailyTalkDone ? 1 : 0}
              max={1}
              completed={dailyTalkDone}
              rallies={lastDailyRallies}
              rallyMax={DAILY_RALLY_MAX}
            />

            {/* Practice Tasks */}
            <ProgressRow
              label="Practice Tasks"
              current={practiceCount}
              max={3}
              completed={practiceCompleted}
              rallies={lastPracticeRallies}
              rallyMax={TASK_RALLY_MAX}
            />

            {/* Weekly Streak Bonus */}
            <div className="px-4 py-3.5 rounded-2xl border border-border bg-secondary/40">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-semibold text-sm text-muted-foreground">
                  Weekly Streak Bonus
                </span>
                <span
                  className="text-sm font-bold text-muted-foreground"
                  data-testid="text-streak"
                >
                  {streakCount}/7
                </span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary/45 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (streakCount / 7) * 100)}%` }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              </div>
              {gs.hearts === 0 && (
                <p className="text-xs text-muted-foreground/70 mt-2 italic">
                  Restore a heart to continue streak progress.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Mary's Special Gift ───────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5 mb-3 px-0.5">
            <Gift className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Mary's Special Gift
            </p>
          </div>

          <ProgressRow
            label="Review Tasks"
            current={reviewCount}
            max={3}
            completed={reviewCompleted}
            rallies={lastReviewRallies}
            rallyMax={TASK_RALLY_MAX}
          />
        </div>

        {/* ── Talk Commands ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 pl-2 border-l-4 border-primary">
            Talk Commands
          </h2>
          <div className="space-y-3">
            {COMMANDS.map((cmd, i) => (
              <motion.div
                key={cmd.id}
                className="bg-card p-4 rounded-2xl shadow-sm border border-border"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
              >
                <div className="text-sm font-bold text-muted-foreground mb-2">{cmd.label}</div>
                <div className="flex items-center gap-2">
                  <div className="bg-secondary/50 font-mono text-sm p-3 rounded-xl flex-1 text-foreground border border-border/50 break-words">
                    {cmd.text}
                  </div>
                  <button
                    onClick={() => handleCopy(cmd.text)}
                    className="p-3 bg-secondary hover:bg-secondary/80 rounded-xl text-secondary-foreground transition-colors active:scale-95 shrink-0"
                    data-testid={`btn-copy-${cmd.id}`}
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Start Talk ───────────────────────────────────────────────────── */}
        <div className="mb-10">
          <button
            onClick={() => setShowStartMessage(true)}
            className="w-full bg-primary hover:bg-primary/90 active:scale-95 transition-all text-center py-4 rounded-3xl shadow-sm border-b-4 border-primary-foreground/20 font-bold text-primary-foreground text-lg mb-4"
            data-testid="btn-start-talk"
          >
            Start Talk
          </button>

          <AnimatePresence>
            {showStartMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
                data-testid="msg-start-talk"
              >
                <div className="pt-1 pb-2 space-y-3">

                  {/* Mary bust-up + speech bubble */}
                  <div className="flex items-start gap-3">
                    <MaryAvatar
                      height={100}
                      showEmote
                      outfit={equippedOutfit}
                      emote="smile"
                      variant="bust"
                      className="shrink-0"
                    />
                    <motion.div
                      className="bg-card px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-border flex-1 mt-2"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
                    >
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        Yay!<br />Let's talk today, Eikichi!
                      </p>
                    </motion.div>
                  </div>

                  {/* Conversation instruction */}
                  <div className="bg-secondary/60 border border-border text-muted-foreground px-4 py-3 rounded-2xl text-center text-sm font-medium">
                    Please open ChatGPT and start with one of the talk commands.
                  </div>

                  {/* Gentle note — shown when practice or review tasks already completed */}
                  {anyTaskCompleted && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="bg-muted border border-border px-4 py-3 rounded-2xl"
                    >
                      <p className="text-xs text-muted-foreground text-center italic leading-relaxed">
                        You've already completed this task.<br />
                        There won't be any bonus this time,<br />
                        but I'd still love to practice with you.
                      </p>
                    </motion.div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Import Session Data */}
        <ImportSection />

      </div>
      <BottomNav />
    </div>
  );
}
