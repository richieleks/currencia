import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Minus, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

const AVAILABLE_CURRENCIES = [
  { code: "UGX", name: "Ugandan Shilling", flag: "🇺🇬" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬" },
  { code: "EGP", name: "Egyptian Pound", flag: "🇪🇬" },
  { code: "MAD", name: "Moroccan Dirham", flag: "🇲🇦" },
  { code: "TZS", name: "Tanzanian Shilling", flag: "🇹🇿" },
  { code: "GHS", name: "Ghanaian Cedi", flag: "🇬🇭" },
  { code: "RWF", name: "Rwandan Franc", flag: "🇷🇼" },
];

interface PortfolioManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PortfolioManager({ isOpen, onClose }: PortfolioManagerProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addCurrencyMutation = useMutation({
    mutationFn: async (currency: string) => {
      return await apiRequest({
        url: "/api/user/portfolio/add",
        method: "POST",
        body: { currency },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Currency Added",
        description: "Currency has been added to your portfolio",
      });
      setSelectedCurrency("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add currency",
        variant: "destructive",
      });
    },
  });

  const removeCurrencyMutation = useMutation({
    mutationFn: async (currency: string) => {
      return await apiRequest({
        url: "/api/user/portfolio/remove",
        method: "POST",
        body: { currency },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Currency Removed",
        description: "Currency has been removed from your portfolio",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove currency",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const activeCurrencies = user.activeCurrencies || ["UGX", "USD", "KES", "EUR", "GBP"];
  const availableToAdd = AVAILABLE_CURRENCIES.filter(
    currency => !activeCurrencies.includes(currency.code)
  );

  const handleAddCurrency = () => {
    if (selectedCurrency) {
      addCurrencyMutation.mutate(selectedCurrency);
    }
  };

  const handleRemoveCurrency = (currency: string) => {
    if (activeCurrencies.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "You must have at least one currency in your portfolio",
        variant: "destructive",
      });
      return;
    }
    removeCurrencyMutation.mutate(currency);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Manage Currency Portfolio
          </DialogTitle>
          <DialogDescription>
            Add or remove currencies from your trading portfolio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Currency Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Currency</CardTitle>
              <CardDescription>
                Select a currency to add to your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select
                  value={selectedCurrency}
                  onValueChange={setSelectedCurrency}
                  disabled={availableToAdd.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue 
                      placeholder={
                        availableToAdd.length === 0 
                          ? "All currencies already added" 
                          : "Select a currency to add"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          <span>{currency.flag}</span>
                          <span>{currency.code}</span>
                          <span className="text-muted-foreground">- {currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddCurrency}
                  disabled={!selectedCurrency || addCurrencyMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Currencies Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Currencies</CardTitle>
              <CardDescription>
                Currencies currently tracked in your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {activeCurrencies.map((currencyCode) => {
                  const currency = AVAILABLE_CURRENCIES.find(c => c.code === currencyCode);
                  if (!currency) return null;
                  
                  return (
                    <div
                      key={currencyCode}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{currency.flag}</span>
                        <div>
                          <div className="font-medium">{currency.code}</div>
                          <div className="text-sm text-muted-foreground">
                            {currency.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Active</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveCurrency(currencyCode)}
                          disabled={activeCurrencies.length <= 1 || removeCurrencyMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total currencies in portfolio:</span>
                <Badge variant="outline">{activeCurrencies.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}