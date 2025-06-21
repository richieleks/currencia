import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Clock, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-[#111827]">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Currencia</span>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary-500 hover:bg-primary-600"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Professional Currency Exchange Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect with verified forex bureau in real-time. Post your exchange needs and receive competitive rates through our secure bidding system.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary-500 hover:bg-primary-600 text-lg px-8 py-3"
          >
            Start Trading Now
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-primary-600" />
              </div>
              <CardTitle>Competitive Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get the best exchange rates through our competitive bidding system with verified traders.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-success-600" />
              </div>
              <CardTitle>Secure Trading</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                All transactions are secure with verified traders and transparent rate comparisons.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-warning-600" />
              </div>
              <CardTitle>Real-time Trading</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Live chat-based trading room with instant rate offers and quick decision making.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <CardTitle>Professional Network</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect with a network of professional forex bureau and financial institutions.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Start Trading?</CardTitle>
              <CardDescription className="text-lg">
                Join thousands of traders who trust Currencia for their currency exchange needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Button 
                  size="lg"
                  onClick={() => window.location.href = '/api/login'}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  Start Trading Now
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                No setup fees • Secure platform • Professional support
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
