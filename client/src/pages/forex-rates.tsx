import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import ForexRatesManager from "@/components/forex-rates-manager";
import MarketRatesWidget from "@/components/market-rates-widget";

export default function ForexRatesPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access forex rates management.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  }, [user, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Authentication Required</h1>
          <p className="text-gray-600 mt-2">Please log in to access forex rates management.</p>
          <p className="text-sm text-gray-500 mt-1">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Forex Rates Management</h2>
            <p className="text-muted-foreground">
              Manage your daily forex rates and view market insights
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ForexRatesManager />
          </div>
          <div className="xl:col-span-1">
            <MarketRatesWidget />
          </div>
        </div>
      </div>
    </Layout>
  );
}