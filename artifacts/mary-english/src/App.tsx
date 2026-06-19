import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/context/GameContext";
import { RewardModal } from "@/components/RewardModal";
import { SplashScreen } from "@/components/SplashScreen";
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

        {/* Splash renders on top, fades out when done */}
        <AnimatePresence>
          {!splashDone && (
            <SplashScreen key="splash" onDone={() => setSplashDone(true)} />
          )}
        </AnimatePresence>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
