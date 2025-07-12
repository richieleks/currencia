import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { 
  Download, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  Globe,
  Activity,
  Calendar,
  Clock
} from "lucide-react";
import { format } from "date-fns";

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
  status: string;
  generatedAt: string;
  expiresAt: string | null;
  fileSize: number | null;
  error: string | null;
  createdAt: string;
}

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  instance: ReportInstance;
  onExport: (instance: ReportInstance, format: "pdf" | "excel" | "csv" | "json") => void;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'];

export default function ReportViewer({ isOpen, onClose, instance, onExport }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel" | "csv" | "json">("pdf");

  if (!instance || !instance.data) return null;

  const { data, summary, parameters } = instance;

  const handleExport = () => {
    onExport(instance, exportFormat);
  };

  const renderChart = (chartData: any[], type: string, dataKey: string, nameKey: string) => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={dataKey} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={dataKey} stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={dataKey} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Chart type not supported</div>;
    }
  };

  const renderSystemOverview = () => {
    if (!data.summary) return null;

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalTransactions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.summary.totalVolume?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.activeRequests}</div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Transactions Chart */}
        {data.charts?.dailyTransactions && (
          <Card>
            <CardHeader>
              <CardTitle>Daily Transaction Volume</CardTitle>
              <CardDescription>Transaction count and volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              {renderChart(data.charts.dailyTransactions, "area", "volume", "date")}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderUserActivity = () => {
    if (!data.userActivity) return null;

    return (
      <div className="space-y-6">
        {/* Top Traders */}
        {data.topTraders && (
          <Card>
            <CardHeader>
              <CardTitle>Top Active Traders</CardTitle>
              <CardDescription>Most active users by combined activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Offers</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topTraders.slice(0, 10).map((user: any, index: number) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.companyName || `${user.firstName} ${user.lastName}`}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{user.totalRequests}</TableCell>
                      <TableCell>{user.totalOffers}</TableCell>
                      <TableCell>{user.totalTransactions}</TableCell>
                      <TableCell>
                        {user.lastActive ? format(new Date(user.lastActive), "MMM dd, yyyy") : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderTransactionVolume = () => {
    if (!data.summary) return null;

    return (
      <div className="space-y-6">
        {/* Volume Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.summary.totalVolume?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalTransactions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.summary.averageTransaction?.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Volume by Date Chart */}
        {data.charts?.volumeByDate && (
          <Card>
            <CardHeader>
              <CardTitle>Volume by Date</CardTitle>
              <CardDescription>Daily transaction volume trends</CardDescription>
            </CardHeader>
            <CardContent>
              {renderChart(data.charts.volumeByDate, "bar", "volume", "date")}
            </CardContent>
          </Card>
        )}

        {/* Volume by Currency Chart */}
        {data.charts?.volumeByCurrency && (
          <Card>
            <CardHeader>
              <CardTitle>Volume by Currency</CardTitle>
              <CardDescription>Transaction volume distribution by currency</CardDescription>
            </CardHeader>
            <CardContent>
              {renderChart(data.charts.volumeByCurrency, "pie", "volume", "currency")}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderCurrencyAnalysis = () => {
    return (
      <div className="space-y-6">
        {/* Currency Pairs Table */}
        {data.currencyPairs && (
          <Card>
            <CardHeader>
              <CardTitle>Currency Pair Analysis</CardTitle>
              <CardDescription>Popular currency exchange pairs and their metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency Pair</TableHead>
                    <TableHead>Total Requests</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Total Volume</TableHead>
                    <TableHead>Avg Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.currencyPairs.slice(0, 10).map((pair: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">{pair.fromCurrency} → {pair.toCurrency}</Badge>
                      </TableCell>
                      <TableCell>{pair.totalRequests}</TableCell>
                      <TableCell>{pair.completedTransactions}</TableCell>
                      <TableCell>
                        {pair.totalRequests > 0 
                          ? `${((pair.completedTransactions / pair.totalRequests) * 100).toFixed(1)}%`
                          : "0%"
                        }
                      </TableCell>
                      <TableCell>${pair.totalVolume?.toLocaleString()}</TableCell>
                      <TableCell>${pair.avgAmount?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Popular Currencies Chart */}
        {data.popularCurrencies && (
          <Card>
            <CardHeader>
              <CardTitle>Popular Currencies</CardTitle>
              <CardDescription>Most frequently traded currencies</CardDescription>
            </CardHeader>
            <CardContent>
              {renderChart(data.popularCurrencies.slice(0, 8), "bar", "requests", "currency")}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderMarketTrends = () => {
    return (
      <div className="space-y-6">
        {/* Daily Activity Chart */}
        {data.dailyActivity && (
          <Card>
            <CardHeader>
              <CardTitle>Daily Market Activity</CardTitle>
              <CardDescription>New requests and active users over time</CardDescription>
            </CardHeader>
            <CardContent>
              {renderChart(data.dailyActivity, "line", "newRequests", "date")}
            </CardContent>
          </Card>
        )}

        {/* Peak Hours Chart */}
        {data.peakHours && (
          <Card>
            <CardHeader>
              <CardTitle>Peak Trading Hours</CardTitle>
              <CardDescription>Request activity by hour of day</CardDescription>
            </CardHeader>
            <CardContent>
              {renderChart(data.peakHours, "bar", "requests", "hour")}
            </CardContent>
          </Card>
        )}

        {/* Response Time Analysis */}
        {data.responseTimeAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle>Response Time Analysis</CardTitle>
              <CardDescription>Average response time by currency pair</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency Pair</TableHead>
                    <TableHead>Avg Response Time</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.responseTimeAnalysis.slice(0, 10).map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">{item.currencyPair}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.avgResponseMinutes ? `${item.avgResponseMinutes.toFixed(1)} min` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {item.avgResponseMinutes < 5 && (
                          <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                        )}
                        {item.avgResponseMinutes >= 5 && item.avgResponseMinutes < 15 && (
                          <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
                        )}
                        {item.avgResponseMinutes >= 15 && (
                          <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderReportContent = () => {
    // Determine report type from template or data structure
    if (data.summary && data.charts?.dailyTransactions) {
      return renderSystemOverview();
    } else if (data.userActivity || data.topTraders) {
      return renderUserActivity();
    } else if (data.summary && data.charts?.volumeByDate) {
      return renderTransactionVolume();
    } else if (data.currencyPairs || data.popularCurrencies) {
      return renderCurrencyAnalysis();
    } else if (data.dailyActivity || data.peakHours) {
      return renderMarketTrends();
    } else {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>This report type is not yet supported in the viewer.</p>
              <p className="text-sm">You can export the report to view the raw data.</p>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{instance.name}</DialogTitle>
              <DialogDescription>
                {instance.description} • Generated {format(new Date(instance.generatedAt), "PPp")}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Report Data</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {renderReportContent()}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Report Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Generated:</span>
                    <span>{format(new Date(instance.generatedAt), "PPp")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline">{instance.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template ID:</span>
                    <span>{instance.templateId}</span>
                  </div>
                  {instance.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires:</span>
                      <span>{format(new Date(instance.expiresAt), "PPp")}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(instance.parameters, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}