import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Upload,
  AlertTriangle,
  Award,
  Building,
  CreditCard,
  User
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
  documents: VerificationDocument[];
  checks: VerificationCheck[];
}

interface VerificationDocument {
  id: number;
  documentType: string;
  fileName: string;
  verificationStatus: string;
  createdAt: string;
}

interface VerificationCheck {
  id: number;
  checkType: string;
  status: string;
  score?: number;
  maxScore?: number;
  performedAt?: string;
}

const statusColors = {
  unverified: "secondary",
  pending_documents: "yellow",
  under_review: "blue", 
  verified: "green",
  rejected: "red",
  suspended: "red"
} as const;

const statusIcons = {
  unverified: XCircle,
  pending_documents: Clock,
  under_review: Clock,
  verified: CheckCircle,
  rejected: XCircle,
  suspended: AlertTriangle
} as const;

const verificationLevels = {
  basic: { name: "Basic", icon: User, color: "blue" },
  enhanced: { name: "Enhanced", icon: Shield, color: "green" },
  premium: { name: "Premium", icon: Award, color: "purple" }
} as const;

export default function TraderVerificationSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: verificationRequests = [], isLoading } = useQuery({
    queryKey: ['/api/verification/requests'],
    enabled: !!user,
  });

  const createVerificationRequestMutation = useMutation({
    mutationFn: (data: { requestType: string }) => 
      apiRequest('/api/verification/request', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/verification/requests'] });
      toast({
        title: "Verification Request Submitted",
        description: "Your verification request has been submitted for review.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit verification request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentRequest = verificationRequests.find((req: VerificationRequest) => 
    req.status === "pending" || req.status === "in_progress" || req.status === "requires_additional_info"
  );

  const completedRequests = verificationRequests.filter((req: VerificationRequest) => 
    req.status === "approved" || req.status === "rejected"
  );

  const handleStartVerification = () => {
    createVerificationRequestMutation.mutate({ requestType: "initial" });
  };

  const getVerificationProgress = () => {
    if (!user) return 0;
    
    let progress = 0;
    
    // Basic profile completion
    if (user.companyName && user.phoneNumber && user.businessType) progress += 20;
    
    // License information
    if (user.licenseNumber) progress += 20;
    
    // Business details
    if (user.businessAddress && user.yearsOfExperience) progress += 20;
    
    // Verification status
    if (user.verificationStatus === "pending_documents") progress += 20;
    else if (user.verificationStatus === "under_review") progress += 30;
    else if (user.verificationStatus === "verified") progress = 100;
    
    return Math.min(progress, 100);
  };

  const getStatusMessage = () => {
    if (!user) return "";
    
    switch (user.verificationStatus) {
      case "unverified":
        return "Complete your profile and submit verification documents to get verified.";
      case "pending_documents":
        return "Please upload required verification documents to proceed.";
      case "under_review":
        return "Your verification is under review. We'll notify you once completed.";
      case "verified":
        return `Congratulations! You are verified at ${user.verificationLevel || 'basic'} level.`;
      case "rejected":
        return "Your verification was rejected. Please review the feedback and resubmit.";
      default:
        return "Start your verification process to build trust with other traders.";
    }
  };

  const renderVerificationOverview = () => {
    const StatusIcon = user?.verificationStatus ? statusIcons[user.verificationStatus as keyof typeof statusIcons] : XCircle;
    const progress = getVerificationProgress();
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Verification Status
            </CardTitle>
            <CardDescription>
              Build trust and credibility with the trading community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-8 w-8 ${
                  user?.verificationStatus === "verified" ? "text-green-500" : 
                  user?.verificationStatus === "under_review" ? "text-blue-500" :
                  user?.verificationStatus === "pending_documents" ? "text-yellow-500" :
                  "text-gray-400"
                }`} />
                <div>
                  <h3 className="font-semibold text-lg">
                    {user?.verificationStatus === "verified" ? "Verified Trader" :
                     user?.verificationStatus === "under_review" ? "Under Review" :
                     user?.verificationStatus === "pending_documents" ? "Pending Documents" :
                     "Unverified"}
                  </h3>
                  {user?.verificationLevel && user?.verificationStatus === "verified" && (
                    <Badge variant="secondary" className="mt-1">
                      {verificationLevels[user.verificationLevel as keyof typeof verificationLevels]?.name} Level
                    </Badge>
                  )}
                </div>
              </div>
              
              {user?.verificationStatus !== "verified" && (
                <Button 
                  onClick={handleStartVerification}
                  disabled={!!currentRequest || createVerificationRequestMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {currentRequest ? "Request In Progress" : "Start Verification"}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Verification Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                {getStatusMessage()}
              </AlertDescription>
            </Alert>

            {user?.verificationNotes && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Admin Notes:</strong> {user.verificationNotes}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Verification Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Benefits</CardTitle>
            <CardDescription>
              Why get verified on Currencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <Shield className="h-8 w-8 text-blue-500 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Increased Trust</h4>
                  <p className="text-sm text-muted-foreground">
                    Build credibility with verified badge and profile
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <CreditCard className="h-8 w-8 text-green-500 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Higher Limits</h4>
                  <p className="text-sm text-muted-foreground">
                    Access to larger transaction amounts
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <Building className="h-8 w-8 text-purple-500 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Priority Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Get priority customer support and assistance
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderVerificationRequests = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
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
                  Start your first verification request to get verified.
                </p>
              </div>
              <Button onClick={handleStartVerification}>
                Start Verification
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {currentRequest && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Current Request</CardTitle>
                  <CardDescription>
                    Request #{currentRequest.id} • {currentRequest.requestType}
                  </CardDescription>
                </div>
                <Badge variant={statusColors[currentRequest.status as keyof typeof statusColors]}>
                  {currentRequest.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Submitted: {new Date(currentRequest.createdAt).toLocaleDateString()}
                </div>
                
                {currentRequest.documents.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Submitted Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentRequest.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 p-2 border rounded">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{doc.documentType.replace('_', ' ')}</span>
                          <Badge variant={doc.verificationStatus === "verified" ? "default" : "secondary"} className="ml-auto">
                            {doc.verificationStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentRequest.rejectionReason && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Rejection Reason:</strong> {currentRequest.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {completedRequests.length > 0 && (
          <div>
            <h3 className="font-semibold mb-4">Previous Requests</h3>
            <div className="space-y-4">
              {completedRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Request #{request.id}</CardTitle>
                        <CardDescription>
                          {request.requestType} • {new Date(request.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={statusColors[request.status as keyof typeof statusColors]}>
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  {(request.adminNotes || request.rejectionReason) && (
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground">
                        {request.adminNotes || request.rejectionReason}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p>Please log in to access the verification system.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Trader Verification
        </h1>
        <p className="text-muted-foreground mt-2">
          Get verified to build trust and access enhanced trading features.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          {renderVerificationOverview()}
        </TabsContent>
        
        <TabsContent value="requests" className="mt-6">
          {renderVerificationRequests()}
        </TabsContent>
      </Tabs>
    </div>
  );
}