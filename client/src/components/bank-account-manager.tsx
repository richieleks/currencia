import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  CreditCard, 
  Plus, 
  RefreshCw, 
  Building2, 
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Settings
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const bankAccountSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(5, "Account number must be at least 5 characters"),
  bankName: z.string().min(1, "Bank name is required"),
  bankCode: z.string().optional(),
  swiftCode: z.string().optional(),
  routingNumber: z.string().optional(),
  iban: z.string().optional(),
  accountType: z.enum(["checking", "savings", "business", "investment", "forex"]),
  currency: z.string().length(3, "Currency must be 3 characters"),
  balance: z.string().default("0.00"),
  availableBalance: z.string().default("0.00"),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccount {
  id: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  swiftCode?: string;
  routingNumber?: string;
  iban?: string;
  accountType: string;
  currency: string;
  balance: string;
  availableBalance: string;
  isActive: boolean;
  isPrimary: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CurrencyHolding {
  id: number;
  currency: string;
  totalBalance: string;
  availableBalance: string;
  reservedBalance: string;
  accountCount: number;
  lastUpdated: string;
}

interface BankTransaction {
  id: number;
  externalTransactionId: string;
  amount: string;
  currency: string;
  transactionType: string;
  description?: string;
  transactionDate: string;
  createdAt: string;
}

const currencies = [
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD",
  "UGX", "KES", "TZS", "RWF", "ETB", "NGN", "GHS", "ZAR",
  "EGP", "MAD"
];

export default function BankAccountManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountType: "checking",
      currency: "USD",
      balance: "0.00",
      availableBalance: "0.00",
    },
  });

  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ["/api/bank-accounts"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: currencyHoldings = [], isLoading: holdingsLoading } = useQuery<CurrencyHolding[]>({
    queryKey: ["/api/currency-holdings"],
    refetchInterval: 30000,
  });

  const { data: bankTransactions = [], isLoading: transactionsLoading } = useQuery<BankTransaction[]>({
    queryKey: ["/api/bank-transactions"],
    refetchInterval: 60000, // Refresh every minute
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      const response = await apiRequest("POST", "/api/bank-accounts", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currency-holdings"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Bank account added",
        description: "Your bank account has been successfully added and will sync shortly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add bank account",
        variant: "destructive",
      });
    },
  });

  const syncAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest("POST", `/api/bank-accounts/${accountId}/sync`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currency-holdings"] });
      toast({
        title: "Account synced",
        description: "Bank account balance has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync bank account",
        variant: "destructive",
      });
    },
  });

  const syncAllAccountsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/bank-accounts/sync-all");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currency-holdings"] });
      toast({
        title: "All accounts synced",
        description: "All bank account balances have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync all accounts",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest("DELETE", `/api/bank-accounts/${accountId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currency-holdings"] });
      toast({
        title: "Account deleted",
        description: "Bank account has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bank account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BankAccountFormData) => {
    createAccountMutation.mutate(data);
  };

  // Remove local formatCurrency - we'll use the one from utils

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "business":
        return <Building2 className="h-4 w-4" />;
      case "investment":
        return <TrendingUp className="h-4 w-4" />;
      case "forex":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const renderBankAccounts = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Bank Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Manage your connected bank accounts and sync balances
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBalances(!showBalances)}
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncAllAccountsMutation.mutate()}
            disabled={syncAllAccountsMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${syncAllAccountsMutation.isPending ? 'animate-spin' : ''}`} />
            Sync All
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Bank Account</DialogTitle>
                <DialogDescription>
                  Connect a new bank account to sync your currency balances.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      {...form.register("accountName")}
                      placeholder="My Checking Account"
                    />
                    {form.formState.errors.accountName && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.accountName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select onValueChange={(value) => form.setValue("currency", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    {...form.register("bankName")}
                    placeholder="Chase Bank"
                  />
                  {form.formState.errors.bankName && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.bankName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    {...form.register("accountNumber")}
                    placeholder="1234567890"
                  />
                  {form.formState.errors.accountNumber && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.accountNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select onValueChange={(value: any) => form.setValue("accountType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="forex">Forex Trading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="swiftCode">SWIFT Code (Optional)</Label>
                    <Input
                      id="swiftCode"
                      {...form.register("swiftCode")}
                      placeholder="CHASUS33"
                    />
                  </div>
                  <div>
                    <Label htmlFor="routingNumber">Routing Number (Optional)</Label>
                    <Input
                      id="routingNumber"
                      {...form.register("routingNumber")}
                      placeholder="021000021"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAccountMutation.isPending}>
                    {createAccountMutation.isPending ? "Adding..." : "Add Account"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {accountsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bankAccounts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Bank Accounts</h3>
            <p className="text-muted-foreground mb-4">
              Add your first bank account to start tracking currency balances.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bankAccounts.map((account) => (
            <Card key={account.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getAccountTypeIcon(account.accountType)}
                    {account.accountName}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {account.isPrimary && (
                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                    )}
                    <Badge variant={account.isActive ? "default" : "secondary"} className="text-xs">
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  {account.bankName} • {account.currency} • ****{account.accountNumber.slice(-4)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => syncAccountMutation.mutate(account.id)}
                        disabled={syncAccountMutation.isPending}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncAccountMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <p className="text-2xl font-bold">
                      {showBalances ? formatCurrency(account.balance, account.currency) : "••••••"}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Available</span>
                    <p className="text-lg font-semibold text-green-600">
                      {showBalances ? formatCurrency(account.availableBalance, account.currency) : "••••••"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last sync: {formatLastSync(account.lastSyncedAt)}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {account.lastSyncedAt ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedAccount(account)}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Calculate aggregated currency holdings from bank accounts
  const getAggregatedCurrencies = () => {
    const currencyMap = new Map<string, {
      currency: string;
      totalBalance: number;
      availableBalance: number;
      accountCount: number;
      lastUpdated: string | null;
    }>();

    bankAccounts.forEach(account => {
      const currency = account.currency;
      const existing = currencyMap.get(currency);
      
      if (existing) {
        existing.totalBalance += parseFloat(account.balance);
        existing.availableBalance += parseFloat(account.availableBalance);
        existing.accountCount += 1;
        // Use the most recent update time
        if (account.lastSyncedAt && (!existing.lastUpdated || account.lastSyncedAt > existing.lastUpdated)) {
          existing.lastUpdated = account.lastSyncedAt || null;
        }
      } else {
        currencyMap.set(currency, {
          currency,
          totalBalance: parseFloat(account.balance),
          availableBalance: parseFloat(account.availableBalance),
          accountCount: 1,
          lastUpdated: account.lastSyncedAt || null
        });
      }
    });

    return Array.from(currencyMap.values()).sort((a, b) => a.currency.localeCompare(b.currency));
  };

  const renderCurrencyHoldings = () => {
    const aggregatedCurrencies = getAggregatedCurrencies();
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Currency Portfolio</h3>
          <p className="text-sm text-muted-foreground">
            Aggregated view of your currency balances across all bank accounts
          </p>
        </div>

        {accountsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : aggregatedCurrencies.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Currency Holdings</h3>
              <p className="text-muted-foreground">
                Add bank accounts to see your currency portfolio.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Total Portfolio Value Header */}
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border">
              <div>
                <h3 className="text-lg font-semibold">Total Portfolio Value</h3>
                <p className="text-sm text-muted-foreground">Aggregated across all currencies</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {showBalances ? 
                    `${aggregatedCurrencies.reduce((total, curr) => total + curr.totalBalance, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Multi-Currency` : 
                    "••••••••••"
                  }
                </p>
                <Button variant="ghost" size="sm" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Manage
                </Button>
              </div>
            </div>

            {/* Currency Holdings Grid - matching the attached image layout */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {aggregatedCurrencies.map((holding, index) => {
                const totalPortfolioValue = aggregatedCurrencies.reduce((total, curr) => total + curr.totalBalance, 0);
                const percentage = totalPortfolioValue > 0 ? (holding.totalBalance / totalPortfolioValue) * 100 : 0;
                
                // Generate mock percentage gains (in a real app, this would come from historical data)
                const gainPercentages = [2.5, 2.9, 2.9, 2.5, 2.5];
                const gainPercentage = gainPercentages[index % 5] || 2.5;
                
                // Currency full names
                const getCurrencyName = (code: string) => {
                  const names: Record<string, string> = {
                    'UGX': 'Ugandan Shilling',
                    'USD': 'US Dollar', 
                    'KES': 'Kenyan Shilling',
                    'EUR': 'Euro',
                    'GBP': 'British Pound'
                  };
                  return names[code] || code;
                };

                // Currency symbols for display
                const getCurrencySymbol = (code: string) => {
                  const symbols: Record<string, string> = {
                    'UGX': 'UG',
                    'USD': 'US', 
                    'KES': 'KE',
                    'EUR': 'EU',
                    'GBP': 'GB'
                  };
                  return symbols[code] || code.substring(0, 2);
                };
                
                return (
                  <Card key={holding.currency} className="relative overflow-hidden">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Currency Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {getCurrencySymbol(holding.currency)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">{holding.currency}</h4>
                              <p className="text-xs text-muted-foreground">
                                {getCurrencyName(holding.currency)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            +{gainPercentage.toFixed(1)}%
                          </div>
                        </div>

                        {/* Balance */}
                        <div>
                          <p className="text-lg font-bold">
                            {showBalances ? 
                              holding.totalBalance.toLocaleString('en-US', { 
                                minimumFractionDigits: 2, maximumFractionDigits: 2 
                              }) : 
                              "••••••••"
                            }
                          </p>
                        </div>

                        {/* Progress Bar - matching the blue progress bars in the image */}
                        <div className="space-y-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{percentage.toFixed(1)}% of portfolio</span>
                            <span>{holding.accountCount} {holding.accountCount === 1 ? 'account' : 'accounts'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTransactions = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <p className="text-sm text-muted-foreground">
          Latest transactions synced from your bank accounts
        </p>
      </div>

      {transactionsLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : bankTransactions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
            <p className="text-muted-foreground">
              Bank transactions will appear here once your accounts sync.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {bankTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="p-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="font-medium">{transaction.description || "Bank transaction"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.transactionDate).toLocaleDateString()} • {transaction.externalTransactionId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.transactionType === "credit" ? "text-green-600" : "text-red-600"
                    }`}>
                      {transaction.transactionType === "credit" ? "+" : "-"}
                      {formatCurrency(Math.abs(parseFloat(transaction.amount)).toString(), transaction.currency)}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {transaction.transactionType}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="holdings">Currency Holdings</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts">
          {renderBankAccounts()}
        </TabsContent>
        
        <TabsContent value="holdings">
          {renderCurrencyHoldings()}
        </TabsContent>
        
        <TabsContent value="transactions">
          {renderTransactions()}
        </TabsContent>
      </Tabs>
    </div>
  );
}