import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  User,
  Award,
  AlertTriangle,
  Eye,
  Users,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VerificationRequest {
  id: number;
  userId: string;
  requestType: string;
  status: string;
  submittedDocuments: any[];
  adminNotes?: string;
  rejectionReason?: string;
  reviewStartedAt?: string;
  reviewCompletedAt?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  assignedAdmin?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface VerificationStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageProcessingTime: string;
}

const statusColors = {
  pending: "yellow",
  in_progress: "blue",
  approved: "green", 
  rejected: "red",
  requires_additional_info: "orange"
} as const;

const statusIcons = {
  pending: Clock,
  in_progress: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  requires_additional_info: AlertTriangle
} as const;

export default function AdminVerificationManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<{type: "approve" | "reject" | null; request: VerificationRequest | null}>({
    type: null,
    request: null
  });
  const [approvalLevel, setApprovalLevel] = useState<string>("basic");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const { data: verificationRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/admin/verification/requests', selectedStatus === "all" ? undefined : selectedStatus],
  });

  const { data: verificationStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/verification/stats'],
  });

  const approveRequestMutation = useMutation({
    mutationFn: ({ id, level }: { id: number; level: string }) => 
      apiRequest(`/api/admin/verification/request/${id}/approve`, 'PATCH', { level }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verification/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verification/stats'] });
      setActionDialog({ type: null, request: null });
      toast({
        title: "Request Approved",
        description: "The verification request has been approved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve verification request.",
        variant: "destructive",
      });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => 
      apiRequest(`/api/admin/verification/request/${id}/reject`, 'PATCH', { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verification/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verification/stats'] });
      setActionDialog({ type: null, request: null });
      setRejectionReason("");
      toast({
        title: "Request Rejected",
        description: "The verification request has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject verification request.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (actionDialog.request) {
      approveRequestMutation.mutate({
        id: actionDialog.request.id,
        level: approvalLevel
      });
    }
  };

  const handleReject = () => {
    if (actionDialog.request && rejectionReason.trim()) {
      rejectRequestMutation.mutate({
        id: actionDialog.request.id,
        reason: rejectionReason.trim()
      });
    }
  };

  const renderStatsOverview = () => {
    if (statsLoading || !verificationStats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{verificationStats.totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{verificationStats.pendingRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{verificationStats.approvedRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Processing</p>
                <p className="text-2xl font-bold">{verificationStats.averageProcessingTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRequestsList = () => {
    if (requestsLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (verificationRequests.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <h3 className="font-semibold">No Verification Requests</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedStatus === "all" ? 
                    "No verification requests found." : 
                    `No ${selectedStatus} verification requests found.`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {verificationRequests.map((request: VerificationRequest) => {
          const StatusIcon = statusIcons[request.status as keyof typeof statusIcons];
          
          return (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-5 w-5 ${
                      request.status === "approved" ? "text-green-500" :
                      request.status === "rejected" ? "text-red-500" :
                      request.status === "in_progress" ? "text-blue-500" :
                      "text-yellow-500"
                    }`} />
                    <div>
                      <CardTitle className="text-lg">
                        Request #{request.id}
                      </CardTitle>
                      <CardDescription>
                        {request.user.companyName || `${request.user.firstName} ${request.user.lastName}` || request.user.email}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[request.status as keyof typeof statusColors]}>
                      {request.status.replace('_', ' ')}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>
                    <p className="text-muted-foreground">{request.requestType}</p>
                  </div>
                  <div>
                    <span className="font-medium">Submitted:</span>
                    <p className="text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>
                    <p className="text-muted-foreground">{request.user.email}</p>
                  </div>
                  <div>
                    <span className="font-medium">Documents:</span>
                    <p className="text-muted-foreground">{request.submittedDocuments.length}</p>
                  </div>
                </div>
                
                {request.status === "pending" && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => setActionDialog({ type: "approve", request })}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setActionDialog({ type: "reject", request })}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Verification Management
          </h2>
          <p className="text-muted-foreground">
            Review and manage trader verification requests
          </p>
        </div>
        
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderStatsOverview()}
      {renderRequestsList()}

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Verification Request #{selectedRequest?.id}
            </DialogTitle>
            <DialogDescription>
              Review detailed information and documents
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Trader Information</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Name: {selectedRequest.user.companyName || `${selectedRequest.user.firstName} ${selectedRequest.user.lastName}`}</p>
                    <p>Email: {selectedRequest.user.email}</p>
                    <p>Type: {selectedRequest.requestType}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Request Details</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Status: {selectedRequest.status}</p>
                    <p>Submitted: {new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                    <p>Documents: {selectedRequest.submittedDocuments.length}</p>
                  </div>
                </div>
              </div>

              {selectedRequest.adminNotes && (
                <div>
                  <h4 className="font-medium">Admin Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.adminNotes}</p>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}
                  </AlertDescription>
                </Alert>
              )}

              {selectedRequest.status === "pending" && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => setActionDialog({ type: "approve", request: selectedRequest })}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setActionDialog({ type: "reject", request: selectedRequest })}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog 
        open={actionDialog.type === "approve"} 
        onOpenChange={() => setActionDialog({ type: null, request: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Verification Request</DialogTitle>
            <DialogDescription>
              Select the verification level for this trader
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Verification Level</label>
              <Select value={approvalLevel} onValueChange={setApprovalLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Basic - Standard verification
                    </div>
                  </SelectItem>
                  <SelectItem value="enhanced">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Enhanced - Additional checks
                    </div>
                  </SelectItem>
                  <SelectItem value="premium">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Premium - Full verification
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialog({ type: null, request: null })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={approveRequestMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveRequestMutation.isPending ? "Approving..." : "Approve Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog 
        open={actionDialog.type === "reject"} 
        onOpenChange={() => setActionDialog({ type: null, request: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this verification request
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                placeholder="Explain why this verification request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setActionDialog({ type: null, request: null });
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectRequestMutation.isPending}
            >
              {rejectRequestMutation.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}