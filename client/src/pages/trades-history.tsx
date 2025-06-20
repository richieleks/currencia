import { useState } from "react";
import TradesHistory from "@/components/trades-history";
import TradingActivitySidebar from "@/components/trading-activity-sidebar";

export default function TradesHistoryPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <TradingActivitySidebar 
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      
      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">My Trading Activity</h1>
            <p className="text-muted-foreground mt-2">
              View your completed trades and transaction history
            </p>
          </div>
          <TradesHistory activeFilter={activeFilter} />
        </div>
      </div>
    </div>
  );
}