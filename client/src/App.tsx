import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import TradingRoom from "@/pages/trading-room";
import RoleSelector from "@/components/role-selector";
import { useState } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [roleSelected, setRoleSelected] = useState(false);

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : !user?.role && !roleSelected ? (
        <Route path="/" component={() => <RoleSelector onRoleSelected={() => setRoleSelected(true)} />} />
      ) : (
        <>
          <Route path="/" component={TradingRoom} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
