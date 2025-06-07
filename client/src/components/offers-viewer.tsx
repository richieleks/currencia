import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, User, TrendingUp } from "lucide-react";

interface RateOffer {
  id: number;
  rate: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  bidder: {
    id: string;
    firstName: string | null;
    role: string;
  };
}

interface OffersViewerProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeRequestId: number | null;
  exchangeRequestData?: {
    fromCurrency: string;
    toCurrency: string;
    amount: string;
  };
}

export default function OffersViewer({ isOpen, onClose, exchangeRequestId, exchangeRequestData }: OffersViewerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);

  const { data: offers = [], isLoading } = useQuery<RateOffer[]>({
    queryKey: ["/api/rate-offers", exchangeRequestId],
    enabled: !!exchangeRequestId && isOpen,
    refetchInterval: 5000,
  });

  const acceptOfferMutation = useMutation({
    mutationFn: async (offerId: number) => {
      await apiRequest("POST", `/api/rate-offers/${offerId}/accept`, {
        exchangeRequestId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Offer accepted",
        description: "The exchange has been completed successfully!",
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
        description: "Failed to accept offer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const handleAcceptOffer = (offerId: number) => {
    setSelectedOfferId(offerId);
    acceptOfferMutation.mutate(offerId);
  };

  if (!exchangeRequestData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <DialogTitle>Rate Offers</DialogTitle>
              <p className="text-sm text-gray-600">
                {exchangeRequestData.fromCurrency}/{exchangeRequestData.toCurrency} • {parseFloat(exchangeRequestData.amount).toLocaleString()} {exchangeRequestData.fromCurrency}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-2">No offers yet</p>
              <p className="text-sm text-gray-500">Bidders will submit their rates soon</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {offers.length} offer{offers.length !== 1 ? 's' : ''} received
              </h4>
              
              {offers.map((offer) => (
                <Card key={offer.id} className="border transition-all duration-200 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-success-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {offer.bidder.firstName || 'Bidder'}
                          </p>
                          <p className="text-xs text-gray-500">{formatTime(offer.createdAt)}</p>
                        </div>
                      </div>
                      
                      <Badge 
                        variant={offer.status === 'accepted' ? 'default' : 'outline'}
                        className={offer.status === 'accepted' ? 'bg-success-100 text-success-800' : ''}
                      >
                        {offer.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Exchange Rate</p>
                        <p className="font-bold text-lg">
                          {parseFloat(offer.rate).toFixed(6)}
                        </p>
                        <p className="text-xs text-gray-500">
                          1 {exchangeRequestData.fromCurrency} = {offer.rate} {exchangeRequestData.toCurrency}
                        </p>
                      </div>
                      
                      <div className="bg-success-50 rounded-lg p-3">
                        <p className="text-xs text-success-700 mb-1">You'll Receive</p>
                        <p className="font-bold text-lg text-success-900">
                          {parseFloat(offer.totalAmount).toLocaleString()}
                        </p>
                        <p className="text-xs text-success-600">{exchangeRequestData.toCurrency}</p>
                      </div>
                    </div>

                    {offer.status === 'pending' && (
                      <Button 
                        className="w-full bg-primary-500 hover:bg-primary-600"
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={acceptOfferMutation.isPending && selectedOfferId === offer.id}
                      >
                        {acceptOfferMutation.isPending && selectedOfferId === offer.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept This Offer
                          </>
                        )}
                      </Button>
                    )}

                    {offer.status === 'accepted' && (
                      <div className="bg-success-50 border border-success-200 rounded-lg p-3 text-center">
                        <CheckCircle className="w-5 h-5 text-success-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-success-900">Offer Accepted</p>
                        <p className="text-xs text-success-700">Exchange completed successfully</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}