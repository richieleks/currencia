import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DemoResetButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

export default function DemoResetButton({ className, variant = "outline", size = "sm" }: DemoResetButtonProps) {
  const { user } = useAuth();

  const resetDemo = () => {
    if (user) {
      localStorage.removeItem(`demo_completed_${user.id}`);
      // Reload the page to show the demo banner again
      window.location.reload();
    }
  };

  // Only show in development or for testing
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={resetDemo}
      className={className}
      title="Reset Demo Status (Development Only)"
    >
      <RotateCcw className="h-4 w-4 mr-2" />
      Reset Demo
    </Button>
  );
}