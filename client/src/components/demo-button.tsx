import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import OnboardingDemo from "./onboarding-demo";

interface DemoButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

export default function DemoButton({ className, variant = "outline", size = "sm" }: DemoButtonProps) {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDemo(true)}
        className={className}
      >
        <Play className="h-4 w-4 mr-2" />
        Tutorial
      </Button>

      <OnboardingDemo
        isOpen={showDemo}
        onClose={() => setShowDemo(false)}
        onComplete={() => setShowDemo(false)}
      />
    </>
  );
}