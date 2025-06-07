import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Play, Users } from "lucide-react";

export default function DemoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Live Trading Demo</h3>
                <p className="text-sm text-blue-700">
                  Experience the complete forex marketplace workflow
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <Users className="w-3 h-3 mr-1" />
                Active
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-blue-600 bg-blue-100 rounded-lg p-2">
            <strong>How it works:</strong> Post exchange requests → Receive competitive offers → Accept best rates → Complete transactions
          </div>
        </CardContent>
      </Card>
    </div>
  );
}