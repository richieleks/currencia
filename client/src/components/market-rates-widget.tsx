import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, BarChart3, Users, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const POPULAR_PAIRS = [
  { from: "USD", to: "UGX", label: "USD/UGX" },
  { from: "EUR", to: "UGX", label: "EUR/UGX" },
  { from: "GBP", to: "UGX", label: "GBP/UGX" },
  { from: "USD", to: "KES", label: "USD/KES" },
  { from: "EUR", to: "USD", label: "EUR/USD" },
  { from: "GBP", to: "USD", label: "GBP/USD" },
];

interface MarketRatesSummary {
  highestBuyRate: string | null;
  lowestBuyRate: string | null;
  highestSellRate: string | null;
  lowestSellRate: string | null;
  totalTraders: number;
  lastUpdated: string | null;
}

export default function MarketRatesWidget() {
  const [selectedPair, setSelectedPair] = useState(POPULAR_PAIRS[0]);

  // Fetch market rates summary for selected currency pair
  const { data: marketSummary, isLoading, refetch, isRefetching } = useQuery<MarketRatesSummary>({
    queryKey: ["/api/market-rates", selectedPair.from, selectedPair.to],
    refetchInterval: 60000, // Refresh every minute
  });

  const formatRate = (rate: string | null) => {
    if (!rate) return "N/A";
    return parseFloat(rate).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(parseInt(timestamp));
    return date.toLocaleTimeString();
  };

  const getSpread = () => {
    if (!marketSummary?.highestBuyRate || !marketSummary?.lowestSellRate) return null;
    const spread = ((parseFloat(marketSummary.lowestSellRate) - parseFloat(marketSummary.highestBuyRate)) / parseFloat(marketSummary.highestBuyRate) * 100);
    return spread.toFixed(2);
  };

  const hasData = marketSummary && marketSummary.totalTraders > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Market Rates Insights
            </CardTitle>
            <CardDescription>
              Real-time highest and lowest rates from all traders
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Currency Pair Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Currency Pair</label>
          <Select
            value={`${selectedPair.from}-${selectedPair.to}`}
            onValueChange={(value) => {
              const [from, to] = value.split('-');
              const pair = POPULAR_PAIRS.find(p => p.from === from && p.to === to);
              if (pair) setSelectedPair(pair);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_PAIRS.map((pair) => (
                <SelectItem key={`${pair.from}-${pair.to}`} value={`${pair.from}-${pair.to}`}>
                  {pair.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading market data...</p>
          </div>
        ) : !hasData ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              No Market Data
            </h3>
            <p className="text-sm text-gray-500">
              No rates available for {selectedPair.label} today
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Market Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    Highest Buy Rate
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatRate(marketSummary.highestBuyRate)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Best rate to sell {selectedPair.from}
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    Lowest Sell Rate
                  </span>
                </div>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {formatRate(marketSummary.lowestSellRate)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Best rate to buy {selectedPair.from}
                </p>
              </div>
            </div>

            {/* Additional Market Info */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Active Traders</span>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {marketSummary.totalTraders}
                </Badge>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Market Spread</span>
                </div>
                <Badge 
                  variant={getSpread() && parseFloat(getSpread()!) > 2 ? "destructive" : "outline"}
                  className="text-lg px-3 py-1"
                >
                  {getSpread() ? `${getSpread()}%` : "N/A"}
                </Badge>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Last Updated</span>
                </div>
                <Badge variant="outline" className="text-sm px-2 py-1">
                  {formatLastUpdated(marketSummary.lastUpdated)}
                </Badge>
              </div>
            </div>

            {/* Market Analysis */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Market Analysis
              </h4>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <div className="flex justify-between">
                  <span>Range (Buy):</span>
                  <span className="font-mono">
                    {formatRate(marketSummary.lowestBuyRate)} - {formatRate(marketSummary.highestBuyRate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Range (Sell):</span>
                  <span className="font-mono">
                    {formatRate(marketSummary.lowestSellRate)} - {formatRate(marketSummary.highestSellRate)}
                  </span>
                </div>
                {getSpread() && (
                  <div className="flex justify-between">
                    <span>Best Spread:</span>
                    <span className="font-mono">{getSpread()}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}