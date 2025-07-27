import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ForexRate } from "@shared/schema";

const CURRENCIES = [
  "USD", "EUR", "GBP", "UGX", "KES", "TZS", "RWF", "BIF", 
  "JPY", "CHF", "CAD", "AUD", "NZD", "ZAR", "NGN", "GHS", "XOF", "MAD"
];

interface ForexRateFormData {
  fromCurrency: string;
  toCurrency: string;
  buyRate: string;
  sellRate: string;
}

export default function ForexRatesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ForexRate | null>(null);
  const [formData, setFormData] = useState<ForexRateFormData>({
    fromCurrency: "USD",
    toCurrency: "UGX",
    buyRate: "",
    sellRate: "",
  });

  // Fetch user's forex rates
  const { data: forexRates = [], isLoading } = useQuery<ForexRate[]>({
    queryKey: ["/api/forex-rates"],
    refetchInterval: 30000,
  });

  // Create forex rate mutation
  const createRateMutation = useMutation({
    mutationFn: async (data: ForexRateFormData) => {
      const response = await fetch("/api/forex-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create forex rate");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forex-rates"] });
      setIsAddDialogOpen(false);
      setFormData({ fromCurrency: "USD", toCurrency: "UGX", buyRate: "", sellRate: "" });
      toast({
        title: "Success",
        description: "Forex rate created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update forex rate mutation
  const updateRateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<ForexRateFormData> }) => {
      const response = await fetch(`/api/forex-rates/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update forex rate");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forex-rates"] });
      setIsEditDialogOpen(false);
      setEditingRate(null);
      setFormData({ fromCurrency: "USD", toCurrency: "UGX", buyRate: "", sellRate: "" });
      toast({
        title: "Success",
        description: "Forex rate updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete forex rate mutation
  const deleteRateMutation = useMutation({
    mutationFn: async (rateId: number) => {
      const response = await fetch(`/api/forex-rates/${rateId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete forex rate");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forex-rates"] });
      toast({
        title: "Success",
        description: "Forex rate deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddRate = () => {
    createRateMutation.mutate(formData);
  };

  const handleEditRate = (rate: ForexRate) => {
    setEditingRate(rate);
    setFormData({
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      buyRate: rate.buyRate,
      sellRate: rate.sellRate,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateRate = () => {
    if (!editingRate) return;
    updateRateMutation.mutate({
      id: editingRate.id,
      updates: formData,
    });
  };

  const handleDeleteRate = (rateId: number) => {
    if (window.confirm("Are you sure you want to delete this forex rate?")) {
      deleteRateMutation.mutate(rateId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatRate = (rate: string) => {
    return parseFloat(rate).toFixed(2);
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rates</p>
                <p className="text-2xl font-bold">{forexRates.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Currency Pairs</p>
                <p className="text-2xl font-bold">
                  {new Set(forexRates.map(rate => `${rate.fromCurrency}/${rate.toCurrency}`)).size}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Spread</p>
                <p className="text-2xl font-bold">
                  {forexRates.length > 0 
                    ? (forexRates.reduce((sum, rate) => sum + ((parseFloat(rate.sellRate) - parseFloat(rate.buyRate)) / parseFloat(rate.buyRate) * 100), 0) / forexRates.length).toFixed(2)
                    : '0.00'
                  }%
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                My Forex Rates
              </CardTitle>
              <CardDescription>
                Manage your daily forex rates for different currency pairs
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Forex Rate</DialogTitle>
                  <DialogDescription>
                    Set your buy and sell rates for a currency pair
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fromCurrency">From Currency</Label>
                      <Select
                        value={formData.fromCurrency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, fromCurrency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="toCurrency">To Currency</Label>
                      <Select
                        value={formData.toCurrency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, toCurrency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buyRate">Buy Rate</Label>
                      <Input
                        id="buyRate"
                        type="number"
                        step="0.000001"
                        placeholder="0.000000"
                        value={formData.buyRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, buyRate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sellRate">Sell Rate</Label>
                      <Input
                        id="sellRate"
                        type="number"
                        step="0.000001"
                        placeholder="0.000000"
                        value={formData.sellRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, sellRate: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAddRate}
                    disabled={createRateMutation.isPending || !formData.fromCurrency || !formData.toCurrency || !formData.buyRate || !formData.sellRate}
                  >
                    {createRateMutation.isPending ? "Creating..." : "Create Rate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading forex rates...</div>
          ) : forexRates.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No forex rates yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Start by adding your first forex rate for today
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency Pair</TableHead>
                      <TableHead>Buy Rate</TableHead>
                      <TableHead>Sell Rate</TableHead>
                      <TableHead>Spread</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forexRates.map((rate) => {
                      const spread = ((parseFloat(rate.sellRate) - parseFloat(rate.buyRate)) / parseFloat(rate.buyRate) * 100);
                      return (
                        <TableRow key={rate.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-semibold">
                              {rate.fromCurrency}/{rate.toCurrency}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-green-600 dark:text-green-400 font-semibold">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {formatRate(rate.buyRate)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-red-600 dark:text-red-400 font-semibold">
                            <div className="flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {formatRate(rate.sellRate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={spread > 2 ? "destructive" : spread > 1 ? "secondary" : "default"}>
                              {spread.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate((rate.date || rate.createdAt || "").toString())}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRate(rate)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRate(rate.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {forexRates.map((rate) => {
                  const spread = ((parseFloat(rate.sellRate) - parseFloat(rate.buyRate)) / parseFloat(rate.buyRate) * 100);
                  return (
                    <Card key={rate.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="font-semibold">
                          {rate.fromCurrency}/{rate.toCurrency}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRate(rate)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRate(rate.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Buy Rate</p>
                          <div className="flex items-center gap-1 font-mono text-green-600 dark:text-green-400 font-semibold">
                            <TrendingUp className="h-3 w-3" />
                            {formatRate(rate.buyRate)}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sell Rate</p>
                          <div className="flex items-center gap-1 font-mono text-red-600 dark:text-red-400 font-semibold">
                            <TrendingDown className="h-3 w-3" />
                            {formatRate(rate.sellRate)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground">Spread: </span>
                          <Badge variant={spread > 2 ? "destructive" : spread > 1 ? "secondary" : "default"} className="text-xs">
                            {spread.toFixed(2)}%
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate((rate.date || rate.createdAt || "").toString())}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Forex Rate</DialogTitle>
            <DialogDescription>
              Update your buy and sell rates for {editingRate?.fromCurrency}/{editingRate?.toCurrency}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editBuyRate">Buy Rate</Label>
                <Input
                  id="editBuyRate"
                  type="number"
                  step="0.000001"
                  placeholder="0.000000"
                  value={formData.buyRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, buyRate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="editSellRate">Sell Rate</Label>
                <Input
                  id="editSellRate"
                  type="number"
                  step="0.000001"
                  placeholder="0.000000"
                  value={formData.sellRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, sellRate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdateRate}
              disabled={updateRateMutation.isPending || !formData.buyRate || !formData.sellRate}
            >
              {updateRateMutation.isPending ? "Updating..." : "Update Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}