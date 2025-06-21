import ChatRoom from "@/components/chat-room";
import QuickExchangeForm from "@/components/quick-exchange-form";
import ActiveOffers from "@/components/active-offers";
import MarketStats from "@/components/market-stats";
import ConfirmationModal from "@/components/confirmation-modal";
import DemoBanner from "@/components/demo-banner";
import CurrencyBalanceDashboard from "@/components/currency-balance-dashboard";
import RateComparisonSlider from "@/components/rate-comparison-slider";

export default function TradingRoom() {
  return (
    <div>
      {/* Demo Banner */}
      <DemoBanner />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Currency Balance Dashboard */}
        <CurrencyBalanceDashboard />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Chat Section */}
          <div className="xl:col-span-2">
            <ChatRoom />
          </div>

          {/* Sidebar Section */}
          <div className="space-y-6">
            {/* Quick Exchange Form */}
            <QuickExchangeForm />
            
            {/* Rate Comparison Slider */}
            <RateComparisonSlider />
            
            {/* Market Stats */}
            <MarketStats />
            
            {/* Active Offers */}
            <ActiveOffers />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal />
    </div>
  );
}
