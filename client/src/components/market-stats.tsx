import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Clock, DollarSign } from "lucide-react";

interface MarketStats {
  activeRequests: number;
  onlineBidders: number;
  avgResponseTime: string;
  todayVolume: string;
}

export default function MarketStats() {
  const { data: stats, isLoading } = useQuery<MarketStats>({
    queryKey: ["/api/market-stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      label: "Active Requests",
      value: stats?.activeRequests?.toString() || "0",
      icon: TrendingUp,
      color: "text-gray-900",
    },
    {
      label: "Online Bidders",
      value: stats?.onlineBidders?.toString() || "0",
      icon: Users,
      color: "text-success-600",
    },
    {
      label: "Avg Response Time",
      value: stats?.avgResponseTime || "N/A",
      icon: Clock,
      color: "text-gray-900",
    },
    {
      label: "Today's Volume",
      value: stats?.todayVolume || "$0",
      icon: DollarSign,
      color: "text-gray-900",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <item.icon className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">{item.label}</span>
              </div>
              <span className={`font-semibold ${item.color}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
