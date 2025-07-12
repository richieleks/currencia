import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Users, 
  Wifi, 
  Clock, 
  MapPin, 
  Monitor,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap,
  Database,
  Server
} from "lucide-react";
import { format } from "date-fns";

interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: string;
  isOnline: boolean;
  sessionDuration: number;
  location?: string;
}

interface SystemMetrics {
  totalSessions: number;
  activeSessions: number;
  websocketConnections: number;
  avgSessionDuration: number;
  peakConcurrentUsers: number;
  systemUptime: number;
  databaseConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface RecentActivity {
  id: string;
  timestamp: string;
  type: 'login' | 'logout' | 'action' | 'error';
  userId: string;
  userName: string;
  description: string;
  ipAddress: string;
}

export default function SystemActivityMonitor() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Fetch active sessions
  const { data: activeSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['/api/admin/active-sessions'],
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Fetch system metrics
  const { data: systemMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/admin/system-metrics'],
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Fetch recent activity
  const { data: recentActivity, refetch: refetchActivity } = useQuery({
    queryKey: ['/api/admin/recent-activity'],
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const refreshAll = () => {
    refetchSessions();
    refetchMetrics();
    refetchActivity();
  };

  const getSessionStatusBadge = (isOnline: boolean, lastActivity: string) => {
    const lastActivityTime = new Date(lastActivity);
    const now = new Date();
    const minutesSinceActivity = (now.getTime() - lastActivityTime.getTime()) / (1000 * 60);

    if (isOnline && minutesSinceActivity < 5) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    } else if (minutesSinceActivity < 15) {
      return <Badge className="bg-yellow-100 text-yellow-800">Idle</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'logout':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      case 'action':
        return <Zap className="h-4 w-4 text-blue-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6" />
            System Activity Monitor
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time monitoring of user sessions and system activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 border-green-200" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemMetrics?.activeSessions || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">WebSocket Connections</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemMetrics?.websocketConnections || 0}
                </p>
              </div>
              <Wifi className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Session Duration</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemMetrics?.avgSessionDuration ? formatDuration(systemMetrics.avgSessionDuration) : "0m"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Uptime</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemMetrics?.systemUptime ? formatDuration(systemMetrics.systemUptime) : "0m"}
                </p>
              </div>
              <Server className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active Sessions
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            System Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active User Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Session Duration</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Device/Browser</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSessions?.length ? (
                      activeSessions.map((session: ActiveSession) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{session.userName}</p>
                              <p className="text-sm text-gray-500">{session.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSessionStatusBadge(session.isOnline, session.lastActivity)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {session.ipAddress}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDuration(session.sessionDuration)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(session.lastActivity), "HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-600 truncate max-w-[200px]" title={session.userAgent}>
                              {session.userAgent.split(' ')[0]}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <p className="text-gray-500">No active sessions</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity?.length ? (
                  recentActivity.map((activity: RecentActivity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{activity.userName}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-600">{activity.description}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{format(new Date(activity.timestamp), "HH:mm:ss")}</span>
                          <span>•</span>
                          <span>{activity.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Connections</span>
                    <Badge className="bg-green-100 text-green-800">
                      {systemMetrics?.databaseConnections || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Connection Status</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Query Performance</span>
                    <Badge className="bg-green-100 text-green-800">Optimal</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Server Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Memory Usage</span>
                    <span className="text-sm font-medium">
                      {systemMetrics?.memoryUsage ? formatBytes(systemMetrics.memoryUsage) : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">CPU Usage</span>
                    <span className="text-sm font-medium">
                      {systemMetrics?.cpuUsage ? `${systemMetrics.cpuUsage.toFixed(1)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Peak Concurrent Users</span>
                    <span className="text-sm font-medium">
                      {systemMetrics?.peakConcurrentUsers || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}