import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ShoppingCart, Award, TrendingUp, Leaf, FileText, Download } from "lucide-react";
import { useState } from "react";

interface CarbonCredit {
  id: string;
  projectId: string;
  projectName: string;
  location: string;
  ecosystem: string;
  areaHectares: number;
  creditsAvailable: number;
  pricePerCredit: number;
  nftTokenId?: number;
  verifiedAt: string;
  submitterOrg: string;
}

interface PurchaseHistory {
  id: string;
  projectId: string;
  projectName: string;
  creditsRetired: number;
  retirementReason: string;
  retiredAt: string;
  nftCertificateUrl?: string;
}

export default function IndustryDashboard() {
  const [selectedCredit, setSelectedCredit] = useState<CarbonCredit | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState(0);

  // Fetch available carbon credits
  const { data: availableCredits = [], isLoading: loadingCredits } = useQuery<CarbonCredit[]>({
    queryKey: ["/api/credits/marketplace"],
  });

  // Fetch purchase history
  const { data: purchaseHistory = [], isLoading: loadingHistory } = useQuery<PurchaseHistory[]>({
    queryKey: ["/api/credits/purchase-history"],
  });

  // Fetch industry statistics
  const { data: stats = {} } = useQuery<{
    totalCreditsPurchased?: number;
    monthlyGrowth?: number;
    totalCO2Offset?: number;
    projectsSupported?: number;
    countries?: number;
    nftCertificates?: number;
  }>({
    queryKey: ["/api/industry/stats"],
  });

  // Purchase credits mutation
  const purchaseMutation = useMutation({
    mutationFn: async (data: { projectId: string; credits: number; retirementReason: string }) => {
      const response = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Purchase failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credits/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/purchase-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/industry/stats"] });
      toast({
        title: "Credits Purchased Successfully",
        description: "Your carbon credits have been retired and NFT certificate generated.",
      });
      setSelectedCredit(null);
      setPurchaseAmount(0);
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase carbon credits",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (retirementReason: string) => {
    if (!selectedCredit || purchaseAmount <= 0) return;
    
    purchaseMutation.mutate({
      projectId: selectedCredit.projectId,
      credits: purchaseAmount,
      retirementReason,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-8" data-testid="industry-dashboard">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Industry Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Purchase verified carbon credits to offset your emissions</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Leaf className="w-4 h-4 mr-2" />
          Corporate Buyer
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits Purchased</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-credits-purchased">
              {stats.totalCreditsPurchased?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyGrowth || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CO2 Offset (tons)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="co2-offset">
              {stats.totalCO2Offset?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Lifetime carbon footprint reduction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects Supported</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="projects-supported">
              {stats.projectsSupported || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {stats.countries || 0} countries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NFT Certificates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="nft-certificates">
              {stats.nftCertificates || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Proof of offset certificates owned
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="marketplace" data-testid="tab-marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Purchase History</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Carbon Credits</CardTitle>
              <CardDescription>
                Purchase verified blue carbon credits from restoration projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCredits ? (
                <div className="text-center py-8">Loading available credits...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Ecosystem</TableHead>
                      <TableHead>Area (ha)</TableHead>
                      <TableHead>Credits Available</TableHead>
                      <TableHead>Price per Credit</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableCredits.map((credit) => (
                      <TableRow key={credit.id}>
                        <TableCell className="font-medium">{credit.projectName}</TableCell>
                        <TableCell>{credit.location}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{credit.ecosystem}</Badge>
                        </TableCell>
                        <TableCell>{credit.areaHectares}</TableCell>
                        <TableCell>{credit.creditsAvailable}</TableCell>
                        <TableCell>${credit.pricePerCredit}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => setSelectedCredit(credit)}
                                data-testid={`button-purchase-${credit.projectId}`}
                              >
                                Purchase
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Purchase Carbon Credits</DialogTitle>
                                <DialogDescription>
                                  Purchase credits from {credit.projectName} to offset your emissions
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Number of Credits</label>
                                  <input
                                    type="number"
                                    className="w-full mt-1 p-2 border rounded"
                                    max={credit.creditsAvailable}
                                    min="1"
                                    value={purchaseAmount}
                                    onChange={(e) => setPurchaseAmount(parseInt(e.target.value))}
                                    data-testid="input-purchase-amount"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Total: ${(purchaseAmount * credit.pricePerCredit).toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Retirement Reason</label>
                                  <select 
                                    className="w-full mt-1 p-2 border rounded"
                                    onChange={(e) => handlePurchase(e.target.value)}
                                    data-testid="select-retirement-reason"
                                  >
                                    <option value="">Select reason...</option>
                                    <option value="Annual carbon offset program">Annual carbon offset program</option>
                                    <option value="Event carbon neutrality">Event carbon neutrality</option>
                                    <option value="Corporate sustainability goals">Corporate sustainability goals</option>
                                    <option value="Product lifecycle offset">Product lifecycle offset</option>
                                    <option value="Voluntary climate action">Voluntary climate action</option>
                                  </select>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>
                View your carbon credit purchases and offset certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="text-center py-8">Loading purchase history...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Credits Retired</TableHead>
                      <TableHead>Retirement Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseHistory.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">{purchase.projectName}</TableCell>
                        <TableCell>{purchase.creditsRetired}</TableCell>
                        <TableCell>{purchase.retirementReason}</TableCell>
                        <TableCell>{new Date(purchase.retiredAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {purchase.nftCertificateUrl ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-download-certificate-${purchase.id}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          ) : (
                            <Badge variant="secondary">Processing</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}