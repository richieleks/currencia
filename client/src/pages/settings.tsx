import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRightLeft, Wallet, CreditCard, Settings, User, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BankAccountManager from "@/components/bank-account-manager";

const currencies = [
  { code: "UGX", name: "Ugandan Shilling", flag: "🇺🇬" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
];

// Helper function to format amounts
const formatAmount = (amount: number, currency?: string) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  try {
    return formatter.format(amount);
  } catch {
    // Fallback if currency is not supported
    return `${currency || 'USD'} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [transferData, setTransferData] = useState({
    currency: "",
    amount: "",
    direction: "operational-to-wallet", // or "wallet-to-operational"
  });

  const transferMutation = useMutation({
    mutationFn: async (data: typeof transferData) => {
      await apiRequest("POST", "/api/user/transfer", data);
    },
    onSuccess: () => {
      toast({
        title: "Transfer Successful",
        description: "Funds have been transferred successfully.",
      });
      setTransferData({ currency: "", amount: "", direction: "operational-to-wallet" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer funds. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to get balance for a specific currency
  const getBalanceForCurrency = (currencyCode: string, isWallet = false) => {
    if (!user) return 0;
    
    const balanceKey = isWallet ? 
      `${currencyCode.toLowerCase()}WalletBalance` : 
      `${currencyCode.toLowerCase()}Balance`;
    
    return parseFloat(user[balanceKey as keyof typeof user] as string || "0");
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.currency || !transferData.amount) {
      toast({
        title: "Invalid Input",
        description: "Please select a currency and enter an amount.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(transferData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate(transferData);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and transfer funds between accounts
          </p>
        </div>

        <Tabs defaultValue="transfers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="transfers">Money Transfers</TabsTrigger>
            <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="transfers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transfer Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5" />
                    Transfer Funds
                  </CardTitle>
                  <CardDescription>
                    Move money between your operational and wallet accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTransfer} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={transferData.currency}
                        onValueChange={(value) =>
                          setTransferData({ ...transferData, currency: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="direction">Transfer Direction</Label>
                      <Select
                        value={transferData.direction}
                        onValueChange={(value) =>
                          setTransferData({ ...transferData, direction: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operational-to-wallet">
                            Operational → Wallet
                          </SelectItem>
                          <SelectItem value="wallet-to-operational">
                            Wallet → Operational
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter amount"
                        value={transferData.amount}
                        onChange={(e) =>
                          setTransferData({ ...transferData, amount: e.target.value })
                        }
                      />
                    </div>

                    {transferData.currency && (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="text-sm font-medium">Available Balances:</div>
                        <div className="flex justify-between text-sm">
                          <span>Operational:</span>
                          <span className="font-bold">
                            {getBalanceForCurrency(transferData.currency).toLocaleString()} {transferData.currency}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Wallet:</span>
                          <span className="font-bold">
                            {getBalanceForCurrency(transferData.currency, true).toLocaleString()} {transferData.currency}
                          </span>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={transferMutation.isPending}
                    >
                      {transferMutation.isPending ? "Processing..." : "Transfer Funds"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Account Balances Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Account Balances
                  </CardTitle>
                  <CardDescription>
                    Overview of your operational and wallet balances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currencies.map((currency) => {
                      const operationalBalance = getBalanceForCurrency(currency.code);
                      const walletBalance = getBalanceForCurrency(currency.code, true);
                      const totalBalance = operationalBalance + walletBalance;

                      return (
                        <div key={currency.code} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{currency.flag}</span>
                              <span className="font-medium">{currency.code}</span>
                            </div>
                            <Badge variant="outline">
                              {formatAmount(totalBalance, currency.code)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded">
                              <CreditCard className="h-4 w-4 text-blue-600" />
                              <div>
                                <div className="text-xs text-muted-foreground">Operational</div>
                                <div className="font-medium">{formatAmount(operationalBalance)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                              <Wallet className="h-4 w-4 text-green-600" />
                              <div>
                                <div className="text-xs text-muted-foreground">Wallet</div>
                                <div className="font-medium">{formatAmount(walletBalance)}</div>
                              </div>
                            </div>
                          </div>
                          {currency.code !== currencies[currencies.length - 1].code && (
                            <Separator className="mt-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bank-accounts" className="space-y-6">
            <BankAccountManager />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  View and manage your profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input value={user.firstName || ""} disabled />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={user.lastName || ""} disabled />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user.email || ""} disabled />
                </div>
                <div>
                  <Label>Role</Label>
                  <Badge variant="outline" className="w-fit">
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Profile information is managed through your authentication provider.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Theme Preferences
                </CardTitle>
                <CardDescription>
                  Customize the appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium mb-1">Theme</h3>
                      <p className="text-sm text-muted-foreground">
                        Switch between light and dark modes
                      </p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Account Status</h3>
                    <Badge variant="secondary" className="mb-2">
                      Active
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Your account is active and secure.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      Authentication is handled through Replit's secure OAuth system.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}