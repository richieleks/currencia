import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Landing from "@/pages/landing";
import TradingRoom from "@/pages/trading-room";
import BidderProfilePage from "@/pages/bidder-profile";
import TradesHistoryPage from "@/pages/trades-history";
import SettingsPage from "@/pages/settings";
import AdminPage from "@/pages/admin";
import ForexRatesPage from "@/pages/forex-rates";
import ReportsPage from "@/pages/reports";
import VerificationPage from "@/pages/VerificationPage";
import BankAccountsPage from "@/pages/BankAccountsPage";
import Layout from "@/components/layout";
import { SessionManager } from "@/components/session-manager";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={Landing} />
      
      <ProtectedRoute path="/trading" component={() => (
        <Layout>
          <SessionManager />
          <TradingRoom />
        </Layout>
      )} />
      
      <ProtectedRoute path="/profile" component={() => (
        <Layout>
          <BidderProfilePage />
        </Layout>
      )} />
      
      <ProtectedRoute path="/trades" component={() => (
        <Layout>
          <TradesHistoryPage />
        </Layout>
      )} />
      
      <ProtectedRoute path="/settings" component={() => (
        <Layout>
          <SettingsPage />
        </Layout>
      )} />
      
      <ProtectedRoute path="/forex-rates" component={() => (
        <Layout>
          <ForexRatesPage />
        </Layout>
      )} />
      
      <ProtectedRoute path="/verification" component={() => (
        <Layout>
          <VerificationPage />
        </Layout>
      )} />
      
      <ProtectedRoute path="/bank-accounts" component={() => (
        <Layout>
          <BankAccountsPage />
        </Layout>
      )} />
      
      <ProtectedRoute path="/admin" component={() => (
        <Layout>
          <AdminPage />
        </Layout>
      )} />
      
      <ProtectedRoute path="/reports" component={() => (
        <Layout>
          <ReportsPage />
        </Layout>
      )} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="currencia-ui-theme">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
