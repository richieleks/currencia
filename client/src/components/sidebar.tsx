import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { TrendingUp, History, Settings, MessageSquare, X, UserCog, Home, Shield } from "lucide-react";
import { Link } from "wouter";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const exchangeRates = [
  { pair: "USD/EUR", rate: "0.8547", trend: "up" },
  { pair: "GBP/USD", rate: "1.2734", trend: "down" },
  { pair: "USD/JPY", rate: "149.82", trend: "up" },
];

export default function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  return (
    <>
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 pt-16 transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="p-4">
          {/* Mobile close button */}
          <button 
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <Link href="/" className="flex items-center space-x-3 text-black dark:text-white p-3 rounded-lg bg-primary-50 dark:bg-primary-900 border-l-4 border-primary-500">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Trading Room</span>
            </Link>
            <Link href="/trades" className="flex items-center space-x-3 text-black dark:text-white hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg">
              <History className="w-5 h-5" />
              <span>My Trades</span>
            </Link>
            <Link href="/profile" className="flex items-center space-x-3 text-black dark:text-white hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg">
              <UserCog className="w-5 h-5" />
              <span>Trader Profile</span>
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className="flex items-center space-x-3 text-black dark:text-white hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg">
                <Shield className="w-5 h-5" />
                <span>Admin Panel</span>
              </Link>
            )}
            <Link href="/settings" className="flex items-center space-x-3 text-black dark:text-white hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>

            {/* Demo data attributes for onboarding */}
            <div data-demo="messages-button" className="hidden" />
            <div data-demo="portfolio-button" className="hidden" />
          </nav>

          {/* Current Exchange Rates */}
          <div className="mt-8">
            <h4 className="text-sm font-medium text-black dark:text-white mb-3">Live Rates</h4>
            <div className="space-y-2">
              {exchangeRates.map((rate) => (
                <div key={rate.pair} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm font-medium text-black dark:text-white">{rate.pair}</span>
                  <span className={`text-sm ${
                    rate.trend === "up" ? "text-success-600" : "text-red-500"
                  }`}>
                    {rate.rate}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Logout Button */}
          <div className="mt-8">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/api/logout'}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
