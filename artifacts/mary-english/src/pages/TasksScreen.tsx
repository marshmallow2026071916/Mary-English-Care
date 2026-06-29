import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, CheckCircle2, Upload, X,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle, Gift, RefreshCw,
} from "lucide-react";
import { getActiveIconImage } from "@/lib/maryAssets";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useGame } from "@/context/GameContext";
import { useSessionImport, SAMPLE_JSON } from "@/hooks/useSessionImport";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { APP_VERSION, APP_BUILD } from "@/lib/version";

const COMMANDS = [
  { id: "daily",    label: "Daily Talk",       text: "Let's have our daily English conversation." },
  { id: "practice", label: "Practice Talk",    text: "Let's do a practice talk session." },
  { id: "review",   label: "Review Challenge", text: "Give me a review talk based on our conversations." },
  { id: "continue", label: "Continue Talk",    text: "Let's continue our conversation from where we left off." },
  { id: "end",      label: "End Talk",         text: "Let's end today's session. Please give me a summary." },
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

// ─── Version footer ───────────────────────────────────────────────────────────
function VersionFooter() {
  const { checkForUpdate, forceRefresh, resetAssetCache } = usePwaUpdate();
  const [busy, setBusy] = useState<"check" | "force" | "assets" | null>(null);

  const run = (key: "check" | "force" | "assets", fn: () => Promise<void> | void) => async () => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  return (
    <div className="mt-5 space-y-2.5">
      {/* Version label */}
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground/60 font-medium">
          Mary English v{APP_VERSION}
        </span>
        <span className="text-[10px] text-muted-foreground/40">
          Build: {APP_BUILD}
        </span>
      </div>

      {/* Three action buttons */}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={run("check", checkForUpdate)}
          disabled={!!busy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary disabled:opacity-40 transition-colors w-fit"
          data-testid="check-update-btn"
        >
          <RefreshCw className={`w-3 h-3 ${busy === "check" ? "animate-spin" : ""}`} />
          {busy === "check" ? "Checking…" : "Check for update"}
        </button>

        <button
          onClick={run("force", forceRefresh)}
          disabled={!!busy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/55 hover:text-destructive disabled:opacity-40 transition-colors w-fit"
          data-testid="force-refresh-btn"
        >
          <RefreshCw className={`w-3 h-3 ${busy === "force" ? "animate-spin" : ""}`} />
          {busy === "force" ? "Clearing…" : "Force refresh app"}
        </button>

        <button
          onClick={run("assets", resetAssetCache)}
          disabled={!!busy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/55 hover:text-amber-600 disabled:opacity-40 transition-colors w-fit"
          data-testid="reset-assets-btn"
        >
          <RefreshCw className={`w-3 h-3 ${busy === "assets" ? "animate-spin" : ""}`} />
          {busy === "assets" ? "Clearing…" : "Reset downloaded assets"}
        </button>
      </div>
    </div>
  );
}

// ─── Import Section ───────────────────────────────────────────────────────────
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsText(file, "UTF-8");
  });
}

function ImportSection() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [fileReading, setFileReading] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  const {
    json1Text, setJson1Text,
    json2Text, setJson2Text,
    importTexts, importSession, clearAll,
    showError, status, statusMsg,
    resetImportHistory,
    pendingConflict, resolveConflict,
  } = useSessionImport();

  // ── File import handler
  const handleFileImport = async () => {
    if (!file1) {
      showError("JSON File 1 is required.");
      return;
    }
    setFileReading(true);
    try {
      let text1 = "";
      let text2 = "";
      try {
        text1 = await readFileText(file1);
      } catch {
        showError("JSON file could not be read.");
        return;
      }
      if (file2) {
        try {
          text2 = await readFileText(file2);
        } catch {
          showError("JSON file could not be read.");
          return;
        }
      }
      importTexts(text1, text2);
    } finally {
      setFileReading(false);
    }
  };

  // ── Status banner (shared by both paths)
  const statusBanner = status !== "idle" && statusMsg ? (
    <AnimatePresence>
      <motion.div
        key="status"
        initial={{ opacity: 0, height: 0, y: -4 }}
        animate={{ opacity: 1, height: "auto", y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden mb-3"
      >
        <div
          className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
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
    </AnimatePresence>
  ) : null;

  const TEXTAREA_CLASS =
    "w-full bg-card border border-border rounded-2xl p-4 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all";

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-foreground mb-1 pl-2 border-l-4 border-primary">
        Import Session Data
      </h2>
      <p className="text-xs text-muted-foreground mb-4 pl-3 italic">
        Select the JSON file exported from ChatGPT after End Talk.
      </p>

      {/* ── Primary: File upload ── */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">

        {/* File 1 */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5">
            JSON File 1
          </label>
          <label
            className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
            data-testid="file1-label"
          >
            <Upload className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-primary truncate">
              {file1 ? file1.name : "Choose JSON file…"}
            </span>
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              data-testid="file1-input"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile1(f);
                e.target.value = "";
              }}
            />
          </label>
          {file1 && (
            <button
              onClick={() => setFile1(null)}
              className="mt-1 text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
        </div>

        {/* File 2 */}
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1.5">
            JSON File 2{" "}
            <span className="font-normal">(optional — for long conversations)</span>
          </label>
          <label
            className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-border bg-secondary/40 hover:bg-secondary/70 transition-colors"
            data-testid="file2-label"
          >
            <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {file2 ? file2.name : "Choose JSON file… (optional)"}
            </span>
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              data-testid="file2-input"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile2(f);
                e.target.value = "";
              }}
            />
          </label>
          {file2 && (
            <button
              onClick={() => setFile2(null)}
              className="mt-1 text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
        </div>

        {statusBanner}

        {/* ── Conflict resolution panel (Review Log Recovery duplicate) ── */}
        <AnimatePresence>
          {pendingConflict && (
            <motion.div
              key="conflict"
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Duplicate Review Log</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {pendingConflict.existingEntry.date.slice(0, 10)}{" "}
                      · Part {pendingConflict.existingEntry.part ?? 1}{" "}
                      · Level {pendingConflict.existingEntry.level}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      An existing entry matches this date, level, and part. Choose how to handle it:
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => resolveConflict("skip")}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-white border-2 border-amber-400 text-amber-900 text-sm font-bold hover:bg-amber-50 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <span className="text-base">⏭</span>
                    <span>Skip — keep existing <span className="font-normal text-amber-700">(recommended)</span></span>
                  </button>
                  <button
                    onClick={() => resolveConflict("append")}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-amber-200 text-amber-900 text-sm font-medium hover:bg-amber-50 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <span className="text-base">➕</span>
                    <span>Append as Part {pendingConflict.nextPartIfAppend}</span>
                  </button>
                  <button
                    onClick={() => resolveConflict("overwrite")}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-amber-200 text-amber-900 text-sm font-medium hover:bg-amber-50 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <span className="text-base">🔄</span>
                    <span>Overwrite existing entry</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleFileImport}
          disabled={fileReading || !!pendingConflict}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-primary-foreground font-bold py-3 rounded-2xl shadow-sm border-b-4 border-primary-foreground/20"
          data-testid="import-btn"
        >
          <Upload className="w-4 h-4" />
          {fileReading ? "Reading…" : "Import JSON"}
        </button>
      </div>

      {/* ── Secondary: Text paste (collapsible) ── */}
      <div className="mt-2">
        <button
          onClick={() => setPasteOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="paste-toggle"
        >
          {pasteOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Paste JSON instead (text)
        </button>

        <AnimatePresence>
          {pasteOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 pl-1">
                    JSON 1
                  </label>
                  <div className="relative">
                    <textarea
                      value={json1Text}
                      onChange={(e) => setJson1Text(e.target.value)}
                      placeholder={`{ "version": "3.2", "date": "2026-06-25", "part": 1, ... }`}
                      rows={5}
                      className={TEXTAREA_CLASS}
                      data-testid="import-textarea"
                      spellCheck={false}
                    />
                    {json1Text.trim() !== "" && (
                      <button
                        onClick={() => setJson1Text("")}
                        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear JSON 1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 pl-1">
                    JSON 2{" "}
                    <span className="font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={json2Text}
                      onChange={(e) => setJson2Text(e.target.value)}
                      placeholder={`{ "version": "3.2", "date": "2026-06-25", "part": 2, ... }`}
                      rows={4}
                      className={TEXTAREA_CLASS}
                      data-testid="import-textarea-2"
                      spellCheck={false}
                    />
                    {json2Text.trim() !== "" && (
                      <button
                        onClick={() => setJson2Text("")}
                        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear JSON 2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={importSession}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 transition-all text-primary-foreground font-bold py-3 rounded-2xl shadow-sm border-b-4 border-primary-foreground/20"
                    data-testid="import-paste-btn"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  <button
                    onClick={clearAll}
                    disabled={json1Text.trim() === "" && json2Text.trim() === ""}
                    className="px-5 bg-secondary hover:bg-secondary/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-secondary-foreground font-bold py-3 rounded-2xl"
                    data-testid="import-clear-btn"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Version + update check ── */}
      <VersionFooter />

      {/* ── Developer tools ── */}
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
                  onClick={() => { setJson1Text(SAMPLE_JSON.dailyTalk()); setPasteOpen(true); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 transition-all active:scale-95"
                  data-testid="import-fill-daily"
                >
                  Fill: Daily Talk JSON
                </button>
                <button
                  onClick={() => { setJson1Text(SAMPLE_JSON.practiceTalk()); setPasteOpen(true); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 transition-all active:scale-95"
                  data-testid="import-fill-practice"
                >
                  Fill: Practice Talk JSON
                </button>
                <button
                  onClick={() => { setJson1Text(SAMPLE_JSON.reviewTask()); setPasteOpen(true); }}
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
    selectedOutfit, selectedReviewReward,
  } = gs;

  const practiceCompleted = practiceCount >= 3;
  const reviewCompleted = reviewCount >= 3;
  const anyTaskCompleted = practiceCompleted || reviewCompleted;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "✓ Copied!", duration: 2000 });
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
          <div className="w-36 h-44 flex-shrink-0">
            <img
              src={getActiveIconImage(selectedOutfit, selectedReviewReward)}
              alt="Mary portrait"
              className="w-full h-full object-contain object-top"
              draggable={false}
            />
          </div>
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
                    onClick={() => handleCopy(cmd.label)}
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
                    <div className="w-36 h-44 flex-shrink-0">
                      <img
                        src={getActiveIconImage(selectedOutfit, selectedReviewReward)}
                        alt="Mary portrait"
                        className="w-full h-full object-contain object-top"
                        draggable={false}
                      />
                    </div>
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
