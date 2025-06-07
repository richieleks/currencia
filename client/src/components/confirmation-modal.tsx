import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  transaction?: {
    id: number;
    exchangeRequestId: number;
    rate: string;
    amount: string;
    fromCurrency: string;
    toCurrency: string;
    totalAmount: string;
  };
}

export default function ConfirmationModal({ 
  isOpen = false, 
  onClose, 
  transaction 
}: ConfirmationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptOfferMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) throw new Error("No transaction data");
      
      await apiRequest("POST", `/api/rate-offers/${transaction.id}/accept`, {
        exchangeRequestId: transaction.exchangeRequestId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); // Refresh user balance
      
      toast({
        title: "Exchange completed",
        description: "Your exchange has been completed successfully!",
      });
      
      onClose?.();
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
        description: "Failed to complete exchange. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    acceptOfferMutation.mutate();
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <DialogTitle>Confirm Exchange</DialogTitle>
              <DialogDescription>
                Please review the transaction details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Exchange:</span>
            <span className="font-medium">
              {parseFloat(transaction.amount).toLocaleString()} {transaction.fromCurrency} → {transaction.toCurrency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rate:</span>
            <span className="font-medium">{transaction.rate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">You'll receive:</span>
            <span className="font-bold text-success-600">
              {parseFloat(transaction.totalAmount).toLocaleString()} {transaction.toCurrency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fee:</span>
            <span className="font-medium">$25.00</span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={onClose}
            disabled={acceptOfferMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-primary-500 hover:bg-primary-600"
            onClick={handleConfirm}
            disabled={acceptOfferMutation.isPending}
          >
            {acceptOfferMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              "Confirm Exchange"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
