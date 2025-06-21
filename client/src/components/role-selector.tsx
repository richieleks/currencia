import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface RoleSelectorProps {
  onRoleSelected: () => void;
}

export default function RoleSelector({ onRoleSelected }: RoleSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/auth/user/profile", { role: "trader" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Account setup complete",
        description: "Welcome to Currencia! You can now start trading.",
      });
      onRoleSelected();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set up account. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Automatically assign trader role when component mounts
    updateRoleMutation.mutate();
  }, []);

  const handleContinue = () => {
    onRoleSelected();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Currencia</h1>
          <p className="text-gray-600">Setting up your trading account...</p>
        </div>

        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary-600" />
            </div>
            <CardTitle>Trader Account</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Post currency exchange requests</li>
              <li>• Bid on other exchange requests</li>
              <li>• Set competitive exchange rates</li>
              <li>• Access real-time market insights</li>
              <li>• Manage multi-currency portfolio</li>
              <li>• Connect with forex bureau network</li>
            </ul>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                Complete trading platform for currency exchange - request exchanges, 
                provide competitive rates, and grow your forex business
              </p>
            </div>
          </CardContent>
        </Card>

        {updateRoleMutation.isPending && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin"></div>
              Setting up your account...
            </div>
          </div>
        )}

        {updateRoleMutation.isError && (
          <div className="text-center">
            <Button 
              size="lg"
              className="bg-primary-500 hover:bg-primary-600 px-8"
              onClick={handleContinue}
            >
              Continue to Platform
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}