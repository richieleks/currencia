import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, TrendingUp } from "lucide-react";
import { useState } from "react";
import RateOfferModal from "./rate-offer-modal";
import OffersViewer from "./offers-viewer";

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

export default function ActiveOffers() {
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<ExchangeRequest | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isOffersViewerOpen, setIsOffersViewerOpen] = useState(false);
  const [viewingRequestId, setViewingRequestId] = useState<number | null>(null);

  const { data: exchangeRequests = [], isLoading } = useQuery<ExchangeRequest[]>({
    queryKey: ["/api/exchange-requests"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-warning-100 text-warning-800";
      case "express":
        return "bg-red-100 text-red-800";
      default:
        return "bg-primary-100 text-primary-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {exchangeRequests.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No active requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exchangeRequests.slice(0, 5).map((request) => (
              <div 
                key={request.id} 
                className="border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {request.fromCurrency}/{request.toCurrency}
                  </span>
                  <Badge className={getPriorityColor(request.priority)}>
                    {request.priority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <span>Amount: {parseFloat(request.amount).toLocaleString()} {request.fromCurrency}</span>
                  <span>{formatTime(request.createdAt)}</span>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  by {request.user.firstName || 'User'}
                </div>
                
                {user?.role === "bidder" ? (
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm"
                      className="flex-1 bg-success-500 hover:bg-success-600 text-white"
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsOfferModalOpen(true);
                      }}
                    >
                      Make Offer
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                ) : user?.id === request.user.id ? (
                  <div className="text-center">
                    <Button 
                      size="sm"
                      className="w-full bg-primary-500 hover:bg-primary-600"
                      onClick={() => {
                        setViewingRequestId(request.id);
                        setSelectedRequest(request);
                        setIsOffersViewerOpen(true);
                      }}
                    >
                      View Offers
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Button 
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      Waiting for offers...
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Rate Offer Modal */}
      <RateOfferModal 
        isOpen={isOfferModalOpen}
        onClose={() => {
          setIsOfferModalOpen(false);
          setSelectedRequest(null);
        }}
        exchangeRequest={selectedRequest}
      />
      
      {/* Offers Viewer Modal */}
      <OffersViewer 
        isOpen={isOffersViewerOpen}
        onClose={() => {
          setIsOffersViewerOpen(false);
          setViewingRequestId(null);
          setSelectedRequest(null);
        }}
        exchangeRequestId={viewingRequestId}
        exchangeRequestData={selectedRequest ? {
          fromCurrency: selectedRequest.fromCurrency,
          toCurrency: selectedRequest.toCurrency,
          amount: selectedRequest.amount,
        } : undefined}
      />
    </Card>
  );
}
