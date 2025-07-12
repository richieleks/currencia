import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AuditLog } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Download, RefreshCw, Eye, AlertTriangle, CheckCircle, XCircle, Activity, User, Shield, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  success?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export default function AuditLogViewer() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch audit logs with filters
  const { data: auditLogs, isLoading, refetch } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs", filters],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Filter logs based on search term
  const filteredLogs = auditLogs?.filter(log => {
    const matchesSearch = !searchTerm || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  const getActionIcon = (action: string) => {
    if (action.includes("create")) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (action.includes("update") || action.includes("edit")) return <Settings className="h-4 w-4 text-blue-600" />;
    if (action.includes("delete")) return <XCircle className="h-4 w-4 text-red-600" />;
    if (action.includes("login") || action.includes("logout")) return <User className="h-4 w-4 text-purple-600" />;
    if (action.includes("suspend") || action.includes("ban")) return <Shield className="h-4 w-4 text-orange-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getSuccessBadge = (success: boolean) => {
    return (
      <Badge 
        variant={success ? "default" : "destructive"}
        className={success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
      >
        {success ? "Success" : "Failed"}
      </Badge>
    );
  };

  const getResourceBadge = (resource: string) => {
    const colorMap: Record<string, string> = {
      user: "bg-blue-100 text-blue-800",
      role: "bg-purple-100 text-purple-800",
      exchange_request: "bg-green-100 text-green-800",
      rate_offer: "bg-yellow-100 text-yellow-800",
      transaction: "bg-indigo-100 text-indigo-800",
      chat: "bg-pink-100 text-pink-800",
      system: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge className={colorMap[resource] || "bg-gray-100 text-gray-800"}>
        {resource.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  const exportLogs = () => {
    if (!filteredLogs?.length) return;
    
    const csvContent = [
      ["Timestamp", "User ID", "Action", "Resource", "Resource ID", "Status", "IP Address", "User Agent", "Details"].join(","),
      ...filteredLogs.map(log => [
        log.createdAt ? new Date(log.createdAt).toISOString() : "",
        log.userId || "",
        log.action,
        log.resource,
        log.resourceId || "",
        log.success ? "Success" : "Failed",
        log.ipAddress || "",
        log.userAgent || "",
        JSON.stringify(log.details || {}).replace(/"/g, '""')
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Audit Logs
          </CardTitle>
          <CardDescription>
            Monitor all system activities and user actions for security and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Actions */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Logs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by action, resource, user ID, or IP address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filters.action || ""} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, action: value || undefined }))
              }>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  <SelectItem value="user_create">User Create</SelectItem>
                  <SelectItem value="user_update">User Update</SelectItem>
                  <SelectItem value="user_suspend">User Suspend</SelectItem>
                  <SelectItem value="user_delete">User Delete</SelectItem>
                  <SelectItem value="role_create">Role Create</SelectItem>
                  <SelectItem value="role_update">Role Update</SelectItem>
                  <SelectItem value="role_delete">Role Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.resource || ""} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, resource: value || undefined }))
              }>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Resources</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="exchange_request">Exchange Request</SelectItem>
                  <SelectItem value="rate_offer">Rate Offer</SelectItem>
                  <SelectItem value="transaction">Transaction</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button variant="outline" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No audit logs found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {log.createdAt ? format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="font-medium">{formatAction(log.action)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getResourceBadge(log.resource)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {log.userId?.substring(0, 8) || "System"}...
                      </TableCell>
                      <TableCell>
                        {getSuccessBadge(log.success)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ipAddress || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewLogDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{filteredLogs.length}</div>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {filteredLogs.filter(log => log.success).length}
                </div>
                <p className="text-xs text-muted-foreground">Successful</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {filteredLogs.filter(log => !log.success).length}
                </div>
                <p className="text-xs text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {new Set(filteredLogs.map(log => log.userId)).size}
                </div>
                <p className="text-xs text-muted-foreground">Unique Users</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Timestamp</Label>
                  <p className="text-sm font-mono">
                    {selectedLog.createdAt ? format(new Date(selectedLog.createdAt), "yyyy-MM-dd HH:mm:ss") : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getSuccessBadge(selectedLog.success)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Action</Label>
                  <p className="text-sm">{formatAction(selectedLog.action)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Resource</Label>
                  <div className="mt-1">
                    {getResourceBadge(selectedLog.resource)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">User ID</Label>
                  <p className="text-sm font-mono">{selectedLog.userId || "System"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Resource ID</Label>
                  <p className="text-sm font-mono">{selectedLog.resourceId || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">IP Address</Label>
                  <p className="text-sm font-mono">{selectedLog.ipAddress || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">User Agent</Label>
                  <p className="text-sm text-muted-foreground truncate" title={selectedLog.userAgent || "N/A"}>
                    {selectedLog.userAgent || "N/A"}
                  </p>
                </div>
              </div>
              
              {selectedLog.details && (
                <div>
                  <Label className="text-sm font-medium">Additional Details</Label>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded border mt-1 overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}