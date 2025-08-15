import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { TrendingUp, History, Settings, MessageSquare, X, UserCog, Home, Shield, DollarSign, ChevronLeft, ChevronRight, FileText, CheckCircle, CreditCard } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const exchangeRates = [
  { pair: "USD/EUR", rate: "0.8547", trend: "up" },
  { pair: "GBP/USD", rate: "1.2734", trend: "down" },
  { pair: "USD/JPY", rate: "149.82", trend: "up" },
];

export default function Sidebar({ isOpen, onClose, user, collapsed = false, onToggleCollapse }: SidebarProps) {
  const [location] = useLocation();
  
  const NavLink = ({ href, icon: Icon, children, className = "" }: { 
    href: string; 
    icon: any; 
    children: React.ReactNode; 
    className?: string;
  }) => {
    const isActive = location === href;
    const linkClasses = `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
        : 'text-black dark:text-white hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
    } ${className}`;
    
    const content = (
      <Link href={href} className={linkClasses}>
        <Icon className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5'} flex-shrink-0`} />
        {!collapsed && <span>{children}</span>}
      </Link>
    );
    
    if (collapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{children}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return content;
  };

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 ${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 pt-16 transition-all duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className={`${collapsed ? 'p-2' : 'p-4'} h-full flex flex-col overflow-y-auto`}>
          {/* Mobile close button */}
          {!collapsed && (
            <button 
              onClick={onClose}
              className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop collapse toggle button */}
          {onToggleCollapse && (
            <div className="hidden lg:flex justify-end mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="p-2 w-8 h-8"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className={`space-y-2 flex-1 ${collapsed ? 'space-y-1' : 'space-y-2'}`}>
            <NavLink href="/trading" icon={MessageSquare}>
              Trading Room
            </NavLink>
            <NavLink href="/trades" icon={History}>
              My Trades
            </NavLink>
            <NavLink href="/profile" icon={UserCog}>
              Trader Profile
            </NavLink>
            <NavLink href="/verification" icon={CheckCircle}>
              Verification
            </NavLink>
            <NavLink href="/forex-rates" icon={DollarSign}>
              Forex Rates
            </NavLink>
            {user.role === "admin" && (
              <NavLink href="/admin" icon={Shield}>
                Admin Panel
              </NavLink>
            )}
            <NavLink href="/reports" icon={FileText}>
              Reports
            </NavLink>
            <NavLink href="/settings" icon={Settings}>
              Settings
            </NavLink>

            {/* Demo data attributes for onboarding */}
            <div data-demo="messages-button" className="hidden" />
            <div data-demo="portfolio-button" className="hidden" />
          </nav>

          {/* Current Exchange Rates - only show when not collapsed */}
          {!collapsed && (
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
          )}

          {/* Logout Button */}
          <div className="mt-8">
            {collapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full p-2"
                      onClick={() => window.location.href = '/api/logout'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Sign Out</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/api/logout'}
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
