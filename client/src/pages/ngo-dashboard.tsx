import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ProjectorIcon, Clock, Leaf, Map, Upload, Eye, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProjectSchema } from "@shared/schema";

const projectFormSchema = insertProjectSchema.extend({
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  areaHectares: z.string().min(1, "Area is required"),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function NGODashboard() {
  const { account } = useWallet();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      latitude: "",
      longitude: "",
      areaHectares: "",
      projectType: "mangrove",
      submittedBy: account || "",
    },
  });

  // Get user's projects
  const { data: userProjects, isLoading } = useQuery({
    queryKey: ["/api/projects/user", account],
    enabled: !!account,
  });

  // Get user stats
  const projects = (userProjects as any)?.projects || [];
  const activeProjects = projects.filter((p: any) => p.status === "verified").length;
  const pendingProjects = projects.filter((p: any) => p.status === "pending").length;
  const totalCredits = projects.reduce((sum: number, p: any) => sum + parseFloat(p.carbonCredits || "0"), 0);
  const totalArea = projects.reduce((sum: number, p: any) => sum + parseFloat(p.areaHectares || "0"), 0);

  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectFormData) => 
      apiRequest("POST", "/api/projects", {
        ...data,
        submittedBy: account,
        latitude: data.latitude,
        longitude: data.longitude,
        areaHectares: data.areaHectares,
      }),
    onSuccess: () => {
      toast({ title: "Project submitted successfully!" });
      form.reset();
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/projects/user", account] });
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to submit a project.",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-secondary/10 text-secondary";
      case "pending": return "bg-muted text-muted-foreground";
      case "rejected": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-4">
              Please connect your wallet to access the NGO dashboard.
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
            <h1 className="text-3xl font-bold">NGO Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your blue carbon restoration projects</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-active-projects">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Projects</p>
                  <p className="text-2xl font-bold">{activeProjects}</p>
                </div>
                <ProjectorIcon className="text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-pending-review">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending Review</p>
                  <p className="text-2xl font-bold">{pendingProjects}</p>
                </div>
                <Clock className="text-secondary text-2xl" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-carbon-credits">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Carbon Credits</p>
                  <p className="text-2xl font-bold">{totalCredits.toFixed(0)}</p>
                </div>
                <Leaf className="text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-area-restored">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Area Restored</p>
                  <p className="text-2xl font-bold">{totalArea.toFixed(0)} ha</p>
                </div>
                <Map className="text-secondary text-2xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Project Registration Form */}
          <Card data-testid="project-registration-form">
            <CardHeader>
              <CardTitle>Register New Project</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Mangrove Restoration - Sundarbans" {...field} data-testid="input-project-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Sundarbans, Bangladesh" {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input placeholder="22.4924" {...field} data-testid="input-latitude" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input placeholder="89.1697" {...field} data-testid="input-longitude" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="areaHectares"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area (Hectares)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="15" {...field} data-testid="input-area" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-project-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mangrove">Mangrove Restoration</SelectItem>
                              <SelectItem value="seagrass">Seagrass Conservation</SelectItem>
                              <SelectItem value="saltmarsh">Salt Marsh Restoration</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your blue carbon restoration project..."
                            className="h-32"
                            {...field}
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <label className="block text-sm font-medium mb-2">Field Data Upload</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Upload className="mx-auto text-muted-foreground text-3xl mb-4" />
                      <p className="text-muted-foreground mb-2">Drop files here or click to browse</p>
                      <p className="text-sm text-muted-foreground">Photos, videos, and geo-data (Max 10MB each)</p>
                      <input 
                        type="file" 
                        multiple 
                        onChange={handleFileUpload}
                        className="hidden" 
                        accept="image/*,video/*"
                        data-testid="input-files"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        onClick={() => document.querySelector<HTMLInputElement>('[data-testid="input-files"]')?.click()}
                        data-testid="button-browse-files"
                      >
                        Browse Files
                      </Button>
                    </div>
                    {files.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">{files.length} file(s) selected:</p>
                        <ul className="text-sm text-muted-foreground">
                          {files.map((file, index) => (
                            <li key={index}>{file.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createProjectMutation.isPending}
                    data-testid="button-submit-project"
                  >
                    {createProjectMutation.isPending ? "Submitting..." : "Submit Project for Review"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Project List */}
          <Card data-testid="project-list">
            <CardHeader>
              <CardTitle>Your Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ProjectorIcon className="mx-auto h-12 w-12 mb-4" />
                  <p>No projects submitted yet.</p>
                  <p className="text-sm">Submit your first blue carbon restoration project!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project: any) => (
                    <div key={project.id} className="border border-border rounded-lg p-4" data-testid={`project-${project.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{project.name}</h4>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {project.latitude}, {project.longitude} • {project.areaHectares} ha restored
                      </p>
                      <div className="flex items-center justify-between">
                        {project.status === "verified" ? (
                          <span className="text-sm text-muted-foreground">
                            Credits: {parseFloat(project.carbonCredits || "0").toFixed(0)} BC
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Submitted: {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        <div className="flex space-x-2">
                          <Button size="sm" variant="ghost" data-testid={`button-view-${project.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" data-testid={`button-edit-${project.id}`}>
                            <Edit className="h-4 w-4" />
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
    </div>
  );
}
