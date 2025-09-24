import { Link } from "wouter";
import { Leaf } from "lucide-react";
import WalletConnect from "./wallet-connect.tsx";

export default function Navbar() {
  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
            <Leaf className="text-primary text-2xl" />
            <span className="text-xl font-bold text-foreground">BlueCarbon MRV</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-home-nav">
              Home
            </Link>
            <Link href="/map" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-map">
              Map
            </Link>
            <Link href="/ngo-dashboard" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-ngo-dashboard">
              NGO Dashboard
            </Link>
            <Link href="/industry-dashboard" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-industry-dashboard">
              Industry Dashboard
            </Link>
            <Link href="/gov-dashboard" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-gov-dashboard">
              Government Analytics
            </Link>
            <Link href="/admin-dashboard" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-admin-dashboard">
              Admin Dashboard
            </Link>
          </div>

          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}
