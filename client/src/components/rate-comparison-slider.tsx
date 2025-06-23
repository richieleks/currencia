import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatRate as utilFormatRate } from "@/lib/utils";

interface CurrencyRate {
  code: string;
  name: string;
  flag: string;
  rate: number;
  trend: "up" | "down" | "neutral";
  change: number;
  changePercent: number;
}

interface RateComparisonSliderProps {
  baseCurrency?: string;
}

export default function RateComparisonSlider({ baseCurrency = "USD" }: RateComparisonSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  
  const currencies: CurrencyRate[] = [
    {
      code: "UGX",
      name: "Ugandan Shilling",
      flag: "🇺🇬",
      rate: 3750.50,
      trend: "up",
      change: 5.30,
      changePercent: 0.14
    },
    {
      code: "KES",
      name: "Kenyan Shilling",
      flag: "🇰🇪",
      rate: 155.75,
      trend: "down",
      change: -0.45,
      changePercent: -0.29
    },
    {
      code: "EUR",
      name: "Euro",
      flag: "🇪🇺",
      rate: 0.92,
      trend: "up",
      change: 0.005,
      changePercent: 0.55
    },
    {
      code: "GBP",
      name: "British Pound",
      flag: "🇬🇧",
      rate: 0.79,
      trend: "neutral",
      change: 0,
      changePercent: 0
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % currencies.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, currencies.length]);

  const currentCurrency = currencies[currentIndex];
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const formatChange = (change: number, isPercent: boolean = false) => {
    const prefix = change > 0 ? "+" : "";
    if (isPercent) {
      return `${prefix}${change.toFixed(2)}%`;
    }
    return `${prefix}${change.toFixed(4)}`;
  };

  const formatRate = (rate: number) => {
    return rate.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Exchange Rates</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="text-xs"
          >
            {isAutoPlaying ? "Pause" : "Play"}
          </Button>
        </div>
        <CardDescription>
          Live rates vs {baseCurrency}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Main Rate Display */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🇺🇸</span>
                <span className="font-semibold">{baseCurrency}</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentCurrency.flag}</span>
                <span className="font-semibold">{currentCurrency.code}</span>
              </div>
            </div>
            
            <div className="text-3xl font-bold mb-1">
              {formatRate(currentCurrency.rate)}
            </div>
            
            <div className="text-sm text-muted-foreground mb-3">
              {currentCurrency.name}
            </div>
            
            <div className="flex items-center justify-center gap-2">
              {getTrendIcon(currentCurrency.trend)}
              <span className={`text-sm font-medium ${getTrendColor(currentCurrency.trend)}`}>
                {formatChange(currentCurrency.change)}
              </span>
              <Badge 
                variant={currentCurrency.trend === "up" ? "default" : currentCurrency.trend === "down" ? "destructive" : "secondary"}
                className="text-xs"
              >
                {formatChange(currentCurrency.changePercent, true)}
              </Badge>
            </div>
          </div>

          {/* Currency Indicators */}
          <div className="flex items-center justify-center gap-2">
            {currencies.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoPlaying(false);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex 
                    ? "bg-primary scale-125" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">24h High</div>
              <div className="font-semibold text-sm">
                {formatRate(currentCurrency.rate * 1.003)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">24h Low</div>
              <div className="font-semibold text-sm">
                {formatRate(currentCurrency.rate * 0.997)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}