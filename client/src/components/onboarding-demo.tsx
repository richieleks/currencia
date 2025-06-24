import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Play, 
  MessageSquare, 
  TrendingUp, 
  DollarSign, 
  Users,
  CheckCircle,
  Zap,
  Briefcase
} from "lucide-react";

interface DemoStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position: "center" | "top" | "bottom" | "left" | "right";
  action?: () => void;
  autoNext?: boolean;
  delay?: number;
}

interface OnboardingDemoProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const demoSteps: DemoStep[] = [
  {
    id: "welcome",
    title: "Welcome to Currencia!",
    description: "Let's take a quick tour of the currency exchange trading platform. This demo will show you how to request exchanges, receive offers, and communicate with other traders.",
    position: "center",
  },
  {
    id: "exchange-form",
    title: "Create Exchange Requests",
    description: "Start by creating an exchange request. Specify the currencies you want to exchange, the amount, and your desired rate. Other traders will see your request and can make offers.",
    targetSelector: "[data-demo='exchange-form']",
    position: "right",
  },
  {
    id: "active-requests",
    title: "View Active Requests",
    description: "All active exchange requests from other users appear here. You can browse available opportunities and make competitive offers on requests that match your trading interests.",
    targetSelector: "[data-demo='active-requests']",
    position: "left",
  },
  {
    id: "market-stats",
    title: "Monitor Market Activity",
    description: "Keep track of market statistics including active requests, online bidders, response times, and daily trading volume to make informed trading decisions.",
    targetSelector: "[data-demo='market-stats']",
    position: "bottom",
  },
  {
    id: "chat-room",
    title: "Public Trading Chat",
    description: "The chat room displays all trading activity in real-time. You'll see new requests, offers, and completed transactions. It's a great way to stay updated on market activity.",
    targetSelector: "[data-demo='chat-room']",
    position: "top",
  },
  {
    id: "private-messaging",
    title: "Private Messaging",
    description: "When you make an offer or receive one, you can use private messaging to negotiate details directly with other traders. Click the 'Messages' button in the sidebar to access your conversations.",
    targetSelector: "[data-demo='messages-button']",
    position: "right",
  },
  {
    id: "portfolio",
    title: "Manage Your Portfolio",
    description: "Access your portfolio to view balances across different currencies, manage your active currencies, and track your trading performance.",
    targetSelector: "[data-demo='portfolio-button']",
    position: "right",
  },
  {
    id: "offers-process",
    title: "Making and Receiving Offers",
    description: "When you click on an exchange request, you can make an offer with your preferred rate. When others make offers on your requests, you'll receive notifications and can accept, decline, or message the bidder.",
    position: "center",
  },
  {
    id: "completion",
    title: "You're Ready to Trade!",
    description: "That's the basics of Currencia! Start by creating an exchange request or browsing available opportunities. Remember, you can always message other traders to discuss details before accepting offers.",
    position: "center",
  },
];

export default function OnboardingDemo({ isOpen, onClose, onComplete }: OnboardingDemoProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);

  const currentStepData = demoSteps[currentStep];

  useEffect(() => {
    if (isOpen && currentStepData?.targetSelector) {
      const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
      setHighlightElement(element);
      
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setHighlightElement(null);
    }
  }, [currentStep, isOpen, currentStepData]);

  useEffect(() => {
    if (isOpen) {
      // Add overlay styles
      document.body.style.overflow = "hidden";
      const overlay = document.createElement("div");
      overlay.id = "demo-overlay";
      overlay.className = "fixed inset-0 bg-black bg-opacity-50 z-[9998] pointer-events-none";
      document.body.appendChild(overlay);

      return () => {
        document.body.style.overflow = "";
        const existingOverlay = document.getElementById("demo-overlay");
        if (existingOverlay) {
          existingOverlay.remove();
        }
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (highlightElement) {
      // Add highlight styles
      const originalZIndex = highlightElement.style.zIndex;
      const originalPosition = highlightElement.style.position;
      const originalBoxShadow = highlightElement.style.boxShadow;
      
      highlightElement.style.position = "relative";
      highlightElement.style.zIndex = "9999";
      highlightElement.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)";
      highlightElement.style.borderRadius = "8px";
      highlightElement.classList.add("demo-highlight");

      return () => {
        highlightElement.style.zIndex = originalZIndex;
        highlightElement.style.position = originalPosition;
        highlightElement.style.boxShadow = originalBoxShadow;
        highlightElement.classList.remove("demo-highlight");
      };
    }
  }, [highlightElement]);

  // Auto-close demo after 30 seconds
  useEffect(() => {
    let countdown: NodeJS.Timeout;
    if (isOpen) {
      countdown = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            onClose();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeRemaining(30);
    }

    return () => {
      if (countdown) clearInterval(countdown);
    };
  }, [isOpen, onClose]);

  const nextStep = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const startDemo = () => {
    setIsPlaying(true);
    if (currentStep === 0) {
      nextStep();
    }
  };

  if (!isOpen) return null;

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case "welcome":
      case "completion":
        return <Play className="h-5 w-5" />;
      case "exchange-form":
        return <DollarSign className="h-5 w-5" />;
      case "active-requests":
        return <TrendingUp className="h-5 w-5" />;
      case "market-stats":
        return <Users className="h-5 w-5" />;
      case "chat-room":
      case "private-messaging":
        return <MessageSquare className="h-5 w-5" />;
      case "portfolio":
        return <Briefcase className="h-5 w-5" />;
      case "offers-process":
        return <Zap className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md z-[10000]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  {getStepIcon(currentStepData.id)}
                </div>
                <div>
                  <DialogTitle className="text-lg">{currentStepData.title}</DialogTitle>
                  <DialogDescription className="text-sm">
                    Step {currentStep + 1} of {demoSteps.length} • Auto-close in {timeRemaining}s
                  </DialogDescription>
                </div>
              </div>
              
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / demoSteps.length) * 100}%` }}
              />
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {currentStepData.description}
            </div>

            {currentStep === 0 && !isPlaying && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">Interactive Demo</span>
                </div>
                <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                  This demo will highlight different parts of the interface and guide you through the trading process.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={prevStep} size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {currentStep === 0 && !isPlaying ? (
                  <Button onClick={startDemo} className="bg-primary-600 hover:bg-primary-700">
                    <Play className="h-4 w-4 mr-2" />
                    Start Demo
                  </Button>
                ) : currentStep < demoSteps.length - 1 ? (
                  <Button onClick={nextStep}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Demo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </>
  );
}