import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  Clock, 
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  Globe,
  Settings,
  Play,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Timer,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ReportViewer from "./report-viewer";

interface ReportTemplate {
  id: number;
  name: string;
  displayName: string;
  description: string;
  category: string;
  type: string;
  permissions: string[];
  parameters: any;
  chartConfig: any;
  columns: any[];
  filters: any;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportInstance {
  id: number;
  templateId: number;
  name: string;
  description: string;
  generatedBy: string;
  parameters: any;
  filters: any;
  data: any;
  summary: any;
  status: "generating" | "completed" | "failed" | "expired";
  generatedAt: string;
  expiresAt: string | null;
  fileSize: number | null;
  error: string | null;
  createdAt: string;
}

interface ReportExport {
  id: number;
  reportInstanceId: number | null;
  templateId: number | null;
  exportedBy: string;
  format: "pdf" | "excel" | "csv" | "json";
  fileName: string;
  filePath: string | null;
  fileSize: number | null;
  downloadCount: number;
  lastDownloaded: string | null;
  expiresAt: string;
  status: "generating" | "ready" | "failed" | "expired";
  error: string | null;
  createdAt: string;
}

export default function ReportsDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<ReportInstance | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [reportParameters, setReportParameters] = useState<any>({});
  const [dateRange, setDateRange] = useState<{start: Date, end: Date}>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  // Fetch report templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/reports/templates"],
  });

  // Fetch report instances
  const { data: instances = [], isLoading: instancesLoading } = useQuery<ReportInstance[]>({
    queryKey: ["/api/reports/instances"],
  });

  // Fetch report exports
  const { data: exports = [], isLoading: exportsLoading } = useQuery<ReportExport[]>({
    queryKey: ["/api/reports/exports"],
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/reports/generate", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated",
        description: "Your report has been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/instances"] });
      setGenerateDialogOpen(false);
      setSelectedInstance(data);
      setViewerOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    },
  });

  // Export report mutation
  const exportReportMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/reports/export", data);
    },
    onSuccess: () => {
      toast({
        title: "Export Started",
        description: "Your report export has been queued. Check the exports tab for download.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/exports"] });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export report",
        variant: "destructive",
      });
    },
  });

  // Delete instance mutation
  const deleteInstanceMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      return await apiRequest("DELETE", `/api/reports/instances/${instanceId}`);
    },
    onSuccess: () => {
      toast({
        title: "Report Deleted",
        description: "Report instance has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/instances"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete report",
        variant: "destructive",
      });
    },
  });

  const handleGenerateReport = () => {
    if (!selectedTemplate) return;

    const reportData = {
      templateId: selectedTemplate.id,
      name: `${selectedTemplate.displayName} - ${format(new Date(), "MMM dd, yyyy")}`,
      description: `Generated on ${format(new Date(), "PPpp")}`,
      parameters: {
        dateRange,
        ...reportParameters,
      },
      filters: {},
    };

    generateReportMutation.mutate(reportData);
  };

  const handleExportReport = (instance: ReportInstance, format: "pdf" | "excel" | "csv" | "json") => {
    exportReportMutation.mutate({
      reportInstanceId: instance.id,
      format,
      fileName: `${instance.name.replace(/\s+/g, '-').toLowerCase()}.${format}`,
    });
  };

  const handleViewReport = (instance: ReportInstance) => {
    setSelectedInstance(instance);
    setViewerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "generating":
        return <Badge variant="secondary"><Timer className="w-3 h-3 mr-1" />Generating</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "expired":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      case "ready":
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><Download className="w-3 h-3 mr-1" />Ready</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "admin":
        return <Settings className="w-4 h-4" />;
      case "user":
        return <Users className="w-4 h-4" />;
      case "business_intelligence":
        return <BarChart3 className="w-4 h-4" />;
      case "financial":
        return <DollarSign className="w-4 h-4" />;
      case "operational":
        return <Activity className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ReportTemplate[]>);

  // Recent instances
  const recentInstances = instances
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            Generate comprehensive reports and business intelligence insights
          </p>
        </div>
        <Button 
          onClick={() => setGenerateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {Object.keys(templatesByCategory).length} categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generated Reports</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instances.length}</div>
            <p className="text-xs text-muted-foreground">
              {instances.filter(i => i.status === "completed").length} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exports</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exports.length}</div>
            <p className="text-xs text-muted-foreground">
              {exports.filter(e => e.status === "ready").length} ready for download
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exports.reduce((sum, exp) => sum + (exp.downloadCount || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="instances">Generated Reports</TabsTrigger>
          <TabsTrigger value="exports">Export History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
              <Card key={category} className="p-0">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getCategoryIcon(category)}
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </CardTitle>
                  <CardDescription>
                    {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''} available
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categoryTemplates.map((template) => (
                    <div 
                      key={template.id}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setGenerateDialogOpen(true);
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{template.displayName}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {template.description}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>
                Your report history and cached instances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map((instance) => (
                    <TableRow key={instance.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{instance.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {instance.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(instance.status)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(instance.generatedAt), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {instance.expiresAt 
                          ? format(new Date(instance.expiresAt), "MMM dd, yyyy")
                          : "Never"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {instance.status === "completed" && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewReport(instance)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleExportReport(instance, "pdf")}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Export
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => deleteInstanceMutation.mutate(instance.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <CardDescription>
                Download your exported reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exports.map((exportRecord) => (
                    <TableRow key={exportRecord.id}>
                      <TableCell className="font-medium">
                        {exportRecord.fileName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {exportRecord.format.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(exportRecord.status)}
                      </TableCell>
                      <TableCell>
                        {exportRecord.fileSize 
                          ? `${Math.round(exportRecord.fileSize / 1024)} KB`
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {exportRecord.downloadCount || 0}
                      </TableCell>
                      <TableCell>
                        {format(new Date(exportRecord.createdAt), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {exportRecord.status === "ready" && (
                          <Button size="sm" variant="outline">
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Report Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              {selectedTemplate 
                ? `Configure parameters for: ${selectedTemplate.displayName}`
                : "Select a report template to generate"
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(dateRange.start, "MMM dd")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.start}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-sm text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(dateRange.end, "MMM dd")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.end}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setGenerateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateReport}
              disabled={!selectedTemplate || generateReportMutation.isPending}
            >
              {generateReportMutation.isPending && (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              )}
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Viewer Dialog */}
      {selectedInstance && (
        <ReportViewer
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          instance={selectedInstance}
          onExport={handleExportReport}
        />
      )}
    </div>
  );
}