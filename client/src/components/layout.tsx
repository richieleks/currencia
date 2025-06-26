import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Menu, Bell, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import NotificationsDropdown from "@/components/notifications-dropdown";

import DemoButton from "@/components/demo-button";

interface LayoutProps {
  children: React.ReactNode;
  user: User;
}

export default function Layout({ children, user }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Trading Room";
      case "/trades":
        return "My Trades";
      case "/profile":
        return "Trader Profile";
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
              <NotificationsDropdown />
              
              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.companyName || `${user.firstName} ${user.lastName}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                </div>
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-300">
                    {user.companyName?.charAt(0) || user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      {/* Main Content */}
      <div className="lg:pl-64 pt-16">
        <main className="min-h-screen">
          {children}
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