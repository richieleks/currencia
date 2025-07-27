import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, Settings } from "lucide-react";

interface CurrencyData {
  code: string;
  name: string;
  balance: string;
  trend: "up" | "down" | "neutral";
  change: string;
  flag: string;
}

interface BankAccount {
  id: number;
  currency: string;
  balance: string;
  availableBalance: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
}

const ALL_CURRENCIES = {
  UGX: { name: "Ugandan Shilling", flag: "🇺🇬", balanceField: "ugxBalance" },
  USD: { name: "US Dollar", flag: "🇺🇸", balanceField: "usdBalance" },
  KES: { name: "Kenyan Shilling", flag: "🇰🇪", balanceField: "kesBalance" },
  EUR: { name: "Euro", flag: "🇪🇺", balanceField: "eurBalance" },
  GBP: { name: "British Pound", flag: "🇬🇧", balanceField: "gbpBalance" },
  JPY: { name: "Japanese Yen", flag: "🇯🇵", balanceField: "balance" },
  CAD: { name: "Canadian Dollar", flag: "🇨🇦", balanceField: "balance" },
  AUD: { name: "Australian Dollar", flag: "🇦🇺", balanceField: "balance" },
  CHF: { name: "Swiss Franc", flag: "🇨🇭", balanceField: "balance" },
  CNY: { name: "Chinese Yuan", flag: "🇨🇳", balanceField: "balance" },
  INR: { name: "Indian Rupee", flag: "🇮🇳", balanceField: "balance" },
  ZAR: { name: "South African Rand", flag: "🇿🇦", balanceField: "balance" },
  NGN: { name: "Nigerian Naira", flag: "🇳🇬", balanceField: "balance" },
  EGP: { name: "Egyptian Pound", flag: "🇪🇬", balanceField: "balance" },
  MAD: { name: "Moroccan Dirham", flag: "🇲🇦", balanceField: "balance" },
  TZS: { name: "Tanzanian Shilling", flag: "🇹🇿", balanceField: "balance" },
  GHS: { name: "Ghanaian Cedi", flag: "🇬🇭", balanceField: "balance" },
  RWF: { name: "Rwandan Franc", flag: "🇷🇼", balanceField: "balance" },
};

export default function CurrencyBalanceDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch bank accounts data
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["/api/bank-accounts"],
    enabled: !!user,
  });

  if (!user) return null;

  // Calculate aggregated currency holdings from bank accounts
  const getAggregatedCurrencies = () => {
    const currencyMap = new Map<string, {
      currency: string;
      totalBalance: number;
      availableBalance: number;
      accountCount: number;
    }>();

    bankAccounts.forEach((account) => {
      const currency = account.currency;
      const existing = currencyMap.get(currency);
      
      if (existing) {
        existing.totalBalance += parseFloat(account.balance);
        existing.availableBalance += parseFloat(account.availableBalance);
        existing.accountCount += 1;
      } else {
        currencyMap.set(currency, {
          currency,
          totalBalance: parseFloat(account.balance),
          availableBalance: parseFloat(account.availableBalance),
          accountCount: 1,
        });
      }
    });

    return Array.from(currencyMap.values()).sort((a, b) => a.currency.localeCompare(b.currency));
  };

  const aggregatedCurrencies = getAggregatedCurrencies();
  const activeCurrencies = user.activeCurrencies || ["UGX", "USD", "KES", "EUR", "GBP"];
  
  // Only show currencies from bank accounts
  const currencies: CurrencyData[] = aggregatedCurrencies
    .filter(curr => activeCurrencies.includes(curr.currency))
    .map(curr => ({
      code: curr.currency,
      name: ALL_CURRENCIES[curr.currency as keyof typeof ALL_CURRENCIES]?.name || curr.currency,
      balance: curr.totalBalance.toString(),
      trend: "up" as const,
      change: "+2.5%",
      flag: ALL_CURRENCIES[curr.currency as keyof typeof ALL_CURRENCIES]?.flag || "💱"
    }));

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const getTotalPortfolioValue = () => {
    // Convert all to UGX for total calculation (using approximate rates)
    const rates = { UGX: 1, USD: 3700, KES: 28.5, EUR: 4033, GBP: 4700 };
    
    const total = currencies.reduce((sum, currency) => {
      const balance = parseFloat(currency.balance);
      const rate = rates[currency.code as keyof typeof rates] || 1;
      return sum + (balance * rate);
    }, 0);
    
    return formatBalance(total.toString());
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-black dark:text-white">Currency Portfolio</h2>
          </div>
          <div className="flex items-center gap-3">
            {currencies.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Portfolio Value</p>
                <p className="text-lg font-bold text-black dark:text-white">UGX {getTotalPortfolioValue()}</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/settings")}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage
            </Button>
          </div>
        </div>

        {currencies.length === 0 ? (
          <Card className="p-8">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Wallet className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No currencies added yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Connect your bank accounts to start tracking your currency portfolio
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/settings")}
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {currencies.map((currency) => (
              <Card key={currency.code} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{currency.flag}</span>
                      <div>
                        <h3 className="font-semibold text-sm text-black dark:text-white">{currency.code}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{currency.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {currency.trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
                      {currency.trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
                      <Badge 
                        variant={currency.trend === "up" ? "default" : currency.trend === "down" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {currency.change}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-black dark:text-white">
                      {formatBalance(currency.balance)}
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min((parseFloat(currency.balance) / 50000) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}