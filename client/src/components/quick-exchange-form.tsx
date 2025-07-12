import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, CheckCircle, Info, ArrowLeftRight, TrendingUp, TrendingDown, Calculator } from "lucide-react";
import { formatCurrency, formatRate } from "@/lib/utils";

const currencies = [
  { value: "UGX", label: "UGX - Ugandan Shilling" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "KES", label: "KES - Kenyan Shilling" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
];

const priorities = [
  { value: "standard", label: "Standard" },
  { value: "urgent", label: "Urgent" },
  { value: "express", label: "Express" },
];

const exchangeFormSchema = z.object({
  fromCurrency: z.string().min(1, "Please select source currency"),
  toCurrency: z.string().min(1, "Please select target currency"),
  amount: z.string().min(1, "Please enter amount").transform((val) => parseFloat(val)),
  desiredRate: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  priority: z.string().min(1, "Please select priority"),
}).refine((data) => data.fromCurrency !== data.toCurrency, {
  message: "Source and target currencies must be different",
  path: ["toCurrency"],
}).refine((data) => data.amount > 0, {
  message: "Amount must be greater than 0",
  path: ["amount"],
}).refine((data) => !data.desiredRate || data.desiredRate > 0, {
  message: "Rate must be greater than 0",
  path: ["desiredRate"],
});

type ExchangeFormData = z.infer<typeof exchangeFormSchema>;

// Mock exchange rates - in a real app, this would come from an API
const exchangeRates: Record<string, Record<string, number>> = {
  UGX: { USD: 0.00028, KES: 0.10, EUR: 0.00025, GBP: 0.00022, UGX: 1 },
  USD: { UGX: 3571.43, KES: 357.14, EUR: 0.89, GBP: 0.79, USD: 1 },
  KES: { UGX: 10.0, USD: 0.0028, EUR: 0.0025, GBP: 0.0022, KES: 1 },
  EUR: { UGX: 4000.0, USD: 1.12, KES: 400.0, GBP: 0.89, EUR: 1 },
  GBP: { UGX: 4545.45, USD: 1.27, KES: 454.55, EUR: 1.12, GBP: 1 }
};

export default function QuickExchangeForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingData, setPendingData] = useState<ExchangeFormData | null>(null);
  const [showConverter, setShowConverter] = useState(false);
  const [converterAmount, setConverterAmount] = useState("1");

  const form = useForm<ExchangeFormData>({
    resolver: zodResolver(exchangeFormSchema),
    defaultValues: {
      fromCurrency: "",
      toCurrency: "",
      amount: 0,
      desiredRate: undefined,
      priority: "standard",
    },
  });

  const createExchangeRequestMutation = useMutation({
    mutationFn: async (data: ExchangeFormData) => {
      await apiRequest("POST", "/api/exchange-requests", {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        amount: data.amount.toString(),
        desiredRate: data.desiredRate?.toString(),
        priority: data.priority,
      });
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      
      toast({
        title: "Exchange request posted",
        description: "Your exchange request has been posted successfully.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      // Handle server error messages
      let errorMessage = "Failed to post exchange request. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExchangeFormData) => {
    setPendingData(data);
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = () => {
    if (pendingData) {
      createExchangeRequestMutation.mutate(pendingData);
      setShowConfirmation(false);
      setPendingData(null);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirmation(false);
    setPendingData(null);
  };

  // Show form to all authenticated users
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Exchange Request</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            Please log in to post exchange requests.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Quick Exchange Request</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="fromCurrency"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">From Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="toCurrency"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">To Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => {
                const fromCurrency = form.watch("fromCurrency");
                return (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      Amount {fromCurrency ? `(${fromCurrency})` : ""}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={fromCurrency ? `Enter ${fromCurrency} amount to exchange` : "Enter amount to exchange"}
                        className="h-11"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="desiredRate"
              render={({ field }) => {
                const amount = form.watch("amount");
                const toCurrency = form.watch("toCurrency");
                const fromCurrency = form.watch("fromCurrency");
                
                // Calculate total amount desired
                const parsedAmount = parseFloat(amount?.toString() || "0");
                const parsedRate = parseFloat(field.value || "0");
                const totalAmountDesired = parsedAmount && parsedRate ? parsedAmount * parsedRate : 0;
                
                return (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      Desired Rate (Optional)
                      {fromCurrency && toCurrency && ` - ${fromCurrency} to ${toCurrency}`}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter your preferred exchange rate"
                        className="h-11"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    {totalAmountDesired > 0 && toCurrency && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <div className="flex items-center justify-between">
                          <span>Total amount desired:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(totalAmountDesired, toCurrency)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(parsedAmount, fromCurrency || "")} × {parsedRate} = {formatCurrency(totalAmountDesired, toCurrency)}
                        </div>
                      </div>
                    )}
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Priority Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select priority level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Rate Converter Toggle */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConverter(!showConverter)}
                className="text-xs"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {showConverter ? "Hide" : "Check"} Live Rates
              </Button>
            </div>

            {/* Inline Currency Converter */}
            {showConverter && (
              <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quick Rate Check</span>
                  <div className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Live rates
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={converterAmount}
                      onChange={(e) => setConverterAmount(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Amount"
                    />
                    <span className="text-sm text-gray-600">
                      {form.watch("fromCurrency") || "From"}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-green-600">
                      {(() => {
                        const fromCur = form.watch("fromCurrency");
                        const toCur = form.watch("toCurrency");
                        const amount = parseFloat(converterAmount) || 0;
                        if (fromCur && toCur && amount) {
                          const rate = exchangeRates[fromCur]?.[toCur] || 0;
                          const result = amount * rate;
                          return formatCurrency(result, toCur);
                        }
                        return toCur || "To";
                      })()}
                    </span>
                  </div>
                  
                  {form.watch("fromCurrency") && form.watch("toCurrency") && (
                    <div className="text-xs text-gray-500 text-center bg-white p-2 rounded">
                      1 {form.watch("fromCurrency")} = {
                        (exchangeRates[form.watch("fromCurrency")]?.[form.watch("toCurrency")] || 0).toFixed(6)
                      } {form.watch("toCurrency")}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full h-12 bg-primary-500 hover:bg-primary-600 text-base font-medium"
                disabled={createExchangeRequestMutation.isPending}
              >
              {createExchangeRequestMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Posting...
                </>
              ) : (
                "Post Exchange Request"
              )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Confirm Exchange Request</DialogTitle>
              <DialogDescription>
                Please review your exchange request details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {pendingData && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Exchange:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{pendingData.fromCurrency}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{pendingData.toCurrency}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">
                  {formatCurrency(pendingData.amount, pendingData.fromCurrency)}
                </span>
              </div>
              
              {/* Market Rate Conversion */}
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 text-sm">Current Market Rate:</span>
                  <span className="text-green-700 text-xs">
                    1 {pendingData.fromCurrency} = {(exchangeRates[pendingData.fromCurrency]?.[pendingData.toCurrency] || 0).toFixed(6)} {pendingData.toCurrency}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-green-700 text-sm font-medium">You would receive:</span>
                  <span className="text-green-700 font-semibold">
                    {(() => {
                      const rate = exchangeRates[pendingData.fromCurrency]?.[pendingData.toCurrency] || 0;
                      const convertedAmount = pendingData.amount * rate;
                      return formatCurrency(convertedAmount, pendingData.toCurrency);
                    })()}
                  </span>
                </div>
              </div>
              
              {pendingData.desiredRate && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Desired Rate:</span>
                    <span className="font-medium">{formatRate(pendingData.desiredRate)}</span>
                  </div>
                  
                  {/* Desired Rate Conversion */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 text-sm font-medium">With your desired rate:</span>
                      <span className="text-blue-700 font-semibold">
                        {formatCurrency(pendingData.amount * pendingData.desiredRate, pendingData.toCurrency)}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Difference: {(() => {
                        const marketRate = exchangeRates[pendingData.fromCurrency]?.[pendingData.toCurrency] || 0;
                        const marketAmount = pendingData.amount * marketRate;
                        const desiredAmount = pendingData.amount * pendingData.desiredRate;
                        const difference = desiredAmount - marketAmount;
                        const sign = difference >= 0 ? "+" : "";
                        return `${sign}${formatCurrency(Math.abs(difference), pendingData.toCurrency)}`;
                      })()} vs market rate
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Priority:</span>
                <span className="font-medium capitalize">{pendingData.priority}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Important Notes:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Your request will be visible to all traders</li>
                    <li>• You'll receive rate offers from interested bidders</li>
                    <li>• You can accept the best offer that meets your needs</li>
                    <li>• Cancel anytime before accepting an offer</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleCancelSubmit}
                disabled={createExchangeRequestMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-primary-500 hover:bg-primary-600"
                onClick={handleConfirmSubmit}
                disabled={createExchangeRequestMutation.isPending}
              >
                {createExchangeRequestMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Posting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm & Post
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
