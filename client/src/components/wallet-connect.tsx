import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";

export default function WalletConnect() {
  const { account, isConnected, isConnecting, connect, disconnect } = useWallet();

  if (isConnected && account) {
    return (
      <div className="flex items-center space-x-3" data-testid="wallet-status">
        <div className="flex items-center space-x-2 bg-accent px-3 py-2 rounded-lg">
          <div className="w-2 h-2 bg-secondary rounded-full"></div>
          <span className="text-sm font-medium">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={disconnect}
          data-testid="button-disconnect"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button 
      onClick={connect} 
      disabled={isConnecting}
      className="bg-primary text-primary-foreground hover:bg-primary/90"
      data-testid="button-connect-wallet"
    >
      <Wallet className="mr-2 h-4 w-4" />
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
