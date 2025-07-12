import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RateOffer, ExchangeRequest } from "@shared/schema";
import { 
  Clock, 
  User, 
  CheckCircle, 
  MessageSquare, 
  X, 
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  MessageCircle
} from "lucide-react";
import PrivateMessages from "@/components/private-messages";

interface OffersCardProps {
  exchangeRequest: ExchangeRequest | null;
  onClose: () => void;
}

export default function OffersCard({ exchangeRequest, onClose }: OffersCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const [privateMessagesOpen, setPrivateMessagesOpen] = useState(false);
  const [selectedBidderId, setSelectedBidderId] = useState<string>("");
  const [initialMessageContent, setInitialMessageContent] = useState("");
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [offerToAccept, setOfferToAccept] = useState<number | null>(null);

  const { data: allOffers = [], isLoading } = useQuery<RateOffer[]>({
    queryKey: [`/api/rate-offers/${exchangeRequest?.id}`],
    enabled: !!exchangeRequest?.id,
    refetchInterval: 5000,
  });

  // Filter offers based on exchange request status
  const offers = allOffers.filter(offer => {
    // If exchange is completed, only show the selected/accepted offer
    if (exchangeRequest?.status === 'completed' && (exchangeRequest as any).selectedOfferId) {
      return offer.id === (exchangeRequest as any).selectedOfferId;
    }
    // For active exchanges, show all offers
    return true;
  });

  // Accept offer mutation
  const acceptOfferMutation = useMutation({
    mutationFn: async (offerId: number) => {
      const response = await fetch(`/api/rate-offers/${offerId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchangeRequestId: exchangeRequest?.id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to accept offer");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      queryClient.invalidateQueries({ queryKey: [`/api/rate-offers/${exchangeRequest?.id}`] });
      toast({
        title: "Success",
        description: "Offer accepted successfully!",
      });
      setShowTermsDialog(false);
      setOfferToAccept(null);
      setTermsAccepted(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Decline offer mutation
  const declineOfferMutation = useMutation({
    mutationFn: async (offerId: number) => {
      const response = await fetch(`/api/rate-offers/${offerId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchangeRequestId: exchangeRequest?.id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to decline offer");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      queryClient.invalidateQueries({ queryKey: [`/api/rate-offers/${exchangeRequest?.id}`] });
      toast({
        title: "Success",
        description: "Offer declined successfully",
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

  const handleAcceptOffer = (offerId: number) => {
    setOfferToAccept(offerId);
    setShowTermsDialog(true);
  };

  const handleDeclineOffer = (offerId: number) => {
    if (window.confirm("Are you sure you want to decline this offer?")) {
      declineOfferMutation.mutate(offerId);
    }
  };

  const handleConfirmAccept = () => {
    if (offerToAccept && termsAccepted) {
      acceptOfferMutation.mutate(offerToAccept);
    }
  };

  const handleSendMessage = (bidderId: string, bidderName: string) => {
    setSelectedBidderId(bidderId);
    setInitialMessageContent(`Hi ${bidderName}, I have some questions about your offer for ${exchangeRequest?.amount} ${exchangeRequest?.fromCurrency} → ${exchangeRequest?.toCurrency}.`);
    setPrivateMessagesOpen(true);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-success-100 text-success-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (!exchangeRequest) return null;

  return (
    <>
      <Card className="mb-6 border-2 border-primary-200 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-primary-600" />
                Offers for Exchange Request
              </CardTitle>
              <CardDescription className="mt-1">
                {exchangeRequest.amount} {exchangeRequest.fromCurrency} → {exchangeRequest.toCurrency}
                {exchangeRequest.desiredRate && (
                  <span className="ml-2 text-sm font-medium">
                    @ {parseFloat(exchangeRequest.desiredRate).toLocaleString()} rate
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {exchangeRequest.status === 'completed' ? 'Accepted Offer' : 
                    `${offers.length} offer${offers.length !== 1 ? 's' : ''} received`}
                </h4>
                
                <div className="grid gap-3 max-h-80 overflow-y-auto">
                  {offers.map((offer) => (
                    <Card key={offer.id} className="border transition-all duration-200 hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-success-600" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">
                                {offer.bidder?.companyName || offer.bidder?.firstName || "Anonymous Bidder"}
                              </h5>
                              <p className="text-xs text-gray-500">Submitted {formatTime(offer.createdAt || "")}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(offer.status || 'pending')}>
                              {getStatusIcon(offer.status || 'pending')}
                              <span className="ml-1 capitalize">{offer.status || 'pending'}</span>
                            </Badge>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Offered Rate</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {parseFloat(offer.rate).toLocaleString()} {exchangeRequest.toCurrency}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600 dark:text-gray-400">You'll receive</p>
                              <p className="text-lg font-bold text-success-600">
                                {(parseFloat(exchangeRequest.amount) * parseFloat(offer.rate)).toLocaleString()} {exchangeRequest.toCurrency}
                              </p>
                            </div>
                          </div>
                        </div>

                        {offer.note && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-blue-800">
                              <MessageCircle className="w-4 h-4 inline mr-1" />
                              "{offer.note}"
                            </p>
                          </div>
                        )}

                        {exchangeRequest.status !== 'completed' && offer.status === 'pending' && (
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptOffer(offer.id)}
                              disabled={acceptOfferMutation.isPending}
                              className="flex-1 bg-success-600 hover:bg-success-700 text-white"
                            >
                              {acceptOfferMutation.isPending ? "Accepting..." : "Accept Offer"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineOffer(offer.id)}
                              disabled={declineOfferMutation.isPending}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendMessage(offer.bidderId, offer.bidder?.companyName || offer.bidder?.firstName || "Bidder")}
                              className="border-gray-300 hover:bg-gray-50"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {offer.status === 'accepted' && (
                          <div className="bg-success-50 border border-success-200 rounded-lg p-3 text-center">
                            <CheckCircle className="w-5 h-5 text-success-600 mx-auto mb-1" />
                            <p className="text-sm font-medium text-success-900">Offer Accepted</p>
                            <p className="text-xs text-success-700">Exchange completed successfully</p>
                          </div>
                        )}

                        {offer.status === 'rejected' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <div className="w-5 h-5 text-red-600 mx-auto mb-1">✕</div>
                            <p className="text-sm font-medium text-red-900">Offer Declined</p>
                            <p className="text-xs text-red-700">This offer was not accepted</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Accept Offer - Terms & Conditions
            </DialogTitle>
            <DialogDescription>
              Please review and accept the terms before proceeding with this exchange.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Important Notice</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• By accepting this offer, you commit to completing the exchange</li>
                <li>• Contact details will be shared with the bidder for coordination</li>
                <li>• Exchange must be completed within 24 hours</li>
                <li>• Both parties are responsible for compliance with local regulations</li>
              </ul>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="terms-checkbox" className="text-sm text-gray-700">
                I understand and accept these terms and conditions
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTermsDialog(false);
                setOfferToAccept(null);
                setTermsAccepted(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAccept}
              disabled={!termsAccepted || acceptOfferMutation.isPending}
              className="bg-success-600 hover:bg-success-700"
            >
              {acceptOfferMutation.isPending ? "Processing..." : "Accept Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Private Messages */}
      <PrivateMessages
        isOpen={privateMessagesOpen}
        onClose={() => setPrivateMessagesOpen(false)}
        initialTargetUserId={selectedBidderId}
        initialContent={initialMessageContent}
      />
    </>
  );
}