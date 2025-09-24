import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Globe, TrendingUp, Users, MapPin, AlertTriangle, CheckCircle } from "lucide-react";

interface PolicyInsight {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  region: string;
  recommendations: string[];
}

interface ProjectStats {
  region: string;
  projectsCount: number;
  areaRestored: number;
  carbonStored: number;
  communities: number;
}

export default function GovDashboard() {
  // Fetch national statistics
  const { data: nationalStats = {} } = useQuery<{
    totalCarbonStock?: number;
    yearOverYearGrowth?: number;
    verifiedProjects?: number;
    pendingVerification?: number;
    totalAreaRestored?: number;
    regions?: number;
    communitiesEngaged?: number;
    ngoPartners?: number;
  }>({
    queryKey: ["/api/government/national-stats"],
  });

  // Fetch regional breakdown
  const { data: regionalData = [] } = useQuery<ProjectStats[]>({
    queryKey: ["/api/government/regional-data"],
  });

  // Fetch policy insights
  const { data: policyInsights = [] } = useQuery<PolicyInsight[]>({
    queryKey: ["/api/government/policy-insights"],
  });

  // Fetch carbon trend data
  const { data: carbonTrends = [] } = useQuery<{month: string; carbonStored: number}[]>({
    queryKey: ["/api/government/carbon-trends"],
  });

  // Fetch ecosystem distribution
  const { data: ecosystemData = [] } = useQuery<{name: string; area: number}[]>({
    queryKey: ["/api/government/ecosystem-distribution"],
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="container mx-auto p-6 space-y-8" data-testid="gov-dashboard">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Government Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">National Blue Carbon Monitoring & Policy Insights</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Globe className="w-4 h-4 mr-2" />
          NCCR Policy Analytics
        </Badge>
      </div>

      {/* National Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Carbon Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-carbon-stock">
              {nationalStats.totalCarbonStock?.toLocaleString() || 0} tCO₂
            </div>
            <p className="text-xs text-muted-foreground">
              +{nationalStats.yearOverYearGrowth || 0}% from last year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Projects</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="verified-projects">
              {nationalStats.verifiedProjects || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {nationalStats.pendingVerification || 0} pending verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Area Restored</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="area-restored">
              {nationalStats.totalAreaRestored?.toLocaleString() || 0} ha
            </div>
            <p className="text-xs text-muted-foreground">
              Across {nationalStats.regions || 0} regions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Communities Engaged</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="communities-engaged">
              {nationalStats.communitiesEngaged || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {nationalStats.ngoPartners || 0} NGO partners
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="regional" data-testid="tab-regional">Regional Data</TabsTrigger>
          <TabsTrigger value="policy" data-testid="tab-policy">Policy Insights</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Carbon Storage Trends</CardTitle>
                <CardDescription>Monthly carbon sequestration progress</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={carbonTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="carbonStored" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Carbon Stored (tCO₂)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ecosystem Distribution</CardTitle>
                <CardDescription>Blue carbon ecosystems by area</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ecosystemData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="area"
                    >
                      {ecosystemData.map((entry, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Regional Performance</CardTitle>
              <CardDescription>Projects and restoration area by region</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regionalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="projectsCount" fill="#8884d8" name="Projects" />
                  <Bar dataKey="areaRestored" fill="#82ca9d" name="Area Restored (ha)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional Breakdown</CardTitle>
              <CardDescription>Detailed statistics by administrative region</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Area Restored (ha)</TableHead>
                    <TableHead>Carbon Stored (tCO₂)</TableHead>
                    <TableHead>Communities</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionalData.map((region) => (
                    <TableRow key={region.region}>
                      <TableCell className="font-medium">{region.region}</TableCell>
                      <TableCell>{region.projectsCount}</TableCell>
                      <TableCell>{region.areaRestored.toLocaleString()}</TableCell>
                      <TableCell>{region.carbonStored.toLocaleString()}</TableCell>
                      <TableCell>{region.communities}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={(region.areaRestored / 1000) * 100} 
                            className="w-20" 
                          />
                          <span className="text-sm">
                            {Math.round((region.areaRestored / 1000) * 100)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Policy Insights & Recommendations</CardTitle>
              <CardDescription>AI-generated insights for policy development</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {policyInsights.map((insight) => (
                <div key={insight.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{insight.title}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={insight.impact === 'high' ? 'destructive' : 
                                insight.impact === 'medium' ? 'default' : 'secondary'}
                      >
                        {insight.impact} impact
                      </Badge>
                      <Badge variant="outline">{insight.region}</Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">{insight.description}</p>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {insight.recommendations.map((rec, index) => (
                        <li key={index} className="text-gray-700 dark:text-gray-400">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Verification Compliance</CardTitle>
                <CardDescription>Project verification status overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>AI Verification Pass Rate</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={92} className="w-20" />
                      <span className="text-sm font-medium">92%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>GIS Validation Accuracy</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={87} className="w-20" />
                      <span className="text-sm font-medium">87%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Double-counting Prevention</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={100} className="w-20" />
                      <span className="text-sm font-medium">100%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Alerts</CardTitle>
                <CardDescription>Issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">Suspicious AI Results</p>
                      <p className="text-xs text-gray-600">3 projects flagged for manual review</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">GIS Validation Clean</p>
                      <p className="text-xs text-gray-600">All locations verified successfully</p>
                    </div>
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