import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { useState, useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, mustChangePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (user && mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [user, mustChangePassword]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
      <ChangePasswordModal 
        open={showPasswordModal} 
        onOpenChange={(open) => {
          // Don't allow closing if password change is required
          if (!mustChangePassword) {
            setShowPasswordModal(open);
          }
        }} 
      />
    </Route>
  );
}