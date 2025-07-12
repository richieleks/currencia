import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import ChatRoomThreaded from "@/components/chat-room-threaded";
import QuickExchangeForm from "@/components/quick-exchange-form";
import ActiveOffers from "@/components/active-offers";
import MarketStats from "@/components/market-stats";
import ConfirmationModal from "@/components/confirmation-modal";
import DemoBanner from "@/components/demo-banner";
import CurrencyBalanceDashboard from "@/components/currency-balance-dashboard";
import RateComparisonSlider from "@/components/rate-comparison-slider";
import OnboardingDemo from "@/components/onboarding-demo";
import OffersCard from "@/components/offers-card";
import { ExchangeRequest, LayoutSetting } from "@shared/schema";

export default function TradingRoom() {
  const { user } = useAuth();
  const [showDemo, setShowDemo] = useState(false);
  const [selectedRequestForOffers, setSelectedRequestForOffers] = useState<ExchangeRequest | null>(null);

  // Fetch active layout setting
  const { data: layoutSetting } = useQuery<LayoutSetting>({
    queryKey: ["/api/layout-settings/active"],
  });

  // Use default 50/50 layout if no setting is found
  const chatSpan = layoutSetting?.chatColumnSpan || 2;
  const sidebarSpan = layoutSetting?.sidebarColumnSpan || 2;

  // Debug layout values
  console.log("Layout setting:", layoutSetting);
  console.log("Chat span:", chatSpan, "Sidebar span:", sidebarSpan);

  // Map column spans to Tailwind classes
  const getColumnClasses = (span: number) => {
    const classMap: Record<number, string> = {
      1: "lg:col-span-1",
      2: "lg:col-span-2", 
      3: "lg:col-span-3",
      4: "lg:col-span-4"
    };
    return classMap[span] || "lg:col-span-2";
  };

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
      <div className="py-4 sm:py-6">
        {/* Currency Balance Dashboard */}
        <CurrencyBalanceDashboard />

        <div className={`grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 mt-6`}>
          {/* Chat Section */}
          <div className={`order-2 lg:order-1 ${getColumnClasses(chatSpan)}`} data-demo="chat-room">
            {/* Offers Card - appears above chat when a request is selected */}
            {selectedRequestForOffers && (
              <div className="mb-4">
                <OffersCard
                  exchangeRequest={selectedRequestForOffers}
                  onClose={() => setSelectedRequestForOffers(null)}
                />
              </div>
            )}
            <ChatRoomThreaded />
          </div>

          {/* Sidebar Section */}
          <div className={`space-y-4 lg:space-y-6 order-1 lg:order-2 ${getColumnClasses(sidebarSpan)}`}>
            {/* Active Offers */}
            <div data-demo="active-requests">
              <ActiveOffers onRequestSelect={setSelectedRequestForOffers} />
            </div>
            
            {/* Quick Exchange Form */}
            <div data-demo="exchange-form">
              <QuickExchangeForm />
            </div>
            
            {/* Rate Comparison Slider */}
            <div className="hidden sm:block">
              <RateComparisonSlider />
            </div>
            
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
