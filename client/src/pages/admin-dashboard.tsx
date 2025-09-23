import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Coins, Globe, Check, X, Eye, FolderOutput } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminDashboard() {
  const { account } = useWallet();
  const { toast } = useToast();
  const [verifyingProject, setVerifyingProject] = useState<string | null>(null);
  const [carbonCredits, setCarbonCredits] = useState("");

  // Get pending projects
  const { data: pendingData, isLoading: loadingPending } = useQuery({
    queryKey: ["/api/projects", "pending"],
    enabled: !!account,
  });

  // Get all projects for stats
  const { data: allProjectsData } = useQuery({
    queryKey: ["/api/projects"],
    enabled: !!account,
  });

  const projects = (allProjectsData as any)?.projects || [];
  const pendingProjects = (pendingData as any)?.projects || [];
  const verifiedProjects = projects.filter((p: any) => p.status === "verified");
  const totalCredits = verifiedProjects.reduce((sum: number, p: any) => sum + parseFloat(p.carbonCredits || "0"), 0);
  const totalArea = verifiedProjects.reduce((sum: number, p: any) => sum + parseFloat(p.areaHectares || "0"), 0);

  const verifyProjectMutation = useMutation({
    mutationFn: ({ projectId, status, credits }: { projectId: string; status: "verified" | "rejected"; credits?: string }) =>
      apiRequest("POST", `/api/projects/${projectId}/verify`, {
        status,
        verifiedBy: account,
        carbonCredits: credits,
        blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock transaction hash
      }),
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === "verified" ? "Project verified successfully!" : "Project rejected",
        description: variables.status === "verified" ? `Carbon credits will be minted.` : "The project has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setVerifyingProject(null);
      setCarbonCredits("");
    },
    onError: (error: any) => {
      toast({
        title: "Error processing project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerify = (projectId: string) => {
    if (!carbonCredits) {
      toast({
        title: "Carbon credits required",
        description: "Please enter the number of carbon credits to mint.",
        variant: "destructive",
      });
      return;
    }
    verifyProjectMutation.mutate({ projectId, status: "verified", credits: carbonCredits });
  };

  const handleReject = (projectId: string) => {
    verifyProjectMutation.mutate({ projectId, status: "rejected" });
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-4">
              Please connect your wallet to access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-12 bg-muted/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Review and verify blue carbon projects</p>
          </div>
          <Button variant="outline" data-testid="button-export-report">
            <FolderOutput className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Admin Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-pending-review">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending Review</p>
                  <p className="text-2xl font-bold text-secondary">{pendingProjects.length}</p>
                </div>
                <Clock className="text-secondary text-2xl" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-verified-projects">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Verified Projects</p>
                  <p className="text-2xl font-bold text-primary">{verifiedProjects.length}</p>
                </div>
                <CheckCircle className="text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-credits-minted">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Credits Minted</p>
                  <p className="text-2xl font-bold text-primary">{totalCredits.toFixed(0)}</p>
                </div>
                <Coins className="text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-area">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Area</p>
                  <p className="text-2xl font-bold text-secondary">{totalArea.toFixed(0)} ha</p>
                </div>
                <Globe className="text-secondary text-2xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Review Queue */}
        <Card data-testid="project-review-queue">
          <CardHeader>
            <CardTitle>Project Review Queue</CardTitle>
            <p className="text-muted-foreground">Review and verify submitted projects</p>
          </CardHeader>
          <CardContent>
            {loadingPending ? (
              <div className="space-y-6">
                {[1, 2].map(i => (
                  <div key={i} className="border-b border-border pb-6 animate-pulse">
                    <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : pendingProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="mx-auto h-12 w-12 mb-4" />
                <p>No projects pending review.</p>
                <p className="text-sm">All submitted projects have been processed.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingProjects.map((project: any) => (
                  <div key={project.id} className="py-6" data-testid={`project-review-${project.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="font-semibold">{project.name}</h4>
                          <Badge variant="secondary">High Priority</Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Location: <span className="font-medium">{project.location} ({project.latitude}, {project.longitude})</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Area: <span className="font-medium">{project.areaHectares} hectares</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Type: <span className="font-medium">{project.projectType}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Submitted: <span className="font-medium">{new Date(project.createdAt).toLocaleDateString()}</span>
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              Description: <span className="font-medium">{project.description}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-6">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                              data-testid={`button-approve-${project.id}`}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approve & Mint
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Verify Project & Mint Credits</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="carbon-credits">Carbon Credits to Mint</Label>
                                <Input
                                  id="carbon-credits"
                                  type="number"
                                  placeholder="Enter carbon credits amount"
                                  value={carbonCredits}
                                  onChange={(e) => setCarbonCredits(e.target.value)}
                                  data-testid="input-carbon-credits"
                                />
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  onClick={() => handleVerify(project.id)}
                                  disabled={verifyProjectMutation.isPending}
                                  data-testid="button-confirm-verify"
                                >
                                  {verifyProjectMutation.isPending ? "Processing..." : "Verify & Mint"}
                                </Button>
                                <DialogTrigger asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogTrigger>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="destructive"
                          onClick={() => handleReject(project.id)}
                          disabled={verifyProjectMutation.isPending}
                          data-testid={`button-reject-${project.id}`}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        
                        <Button variant="outline" data-testid={`button-review-${project.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
