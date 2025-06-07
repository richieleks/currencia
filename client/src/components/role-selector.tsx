import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users } from "lucide-react";

interface RoleSelectorProps {
  onRoleSelected: () => void;
}

export default function RoleSelector({ onRoleSelected }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<"subscriber" | "bidder" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: async (role: "subscriber" | "bidder") => {
      await apiRequest("PATCH", "/api/auth/user/role", { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role updated",
        description: "Your account has been set up successfully!",
      });
      onRoleSelected();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRoleSelect = () => {
    if (selectedRole) {
      updateRoleMutation.mutate(selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to ForexConnect</h1>
          <p className="text-gray-600">Choose your role to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedRole === "subscriber" ? "ring-2 ring-primary-500 bg-primary-50" : ""
            }`}
            onClick={() => setSelectedRole("subscriber")}
          >
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-primary-600" />
              </div>
              <CardTitle className="flex items-center justify-center gap-2">
                Subscriber
                <Badge className="bg-primary-100 text-primary-800">Popular</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Post currency exchange requests</li>
                <li>• Receive competitive rate offers</li>
                <li>• Choose the best rates from bidders</li>
                <li>• Access to priority support</li>
                <li>• Real-time market insights</li>
              </ul>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Perfect for individuals and businesses looking to exchange currencies at competitive rates</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedRole === "bidder" ? "ring-2 ring-success-500 bg-success-50" : ""
            }`}
            onClick={() => setSelectedRole("bidder")}
          >
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-success-600" />
              </div>
              <CardTitle className="flex items-center justify-center gap-2">
                Bidder
                <Badge className="bg-success-100 text-success-800">Professional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Bid on exchange requests</li>
                <li>• Set competitive exchange rates</li>
                <li>• Earn from currency exchanges</li>
                <li>• Access to trading analytics</li>
                <li>• Professional trader network</li>
              </ul>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Ideal for forex traders and financial institutions offering exchange services</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button 
            size="lg"
            className="bg-primary-500 hover:bg-primary-600 px-8"
            disabled={!selectedRole || updateRoleMutation.isPending}
            onClick={handleRoleSelect}
          >
            {updateRoleMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Setting up...
              </>
            ) : (
              `Continue as ${selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : 'User'}`
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-3">You can change your role later in settings</p>
        </div>
      </div>
    </div>
  );
}