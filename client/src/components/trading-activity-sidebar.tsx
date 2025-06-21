import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Home, 
  ArrowLeftRight, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  BarChart3,
  Filter,
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface TradingSidebarProps {
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export default function TradingActivitySidebar({ activeFilter, onFilterChange }: TradingSidebarProps) {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");

  const { data: trades } = useQuery({
    queryKey: ["/api/user/trades"],
    staleTime: 30000,
  });

  const { data: transactions } = useQuery({
    queryKey: ["/api/user/transactions"],
    staleTime: 30000,
  });

  if (!user) return null;

  const allTrades = [
    ...(trades?.completedRequests || []).map(req => ({ ...req, type: 'request' as const })),
    ...(trades?.completedOffers || []).map(offer => ({ ...offer, type: 'offer' as const }))
  ];

  const totalTrades = allTrades.length;
  const totalTransactions = transactions?.length || 0;
  
  const thisMonthTrades = allTrades.filter(trade => {
    const tradeDate = new Date(trade.createdAt);
    const now = new Date();
    return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
  }).length;

  // Calculate volume per currency
  const volumeByCurrency = allTrades.reduce((acc, trade) => {
    const fromCurrency = trade.fromCurrency?.toUpperCase() || '';
    const toCurrency = trade.toCurrency?.toUpperCase() || '';
    const fromAmount = parseFloat(trade.amount || '0');
    const toAmount = parseFloat(trade.finalAmount || trade.totalAmount || '0');
    
    if (!isNaN(fromAmount) && fromCurrency) {
      acc[fromCurrency] = (acc[fromCurrency] || 0) + fromAmount;
    }
    if (!isNaN(toAmount) && toCurrency && fromCurrency !== toCurrency) {
      acc[toCurrency] = (acc[toCurrency] || 0) + toAmount;
    }
    
    return acc;
  }, {} as Record<string, number>);

  const totalVolume = Object.values(volumeByCurrency).reduce((sum, amount) => sum + amount, 0);
  const topCurrency = Object.entries(volumeByCurrency).sort(([,a], [,b]) => b - a)[0];

  const quickStats = [
    {
      title: "Total Trades",
      value: totalTrades.toString(),
      icon: ArrowLeftRight,
      color: "text-blue-600"
    },
    {
      title: "This Month",
      value: thisMonthTrades.toString(),
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "Transactions",
      value: totalTransactions.toString(),
      icon: DollarSign,
      color: "text-purple-600"
    },
    {
      title: "Total Volume",
      value: topCurrency ? `${topCurrency[1].toLocaleString()} ${topCurrency[0]}` : "No data",
      icon: BarChart3,
      color: "text-orange-600"
    }
  ];

  const filterOptions = [
    { id: "all", label: "All Activity", icon: BarChart3 },
    { id: "completed", label: "Completed", icon: TrendingUp },
    { id: "requests", label: "My Requests", icon: ArrowLeftRight },
    { id: "offers", label: "My Offers", icon: Clock },
    { id: "this-month", label: "This Month", icon: Calendar },
  ];

  const timeframes = [
    { id: "all", label: "All Time" },
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "Last 30 Days" },
    { id: "90d", label: "Last 90 Days" },
    { id: "1y", label: "Last Year" },
  ];

  return (
    <div className="w-80 bg-background border-r border-border p-6 space-y-6">
      

      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickStats.map((stat) => (
            <div key={stat.title} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.title}</span>
              </div>
              <span className="text-sm font-medium">{stat.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => onFilterChange?.(option.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                activeFilter === option.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Timeframe */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeframe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe.id}
              onClick={() => setSelectedTimeframe(timeframe.id)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                selectedTimeframe === timeframe.id 
                  ? 'bg-muted font-medium' 
                  : 'hover:bg-muted'
              }`}
            >
              {timeframe.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Volume by Currency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Volume by Currency</CardTitle>
          <CardDescription className="text-xs">
            Trading volume breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(volumeByCurrency).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(volumeByCurrency)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 4)
                .map(([currency, amount]) => (
                  <div key={currency} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {currency === 'UGX' ? '🇺🇬' : 
                         currency === 'USD' ? '🇺🇸' :
                         currency === 'KES' ? '🇰🇪' :
                         currency === 'EUR' ? '🇪🇺' :
                         currency === 'GBP' ? '🇬🇧' : '💱'}
                      </span>
                      <span className="font-medium">{currency}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Intl.NumberFormat('en-US', {
                        notation: 'compact',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      }).format(amount)}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No volume data</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Activity</CardTitle>
          <CardDescription className="text-xs">
            Last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allTrades.length > 0 ? (
            <div className="space-y-2">
              {allTrades.slice(0, 3).map((trade, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {trade.type === 'request' ? 'REQ' : 'OFF'}
                    </Badge>
                    <span className="text-muted-foreground">
                      {trade.fromCurrency}/{trade.toCurrency}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {format(new Date(trade.createdAt), 'MMM d')}
                  </span>
                </div>
              ))}
              {allTrades.length > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  +{allTrades.length - 3} more
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}