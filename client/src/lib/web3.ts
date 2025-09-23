import { ethers, BrowserProvider, Contract, formatEther, parseEther, keccak256, toUtf8Bytes } from "ethers";

// BlueCarbon Token Contract ABI (simplified)
const BLUECARBON_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function burn(uint256 amount) external",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event ProjectVerified(string indexed projectId, uint256 creditsIssued)",
];

// Contract address (will be set after deployment)
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;

// Role hashes
const ADMIN_ROLE = keccak256(toUtf8Bytes("ADMIN_ROLE"));
const NGO_ROLE = keccak256(toUtf8Bytes("NGO_ROLE"));

export class Web3Service {
  private provider: BrowserProvider;
  private contract: Contract;

  constructor(provider: BrowserProvider) {
    this.provider = provider;
    this.contract = new Contract(CONTRACT_ADDRESS, BLUECARBON_ABI, provider);
  }

  async getCarbonCredits(address: string): Promise<string> {
    try {
      const balance = await this.contract.balanceOf(address);
      return formatEther(balance);
    } catch (error) {
      console.error("Error getting carbon credits:", error);
      return "0";
    }
  }

  async mintCredits(projectId: string, amount: string, recipientAddress: string): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const contractWithSigner = this.contract.connect(signer) as any;
      
      const amountWei = parseEther(amount);
      const tx = await contractWithSigner.mint(recipientAddress, amountWei);
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error minting credits:", error);
      throw error;
    }
  }

  async burnCredits(amount: string): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const contractWithSigner = this.contract.connect(signer) as any;
      
      const amountWei = parseEther(amount);
      const tx = await contractWithSigner.burn(amountWei);
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error burning credits:", error);
      throw error;
    }
  }

  async transferCredits(to: string, amount: string): Promise<string> {
    try {
      const signer = await this.provider.getSigner();
      const contractWithSigner = this.contract.connect(signer) as any;
      
      const amountWei = parseEther(amount);
      const tx = await contractWithSigner.transfer(to, amountWei);
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error transferring credits:", error);
      throw error;
    }
  }

  async hasRole(role: "admin" | "ngo", address: string): Promise<boolean> {
    try {
      const roleHash = role === "admin" ? ADMIN_ROLE : NGO_ROLE;
      return await this.contract.hasRole(roleHash, address);
    } catch (error) {
      console.error("Error checking role:", error);
      return false;
    }
  }
}
