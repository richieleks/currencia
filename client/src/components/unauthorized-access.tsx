import { AlertTriangle, Home, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-red-900 dark:text-red-100">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              You are not registered in the Currencia system.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
                <Shield className="w-4 h-4" />
                <span className="font-medium">Administrator Registration Required</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                User registration is restricted to administrators only. Please contact your system administrator to create an account for you.
              </p>
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              onClick={() => window.location.href = '/api/logout'} 
              className="w-full"
              variant="outline"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Login
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>Need an account? Contact your administrator.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}