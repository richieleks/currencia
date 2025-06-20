import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Clock, TrendingUp, TrendingDown, ExternalLink, CreditCard, Receipt } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: number;
  type: "debit" | "credit";
  amount: string;
  description: string;
  exchangeRequestId?: number;
  createdAt: string;
  exchangeRequest?: {
    id: number;
    fromCurrency: string;
    toCurrency: string;
    amount: string;
    status: string;
  };
}

interface CompletedRequest {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  desiredRate?: string;
  priority: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    role: string;
  };
  acceptedOffer?: {
    id: number;
    rate: string;
    totalAmount: string;
    status: string;
    createdAt: string;
    bidder: {
      id: string;
      firstName: string | null;
      role: string;
    };
  };
}

interface CompletedOffer {
  id: number;
  rate: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  bidder: {
    id: string;
    firstName: string | null;
    role: string;
  };
  exchangeRequest: {
    id: number;
    fromCurrency: string;
    toCurrency: string;
    amount: string;
    status: string;
    user: {
      id: string;
      firstName: string | null;
      role: string;
    };
  };
}

interface TradesData {
  completedRequests: CompletedRequest[];
  completedOffers: CompletedOffer[];
}

const currencyNames: Record<string, string> = {
  UGX: "Ugandan Shilling",
  USD: "US Dollar",
  KES: "Kenyan Shilling",
  EUR: "Euro",
  GBP: "British Pound",
};

const currencyFlags: Record<string, string> = {
  UGX: "🇺🇬",
  USD: "🇺🇸",
  KES: "🇰🇪",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
};

interface TradesHistoryProps {
  activeFilter?: string;
}

export default function TradesHistory({ activeFilter = "all" }: TradesHistoryProps) {
  const [activeTab, setActiveTab] = useState("trades");

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/user/transactions"],
    staleTime: 30000,
  });

  const { data: trades, isLoading: tradesLoading } = useQuery<TradesData>({
    queryKey: ["/api/user/trades"],
    staleTime: 30000,
  });

  const formatCurrency = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'UGX' ? 'USD' : currency,
      minimumFractionDigits: currency === 'UGX' ? 0 : 2,
    }).format(num);
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: "bg-red-500 hover:bg-red-600",
      high: "bg-orange-500 hover:bg-orange-600",
      normal: "bg-blue-500 hover:bg-blue-600",
      low: "bg-gray-500 hover:bg-gray-600",
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: "bg-green-500 hover:bg-green-600",
      accepted: "bg-green-500 hover:bg-green-600",
      active: "bg-blue-500 hover:bg-blue-600",
      cancelled: "bg-gray-500 hover:bg-gray-600",
      rejected: "bg-red-500 hover:bg-red-600",
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const allTrades = [
    ...(trades?.completedRequests || []).map(req => ({
      ...req,
      type: 'request' as const,
      counterparty: req.acceptedOffer?.bidder?.firstName || 'Unknown',
      rate: req.acceptedOffer?.rate,
      finalAmount: req.acceptedOffer?.totalAmount,
    })),
    ...(trades?.completedOffers || []).map(offer => ({
      ...offer,
      type: 'offer' as const,
      counterparty: offer.exchangeRequest.user.firstName || 'Unknown',
      fromCurrency: offer.exchangeRequest.fromCurrency,
      toCurrency: offer.exchangeRequest.toCurrency,
      amount: offer.exchangeRequest.amount,
      finalAmount: offer.totalAmount,
      priority: 'normal',
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply filters based on activeFilter
  const filteredTrades = allTrades.filter(trade => {
    if (activeFilter === "all") return true;
    if (activeFilter === "completed") return trade.status === "completed" || trade.status === "accepted";
    if (activeFilter === "requests") return trade.type === "request";
    if (activeFilter === "offers") return trade.type === "offer";
    if (activeFilter === "this-month") {
      const tradeDate = new Date(trade.createdAt);
      const now = new Date();
      return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const filteredTransactions = transactions?.filter(transaction => {
    if (activeFilter === "all") return true;
    if (activeFilter === "this-month") {
      const transactionDate = new Date(transaction.createdAt);
      const now = new Date();
      return transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear();
    }
    return true;
  }) || [];

  if (transactionsLoading || tradesLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate volume per currency
  const volumeByCurrency = filteredTrades.reduce((acc, trade) => {
    const fromCurrency = trade.fromCurrency.toUpperCase();
    const toCurrency = trade.toCurrency.toUpperCase();
    const fromAmount = parseFloat(trade.amount || '0');
    const toAmount = parseFloat(trade.finalAmount || trade.totalAmount || '0');
    
    if (!isNaN(fromAmount)) {
      acc[fromCurrency] = (acc[fromCurrency] || 0) + fromAmount;
    }
    if (!isNaN(toAmount) && fromCurrency !== toCurrency) {
      acc[toCurrency] = (acc[toCurrency] || 0) + toAmount;
    }
    
    return acc;
  }, {} as Record<string, number>);

  const totalVolume = Object.values(volumeByCurrency).reduce((sum, amount) => sum + amount, 0);

  const successfulTrades = filteredTrades.filter(trade => 
    trade.status === 'completed' || trade.status === 'accepted'
  ).length;

  const totalTransactions = filteredTransactions.length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successfulTrades}</div>
            <p className="text-xs text-muted-foreground">
              Completed exchanges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Volume</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(volumeByCurrency)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([currency, amount]) => (
                  <div key={currency} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {currencyFlags[currency] || '💱'}
                      </span>
                      <span className="text-sm font-medium">{currency}</span>
                    </div>
                    <span className="text-sm font-bold">
                      {new Intl.NumberFormat('en-US', {
                        notation: 'compact',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      }).format(amount)}
                    </span>
                  </div>
                ))}
              {Object.keys(volumeByCurrency).length === 0 && (
                <p className="text-xs text-muted-foreground">No volume data</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Account activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trades">Trading History</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading History</CardTitle>
              <CardDescription>
                Your completed currency exchanges and rate offers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed trades yet</p>
                  <p className="text-sm">Start by creating an exchange request or placing offers</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTrades.map((trade, index) => (
                    <div key={`${trade.type}-${trade.id}-${index}`} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {currencyFlags[trade.fromCurrency.toUpperCase()]}
                            </span>
                            <span className="font-medium">{trade.fromCurrency.toUpperCase()}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-lg">
                              {currencyFlags[trade.toCurrency.toUpperCase()]}
                            </span>
                            <span className="font-medium">{trade.toCurrency.toUpperCase()}</span>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={trade.type === 'request' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'}
                          >
                            {trade.type === 'request' ? 'My Request' : 'My Offer'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-white ${getStatusBadge(trade.status)}`}>
                            {trade.status}
                          </Badge>
                          <Badge className={`text-white ${getPriorityBadge(trade.priority)}`}>
                            {trade.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-medium">
                            {formatCurrency(trade.amount, trade.fromCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Rate</p>
                          <p className="font-medium">
                            {trade.rate ? `${parseFloat(trade.rate).toFixed(4)}` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Final Amount</p>
                          <p className="font-medium">
                            {trade.finalAmount ? formatCurrency(trade.finalAmount, trade.toCurrency) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Counterparty</p>
                          <p className="font-medium">{trade.counterparty}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(new Date(trade.createdAt), 'PPp')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Your account debits and credits from completed trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!filteredTransactions || filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Transactions will appear here after completing trades</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            transaction.type === 'credit' 
                              ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                              : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                          }`}>
                            {transaction.type === 'credit' ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.createdAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }).format(parseFloat(transaction.amount))}
                          </p>
                          {transaction.exchangeRequest && (
                            <p className="text-xs text-muted-foreground">
                              {transaction.exchangeRequest.fromCurrency} → {transaction.exchangeRequest.toCurrency}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}