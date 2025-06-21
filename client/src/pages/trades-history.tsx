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
      {/* Custom Header for Trading Activity */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-black dark:text-white">Currencia</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {/* Notifications */}
            <button className="relative text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">3</span>
            </button>
            
            {/* User Profile */}
            {user && (
              <div className="flex items-center space-x-3">
                <img 
                  src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${user.firstName || 'User'}&background=1565C0&color=fff`}
                  alt="User Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-black dark:text-white">
                    {user.firstName || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

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