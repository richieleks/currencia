import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface CurrencyData {
  code: string;
  name: string;
  balance: string;
  trend: "up" | "down" | "neutral";
  change: string;
  flag: string;
}

export default function CurrencyBalanceDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const currencies: CurrencyData[] = [
    {
      code: "UGX",
      name: "Ugandan Shilling",
      balance: user.ugxBalance || "0.00",
      trend: "up",
      change: "+2.5%",
      flag: "🇺🇬"
    },
    {
      code: "USD",
      name: "US Dollar",
      balance: user.usdBalance || "0.00",
      trend: "neutral",
      change: "0.0%",
      flag: "🇺🇸"
    },
    {
      code: "KES",
      name: "Kenyan Shilling",
      balance: user.kesBalance || "0.00",
      trend: "down",
      change: "-1.2%",
      flag: "🇰🇪"
    },
    {
      code: "EUR",
      name: "Euro",
      balance: user.eurBalance || "0.00",
      trend: "up",
      change: "+0.8%",
      flag: "🇪🇺"
    },
    {
      code: "GBP",
      name: "British Pound",
      balance: user.gbpBalance || "0.00",
      trend: "up",
      change: "+1.4%",
      flag: "🇬🇧"
    }
  ];

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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Wallet className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-black dark:text-white">Currency Portfolio</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Portfolio Value</p>
          <p className="text-lg font-bold text-black dark:text-white">UGX {getTotalPortfolioValue()}</p>
        </div>
      </div>

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
    </div>
  );
}