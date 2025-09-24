import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/navbar";
import Home from "@/pages/home";
import NGODashboard from "@/pages/ngo-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import IndustryDashboard from "@/pages/industry-dashboard";
import GovDashboard from "@/pages/gov-dashboard";
import MapView from "@/pages/map-view";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/ngo-dashboard" component={NGODashboard} />
        <Route path="/admin-dashboard" component={AdminDashboard} />
        <Route path="/industry-dashboard" component={IndustryDashboard} />
        <Route path="/gov-dashboard" component={GovDashboard} />
        <Route path="/map" component={MapView} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
