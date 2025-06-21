import { useState } from "react";
import TradesHistory from "@/components/trades-history";
import TradingActivitySidebar from "@/components/trading-activity-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function TradesHistoryPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <TradingActivitySidebar 
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
        
        {/* Content Area */}
        <div className="flex-1">
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">My Trading Activity</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View your completed trades and transaction history
              </p>
            </div>
            <TradesHistory activeFilter={activeFilter} />
          </div>
        </div>
      </div>
    </div>
  );
}