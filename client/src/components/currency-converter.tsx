import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const currencies = [
  { code: "UGX", name: "Ugandan Shilling", symbol: "UGX Sh" },
  { code: "USD", name: "US Dollar", symbol: "USD $" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KES Sh" },
  { code: "EUR", name: "Euro", symbol: "EUR €" },
  { code: "GBP", name: "British Pound", symbol: "GBP £" },
];

// Mock exchange rates - in a real app, this would come from an API
const exchangeRates: Record<string, Record<string, number>> = {
  UGX: {
    USD: 0.00028,
    KES: 0.10,
    EUR: 0.00025,
    GBP: 0.00022,
    UGX: 1
  },
  USD: {
    UGX: 3571.43,
    KES: 357.14,
    EUR: 0.89,
    GBP: 0.79,
    USD: 1
  },
  KES: {
    UGX: 10.0,
    USD: 0.0028,
    EUR: 0.0025,
    GBP: 0.0022,
    KES: 1
  },
  EUR: {
    UGX: 4000.0,
    USD: 1.12,
    KES: 400.0,
    GBP: 0.89,
    EUR: 1
  },
  GBP: {
    UGX: 4545.45,
    USD: 1.27,
    KES: 454.55,
    EUR: 1.12,
    GBP: 1
  }
};

export default function CurrencyConverter() {
  const [fromCurrency, setFromCurrency] = useState("UGX");
  const [toCurrency, setToCurrency] = useState("USD");
  const [fromAmount, setFromAmount] = useState("1");
  const [toAmount, setToAmount] = useState("0.00028");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Calculate conversion
  useEffect(() => {
    const rate = exchangeRates[fromCurrency]?.[toCurrency] || 0;
    const amount = parseFloat(fromAmount) || 0;
    const result = amount * rate;
    setToAmount(result.toFixed(6));
  }, [fromCurrency, toCurrency, fromAmount]);

  // Update timestamp periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
  };

  const handleToAmountChange = (value: string) => {
    setToAmount(value);
    // Calculate reverse conversion
    const rate = exchangeRates[toCurrency]?.[fromCurrency] || 0;
    const amount = parseFloat(value) || 0;
    const result = amount * rate;
    setFromAmount(result.toFixed(6));
  };

  const rate = exchangeRates[fromCurrency]?.[toCurrency] || 0;
  const fromCurrencyInfo = currencies.find(c => c.code === fromCurrency);
  const toCurrencyInfo = currencies.find(c => c.code === toCurrency);

  // Mock trend (in real app, this would be calculated from historical data)
  const trend = Math.random() > 0.5 ? "up" : "down";
  const changePercent = (Math.random() * 2).toFixed(2);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Currency Converter</CardTitle>
          <div className={`flex items-center text-sm ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
            {trend === "up" ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            {changePercent}%
          </div>
        </div>
        <div className="text-sm text-gray-600">
          1 {fromCurrencyInfo?.name} = {rate.toFixed(6)} {toCurrencyInfo?.name}
        </div>
        <div className="text-xs text-gray-500">
          Last updated - {lastUpdated.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })} at {lastUpdated.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })} UTC
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* From Currency */}
        <div className="space-y-2">
          <Select value={fromCurrency} onValueChange={setFromCurrency}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={fromAmount}
            onChange={(e) => handleFromAmountChange(e.target.value)}
            className="h-12 text-lg font-medium"
            step="0.01"
          />
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapCurrencies}
            className="rounded-full p-2"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>

        {/* To Currency */}
        <div className="space-y-2">
          <Select value={toCurrency} onValueChange={setToCurrency}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={toAmount}
            onChange={(e) => handleToAmountChange(e.target.value)}
            className="h-12 text-lg font-medium"
            step="0.01"
          />
        </div>

        {/* Exchange Rate Info */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-600 text-center">
            Exchange Rate: 1 {fromCurrency} = {rate.toFixed(6)} {toCurrency}
          </div>
          <div className="text-xs text-gray-500 text-center mt-1">
            Mid-market rate • No markup
          </div>
        </div>
      </CardContent>
    </Card>
  );
}