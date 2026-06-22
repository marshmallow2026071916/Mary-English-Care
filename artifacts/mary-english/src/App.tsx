import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/context/GameContext";
import { RewardModal } from "@/components/RewardModal";
import { SplashScreen } from "@/components/SplashScreen";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import NotFound from "@/pages/not-found";
import TopScreen from "@/pages/TopScreen";
import TasksScreen from "@/pages/TasksScreen";
import OptionsScreen from "@/pages/OptionsScreen";
import ReviewLogScreen from "@/pages/ReviewLogScreen";
import MaryProfileScreen from "@/pages/MaryProfileScreen";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={TopScreen} />
      <Route path="/tasks" component={TasksScreen} />
      <Route path="/options" component={OptionsScreen} />
      <Route path="/review-log" component={ReviewLogScreen} />
      <Route path="/profile" component={MaryProfileScreen} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const { updateAvailable, applyUpdate } = usePwaUpdate();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Main app always mounted underneath */}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <GameProvider>
            <Router />
            <RewardModal />
          </GameProvider>
        </WouterRouter>

        {/* Splash renders on top of everything, fades out when done */}
        <AnimatePresence>
          {!splashDone && (
            <SplashScreen key="splash" onDone={() => setSplashDone(true)} />
          )}
        </AnimatePresence>

        {/* PWA update banner — user taps "Update" to activate the new SW */}
        <AnimatePresence>
          {updateAvailable && (
            <motion.div
              key="update-banner"
              initial={{ opacity: 0, y: -56 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -56 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between gap-3 px-5 py-3 bg-primary text-primary-foreground shadow-lg"
              role="status"
              aria-live="polite"
            >
              <span className="text-sm font-medium leading-tight">
                New version available. Tap to update.
              </span>
              <button
                onClick={applyUpdate}
                className="shrink-0 px-4 py-1.5 rounded-full bg-primary-foreground text-primary text-sm font-bold active:scale-95 transition-transform"
              >
                Update
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
