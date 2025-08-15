import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/logo";

export default function AuthPage() {
  const { user, loginMutation, isLoading } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  // Redirect if already logged in
  if (user) {
    window.location.href = "/";
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await loginMutation.mutateAsync(loginForm);
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Login Form */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <Logo className="h-12 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome to Currencia</CardTitle>
              <CardDescription>
                Sign in to access the currency exchange platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginForm.email}
                        onChange={handleInputChange}
                        required
                        data-testid="input-email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={handleInputChange}
                          required
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {loginMutation.error && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {loginMutation.error.message}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending || isLoading}
                      data-testid="button-sign-in"
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right side - Hero Section */}
        <div className="lg:block hidden">
          <div className="space-y-6 p-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Currency Exchange Made Simple
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Connect with verified forex bureaus through our competitive bidding system
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Real-time Bidding</h3>
                  <p className="text-gray-600 dark:text-gray-300">Get competitive rates from multiple verified traders</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Secure Transactions</h3>
                  <p className="text-gray-600 dark:text-gray-300">Bank-grade security with verified trader profiles</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Live Chat Support</h3>
                  <p className="text-gray-600 dark:text-gray-300">Communicate directly with traders in real-time</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Supported Currencies</h4>
              <div className="flex flex-wrap gap-2">
                {["USD", "EUR", "GBP", "UGX", "KES"].map((currency) => (
                  <span
                    key={currency}
                    className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {currency}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}