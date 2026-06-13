import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/context/GameContext";
import { RewardModal } from "@/components/RewardModal";
import NotFound from "@/pages/not-found";
import TopScreen from "@/pages/TopScreen";
import TasksScreen from "@/pages/TasksScreen";
import OptionsScreen from "@/pages/OptionsScreen";
import ReviewLogScreen from "@/pages/ReviewLogScreen";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={TopScreen} />
      <Route path="/tasks" component={TasksScreen} />
      <Route path="/options" component={OptionsScreen} />
      <Route path="/review-log" component={ReviewLogScreen} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <GameProvider>
            <Router />
            <RewardModal />
          </GameProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
