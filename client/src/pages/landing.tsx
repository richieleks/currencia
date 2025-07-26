import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Clock, Users, AlertCircle, ArrowRight, CheckCircle, Globe, Mail, Phone, MapPin } from "lucide-react";
import Logo from "@/components/logo";

export default function Landing() {
  // Check for unauthorized access message
  const urlParams = new URLSearchParams(window.location.search);
  const unauthorizedMessage = urlParams.get('message');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <nav className="border-b border-gray-200/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.location.href = '/'}>
              <Logo variant="icon" className="h-8 w-8" />
              <Logo variant="wordmark" className="h-6" />
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost"
                className="hidden sm:inline-flex text-gray-600 hover:text-gray-900"
              >
                Features
              </Button>
              <Button 
                variant="ghost"
                className="hidden sm:inline-flex text-gray-600 hover:text-gray-900"
              >
                About
              </Button>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-primary-500 hover:bg-primary-600 shadow-lg hover:shadow-xl transition-all duration-200 group"
              >
                Sign In
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Show unauthorized access message if redirected from failed auth */}
        {unauthorizedMessage && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Access Denied</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                {decodeURIComponent(unauthorizedMessage)}
              </p>
            </div>
          </div>
        )}
        
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-8 animate-pulse">
            <CheckCircle className="h-4 w-4 mr-2" />
            Trusted by professional forex traders worldwide
          </div>
          
          <h1 className="text-6xl sm:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Professional 
            <span className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent"> Currency</span>
            <br />Exchange Platform
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Connect with verified forex bureaus in real-time. Post your exchange needs and receive competitive rates through our secure bidding system with complete transparency.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary-500 hover:bg-primary-600 text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-200 group"
            >
              Start Trading Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-lg px-8 py-4 border-2 hover:bg-gray-50"
            >
              Watch Demo
            </Button>
          </div>
          
          <div className="mt-12 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Bank-grade security
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Real-time rates
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              24/7 support
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-24">
          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-primary-600" />
              </div>
              <CardTitle className="text-xl">Competitive Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Get the best exchange rates through our competitive bidding system with verified forex bureaus worldwide.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Bank-Grade Security</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Enterprise-level security with encrypted transactions, verified traders, and comprehensive audit trails.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl">Real-time Trading</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Live chat-based trading room with instant rate offers, real-time notifications, and quick decision making.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Global Network</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed">
                Connect with verified forex bureaus and financial institutions across multiple countries and currencies.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-24">
          <div className="bg-gradient-to-br from-primary-500 to-blue-600 rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-4">Ready to Start Trading?</h2>
              <p className="text-xl mb-8 text-primary-100 max-w-2xl mx-auto">
                Join thousands of traders who trust Currencia for their currency exchange needs. Get access to the most competitive rates in the market.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg"
                  onClick={() => window.location.href = '/api/login'}
                  className="bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-200 group"
                >
                  Start Trading Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-primary-600 transition-all duration-200"
                >
                  Contact Sales
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm text-primary-100">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  No setup fees
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Secure platform
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  24/7 support
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Trusted by Financial Professionals</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">500K+</div>
              <div className="text-gray-600">Successful Trades</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">$2.5B+</div>
              <div className="text-gray-600">Volume Traded</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">180+</div>
              <div className="text-gray-600">Countries Served</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Footer */}
      <footer className="bg-gray-900 text-white mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Logo variant="icon" className="h-8 w-8" />
                <Logo variant="wordmark" className="h-6" />
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Professional currency exchange platform connecting traders worldwide with secure, transparent, and competitive forex solutions.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors cursor-pointer">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors cursor-pointer">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors cursor-pointer">
                  <Phone className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Services</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Currency Exchange</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Real-time Trading</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Rate Comparison</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Market Analysis</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Portfolio Management</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Support</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trading Guides</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">System Status</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Get in Touch</h3>
              <div className="space-y-4 text-gray-400">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5" />
                  <span>support@currencia.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 mt-1" />
                  <span>123 Financial District<br />New York, NY 10004</span>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3 text-gray-300">Business Hours</h4>
                <p className="text-gray-400 text-sm">Monday - Friday: 9:00 AM - 6:00 PM EST<br />Saturday: 10:00 AM - 4:00 PM EST</p>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-gray-400 text-sm">
                © 2025 Currencia. All rights reserved.
              </div>
              <div className="flex space-x-6 text-sm text-gray-400">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
                <a href="#" className="hover:text-white transition-colors">Security</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
