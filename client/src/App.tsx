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
import BidderProfilePage from "@/pages/bidder-profile";
import TradesHistoryPage from "@/pages/trades-history";
import SettingsPage from "@/pages/settings";
import AdminPage from "@/pages/admin";
import ForexRatesPage from "@/pages/forex-rates";
import RoleSelector from "@/components/role-selector";
import Layout from "@/components/layout";
import { useState } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [roleSelected, setRoleSelected] = useState(false);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log("Auth state:", { isAuthenticated, isLoading, user: user ? { id: user.id, role: user.role } : null, roleSelected });
  }

  return (
    <Switch>
      {isLoading ? (
        <Route path="/" component={() => (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        )} />
      ) : !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : !user?.role && !roleSelected ? (
        <Route path="/" component={() => <RoleSelector onRoleSelected={() => setRoleSelected(true)} />} />
      ) : (
        <Layout user={user!}>
          <Route path="/" component={TradingRoom} />
          <Route path="/profile" component={BidderProfilePage} />
          <Route path="/trades" component={TradesHistoryPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/forex-rates" component={ForexRatesPage} />
          <Route path="/admin" component={AdminPage} />
        </Layout>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="currencia-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
