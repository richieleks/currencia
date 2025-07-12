import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import ChatRoomThreaded from "@/components/chat-room-threaded";
import QuickExchangeForm from "@/components/quick-exchange-form";
import ActiveOffers from "@/components/active-offers";
import MarketStats from "@/components/market-stats";
import ConfirmationModal from "@/components/confirmation-modal";
import DemoBanner from "@/components/demo-banner";
import CurrencyBalanceDashboard from "@/components/currency-balance-dashboard";
import RateComparisonSlider from "@/components/rate-comparison-slider";
import OnboardingDemo from "@/components/onboarding-demo";

export default function TradingRoom() {
  const { user } = useAuth();
  const [showDemo, setShowDemo] = useState(false);

  // Check if user is new and should see the demo automatically
  useEffect(() => {
    if (user) {
      const hasSeenDemo = localStorage.getItem(`demo_completed_${user.id}`);
      if (!hasSeenDemo) {
        // Show demo after a short delay to let the page load
        setTimeout(() => setShowDemo(true), 1500);
      }
    }
  }, [user]);

  const handleDemoComplete = () => {
    if (user) {
      localStorage.setItem(`demo_completed_${user.id}`, "true");
    }
    setShowDemo(false);
  };
  return (
    <div>
      {/* Demo Banner - only for first-time users */}
      <DemoBanner />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Currency Balance Dashboard */}
        <CurrencyBalanceDashboard />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Chat Section */}
          <div className="xl:col-span-2" data-demo="chat-room">
            <ChatRoomThreaded />
          </div>

          {/* Sidebar Section */}
          <div className="space-y-6">
            {/* Active Offers */}
            <div data-demo="active-requests">
              <ActiveOffers />
            </div>
            
            {/* Quick Exchange Form */}
            <div data-demo="exchange-form">
              <QuickExchangeForm />
            </div>
            
            {/* Rate Comparison Slider */}
            <RateComparisonSlider />
            
            {/* Market Stats */}
            <div data-demo="market-stats">
              <MarketStats />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal />

      {/* Onboarding Demo */}
      <OnboardingDemo
        isOpen={showDemo}
        onClose={() => setShowDemo(false)}
        onComplete={handleDemoComplete}
      />
    </div>
  );
}
