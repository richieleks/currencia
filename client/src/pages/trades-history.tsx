import TradesHistory from "@/components/trades-history";

export default function TradesHistoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Trading Activity</h1>
          <p className="text-muted-foreground mt-2">
            View your completed trades and transaction history
          </p>
        </div>
        <TradesHistory />
      </div>
    </div>
  );
}