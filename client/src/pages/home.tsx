import { Button } from "@/components/ui/button";
import { Sprout, Map, Upload, CheckCircle, Coins } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Restore Our Blue Planet
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Monitor, Report, and Verify blue carbon restoration projects through blockchain technology. 
              Earn tokenized carbon credits for verified mangrove and coastal ecosystem restoration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/ngo-dashboard">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-register-project">
                  <Sprout className="mr-2 h-5 w-5" />
                  Register Project
                </Button>
              </Link>
              <Link href="/map">
                <Button size="lg" variant="outline" data-testid="button-explore-map">
                  <Map className="mr-2 h-5 w-5" />
                  Explore Map
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border" data-testid="feature-submit">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Upload className="text-primary text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Submit Project</h3>
              <p className="text-muted-foreground">NGOs register restoration projects with geo-tagged photos and field data stored on IPFS.</p>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border" data-testid="feature-verify">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="text-secondary text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Verify & Approve</h3>
              <p className="text-muted-foreground">Certified administrators review projects and approve verified restoration efforts.</p>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border" data-testid="feature-earn">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Coins className="text-primary text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Earn Credits</h3>
              <p className="text-muted-foreground">Smart contracts mint tokenized carbon credits that can be transferred or retired.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Sprout className="text-primary text-2xl" />
                <span className="text-xl font-bold">BlueCarbon MRV</span>
              </div>
              <p className="text-muted-foreground mb-4">
                Blockchain-powered monitoring, reporting, and verification of blue carbon restoration projects.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/ngo-dashboard" className="hover:text-primary">NGO Dashboard</Link></li>
                <li><Link href="/admin-dashboard" className="hover:text-primary">Admin Dashboard</Link></li>
                <li><Link href="/map" className="hover:text-primary">Map</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Documentation</a></li>
                <li><a href="#" className="hover:text-primary">API</a></li>
                <li><a href="#" className="hover:text-primary">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 BlueCarbon MRV Registry. Powered by blockchain technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
