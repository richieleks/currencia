import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calculator, TrendingUp } from "lucide-react";

interface ExchangeRequest {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  priority: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    role: string;
  };
}

interface RateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeRequest: ExchangeRequest | null;
}

const rateOfferSchema = z.object({
  rate: z.string().min(1, "Rate is required").transform((val) => parseFloat(val)),
}).refine((data) => data.rate > 0, {
  message: "Rate must be greater than 0",
  path: ["rate"],
});

type RateOfferData = z.infer<typeof rateOfferSchema>;

export default function RateOfferModal({ isOpen, onClose, exchangeRequest }: RateOfferModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RateOfferData>({
    resolver: zodResolver(rateOfferSchema),
    defaultValues: {
      rate: 0,
    },
  });

  const watchedRate = form.watch("rate");
  const totalAmount = exchangeRequest ? (parseFloat(exchangeRequest.amount) * watchedRate).toFixed(2) : "0.00";

  const createRateOfferMutation = useMutation({
    mutationFn: async (data: RateOfferData) => {
      if (!exchangeRequest) throw new Error("No exchange request selected");
      
      await apiRequest("POST", "/api/rate-offers", {
        exchangeRequestId: exchangeRequest.id,
        rate: data.rate.toString(),
        totalAmount: totalAmount,
      });
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      
      toast({
        title: "Rate offer submitted",
        description: "Your rate offer has been submitted successfully!",
      });
      
      onClose();
    },
    onError: (error) => {
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
      
      toast({
        title: "Error",
        description: "Failed to submit rate offer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RateOfferData) => {
    createRateOfferMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!exchangeRequest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <DialogTitle>Submit Rate Offer</DialogTitle>
              <DialogDescription>
                Offer your exchange rate for this request
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Exchange Request Details</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Currency Pair:</span>
              <span className="font-medium">{exchangeRequest.fromCurrency}/{exchangeRequest.toCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">{parseFloat(exchangeRequest.amount).toLocaleString()} {exchangeRequest.fromCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <span className="font-medium capitalize">{exchangeRequest.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Requested by:</span>
              <span className="font-medium">{exchangeRequest.user.firstName || 'User'}</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exchange Rate</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="0.000000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="pr-10"
                      />
                      <Calculator className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedRate > 0 && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-success-800 font-medium">Total Amount:</span>
                  <span className="text-success-900 font-bold text-lg">
                    {totalAmount} {exchangeRequest.toCurrency}
                  </span>
                </div>
                <p className="text-xs text-success-700 mt-1">
                  Rate: 1 {exchangeRequest.fromCurrency} = {watchedRate} {exchangeRequest.toCurrency}
                </p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1"
                onClick={handleClose}
                disabled={createRateOfferMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1 bg-success-500 hover:bg-success-600"
                disabled={createRateOfferMutation.isPending || !watchedRate || watchedRate <= 0}
              >
                {createRateOfferMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Offer"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}