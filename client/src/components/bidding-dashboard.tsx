import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Clock, DollarSign, TrendingUp, User, Zap, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const bidFormSchema = z.object({
  rate: z.string().min(1, "Rate is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Rate must be a positive number"
  ),
  totalAmount: z.string().min(1, "Total amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Total amount must be a positive number"
  ),
});

type BidFormData = z.infer<typeof bidFormSchema>;

interface ExchangeRequest {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  desiredRate?: string;
  priority: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    companyName?: string | null;
    firstName: string | null;
    role: string;
  };
}

interface RateOffer {
  id: number;
  rate: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  bidder: {
    id: string;
    companyName?: string | null;
    firstName: string | null;
    role: string;
  };
}

export default function BiddingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ExchangeRequest | null>(null);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: exchangeRequests, isLoading: requestsLoading } = useQuery<ExchangeRequest[]>({
    queryKey: ["/api/exchange-requests"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: myBids, isLoading: bidsLoading } = useQuery<RateOffer[]>({
    queryKey: ["/api/rate-offers/my-bids"],
    refetchInterval: 5000,
  });

  const form = useForm<BidFormData>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      rate: "",
      totalAmount: "",
    },
  });

  const placeBidMutation = useMutation({
    mutationFn: async (data: BidFormData & { exchangeRequestId: number }) => {
      const response = await fetch("/api/rate-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to place bid");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid placed successfully",
        description: "Your offer has been submitted to the subscriber.",
      });
      setBidDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/rate-offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rate-offers/my-bids"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error placing bid",
        description: error.message || "Failed to place bid",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BidFormData) => {
    if (!selectedRequest) return;
    
    placeBidMutation.mutate({
      ...data,
      exchangeRequestId: selectedRequest.id,
    });
  };

  const calculateTotal = (rate: string, amount: string) => {
    const rateNum = parseFloat(rate);
    const amountNum = parseFloat(amount);
    if (isNaN(rateNum) || isNaN(amountNum)) return "";
    return (rateNum * amountNum).toFixed(2);
  };

  const handleBidClick = (request: ExchangeRequest) => {
    setSelectedRequest(request);
    const estimatedTotal = calculateTotal("1.0", request.amount);
    form.setValue("totalAmount", estimatedTotal);
    setBidDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "express": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "urgent": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please log in to access bidding opportunities and place offers on exchange requests.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Bidding Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            View available exchange requests and place competitive bids
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Available Opportunities
              </CardTitle>
              <CardDescription>
                Active exchange requests waiting for bids
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : !exchangeRequests?.length ? (
                <p className="text-muted-foreground text-center py-8">
                  No active exchange requests available
                </p>
              ) : (
                <div className="space-y-4">
                  {exchangeRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {request.fromCurrency} → {request.toCurrency}
                            </h3>
                            <Badge className={getPriorityColor(request.priority)}>
                              {request.priority}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              Amount: {parseFloat(request.amount).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatDistanceToNow(new Date(request.createdAt))} ago
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {request.user.firstName || "Anonymous"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Zap className="h-4 w-4" />
                              Status: {request.status}
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => handleBidClick(request)}
                          disabled={placeBidMutation.isPending}
                        >
                          Place Bid
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Active Bids</CardTitle>
              <CardDescription>
                Your recent offers and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bidsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : !myBids?.length ? (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  No bids placed yet
                </p>
              ) : (
                <div className="space-y-3">
                  {myBids.slice(0, 5).map((bid) => (
                    <div key={bid.id} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium">
                          Rate: {parseFloat(bid.rate).toFixed(2)}
                        </div>
                        <Badge className={getStatusColor(bid.status)}>
                          {bid.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total: ${parseFloat(bid.totalAmount).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(bid.createdAt))} ago
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bidding Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Bids</span>
                <span className="font-medium">{myBids?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Accepted</span>
                <span className="font-medium text-green-600">
                  {myBids?.filter(b => b.status === "accepted").length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-medium text-yellow-600">
                  {myBids?.filter(b => b.status === "pending").length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Available Requests</span>
                <span className="font-medium">{exchangeRequests?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Place Your Bid</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Exchange: {selectedRequest.fromCurrency} → {selectedRequest.toCurrency}
                  <br />
                  Amount: {parseFloat(selectedRequest.amount).toLocaleString()} {selectedRequest.fromCurrency}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange Rate</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1.2500"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (selectedRequest) {
                            const total = calculateTotal(e.target.value, selectedRequest.amount);
                            form.setValue("totalAmount", total);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Your proposed exchange rate
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12500.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Total amount you'll provide in {selectedRequest?.toCurrency}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setBidDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={placeBidMutation.isPending}
                  className="flex-1"
                >
                  {placeBidMutation.isPending ? "Placing..." : "Place Bid"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}