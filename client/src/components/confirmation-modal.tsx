import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Shield, FileText } from "lucide-react";

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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const acceptOfferMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) throw new Error("No transaction data");
      if (!termsAccepted) throw new Error("Terms and conditions must be accepted");
      
      await apiRequest(`/api/rate-offers/${transaction.id}/accept`, "POST", {
        exchangeRequestId: transaction.exchangeRequestId,
        termsAccepted: true,
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
        </div>

        {/* Terms and Conditions Section */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-2">Terms and Conditions</h4>
                <p className="text-sm text-blue-800 mb-3">
                  By accepting this rate offer, you agree to our trading terms and conditions.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTerms(!showTerms)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {showTerms ? "Hide" : "View"} Terms
                </Button>
              </div>
            </div>

            {showTerms && (
              <div className="mt-4 p-3 bg-white rounded border text-sm text-gray-700 max-h-40 overflow-y-auto">
                <h5 className="font-semibold mb-2">Currency Exchange Terms</h5>
                <ul className="space-y-1 text-xs">
                  <li>• All exchange rates are final once accepted</li>
                  <li>• Transactions are processed immediately and cannot be reversed</li>
                  <li>• You confirm that you have the authority to make this exchange</li>
                  <li>• Exchange rates may include applicable fees and commissions</li>
                  <li>• All transactions are subject to anti-money laundering regulations</li>
                  <li>• Disputes must be reported within 24 hours of transaction completion</li>
                  <li>• You acknowledge the risks associated with currency exchange</li>
                  <li>• Personal information may be shared with regulatory authorities if required</li>
                </ul>
              </div>
            )}

            <div className="flex items-center space-x-2 mt-4">
              <Checkbox
                id="terms-acceptance"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <Label htmlFor="terms-acceptance" className="text-sm text-gray-700">
                I have read and agree to the terms and conditions
              </Label>
            </div>
          </CardContent>
        </Card>
        
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
            disabled={acceptOfferMutation.isPending || !termsAccepted}
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
