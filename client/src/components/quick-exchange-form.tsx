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
import { ArrowRight, CheckCircle, Info } from "lucide-react";
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

export default function QuickExchangeForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingData, setPendingData] = useState<ExchangeFormData | null>(null);

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
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter amount to exchange"
                      className="h-11"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="desiredRate"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Desired Rate (Optional)</FormLabel>
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
                </FormItem>
              )}
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
              
              {pendingData.desiredRate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Desired Rate:</span>
                  <span className="font-medium">{formatRate(pendingData.desiredRate)}</span>
                </div>
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
