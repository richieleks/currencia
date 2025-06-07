import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { TrendingUp, History, Settings, MessageSquare, X } from "lucide-react";

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
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 pt-16 transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="p-4">
          {/* Mobile close button */}
          <button 
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Account Balance Widget */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 mb-6 text-white">
            <h3 className="text-sm font-medium opacity-90">Account Balance</h3>
            <p className="text-2xl font-bold">
              ${parseFloat(user.balance || "0").toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs opacity-75 mt-1">Available for trading</p>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <a href="#" className="flex items-center space-x-3 text-gray-700 p-3 rounded-lg bg-primary-50 border-l-4 border-primary-500">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Trading Room</span>
            </a>
            <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-3 rounded-lg">
              <TrendingUp className="w-5 h-5" />
              <span>My Trades</span>
            </a>
            <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-3 rounded-lg">
              <History className="w-5 h-5" />
              <span>Transaction History</span>
            </a>
            <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-3 rounded-lg">
              <Settings className="w-5 h-5" />
              <span>Profile Settings</span>
            </a>
          </nav>

          {/* Current Exchange Rates */}
          <div className="mt-8">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Live Rates</h4>
            <div className="space-y-2">
              {exchangeRates.map((rate) => (
                <div key={rate.pair} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{rate.pair}</span>
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
