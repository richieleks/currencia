import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Menu, Bell, TrendingUp, PanelLeftClose, PanelLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import NotificationsDropdown from "@/components/notifications-dropdown";

import DemoButton from "@/components/demo-button";
import DemoResetButton from "@/components/demo-reset-button";

interface LayoutProps {
  children: React.ReactNode;
  user: User;
}

export default function Layout({ children, user }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [location] = useLocation();

  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Trading Room";
      case "/trades":
        return "My Trades";
      case "/profile":
        return "Trader Profile";
      case "/bank-accounts":
        return "Bank Accounts";
      case "/verification":
        return "Verification";
      case "/forex-rates":
        return "Forex Rates";
      case "/admin":
        return "Admin Panel";
      case "/reports":
        return "Reports";
      case "/settings":
        return "Settings";
      default:
        return "Currencia";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Menu */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Currencia</span>
              </Link>
              
              {/* Desktop sidebar toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex ml-2"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              
              <span className="hidden lg:block text-gray-500 dark:text-gray-400">|</span>
              <h1 className="hidden lg:block text-lg font-medium text-gray-900 dark:text-white">
                {getPageTitle()}
              </h1>
              
              {/* Add demo data attributes for tutorial - invisible markers */}
              <div 
                data-demo="messages-button" 
                className="absolute opacity-0 pointer-events-none" 
                style={{ left: '200px', top: '10px', width: '80px', height: '40px' }}
              />
              <div 
                data-demo="portfolio-button" 
                className="absolute opacity-0 pointer-events-none" 
                style={{ left: '300px', top: '10px', width: '80px', height: '40px' }}
              />
            </div>

            {/* Right side - User actions */}
            <div className="flex items-center space-x-4">
              <DemoButton className="hidden sm:flex" />
              <DemoResetButton className="hidden sm:flex" />
              <NotificationsDropdown />
              
              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'trader'}</p>
                </div>
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-300">
                    {user?.companyName?.charAt(0) || user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>

              {/* Sign Out */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        user={user || { id: '', role: 'trader', email: '', firstName: '', lastName: '', companyName: '' }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={`pt-16 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <main className="min-h-screen px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}