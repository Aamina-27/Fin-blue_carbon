// Using mock IPFS implementation due to dependency conflicts
// import { Web3Storage } from "web3.storage";

const WEB3_STORAGE_TOKEN = process.env.VITE_WEB3_STORAGE_TOKEN || "";

if (!WEB3_STORAGE_TOKEN) {
  console.warn("Web3.storage token not found. File uploads will be simulated.");
}

export class IPFSService {
  private client: any = null; // Mock implementation

  constructor() {
    // Mock implementation for testing
    this.client = null;
  }

  async uploadFile(file: File, metadata?: any): Promise<string> {
    if (!this.client) {
      // Simulate IPFS upload for development
      return `Qm${Math.random().toString(36).substring(2, 15)}`;
    }

    try {
      // Create metadata file
      const metadataFile = new File(
        [JSON.stringify({ ...metadata, originalName: file.name, uploadedAt: new Date().toISOString() })],
        `${file.name}.metadata.json`,
        { type: "application/json" }
      );

      const cid = await this.client.put([file, metadataFile], {
        name: `bluecarbon-${file.name}-${Date.now()}`,
        maxRetries: 3,
      });

      return cid;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      throw new Error("Failed to upload file to IPFS");
    }
  }

  async uploadMultipleFiles(files: File[], metadata?: any): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, metadata));
    return Promise.all(uploadPromises);
  }

  getIPFSUrl(cid: string, filename?: string): string {
    if (filename) {
      return `https://${cid}.ipfs.w3s.link/${filename}`;
    }
    return `https://${cid}.ipfs.w3s.link/`;
  }
}

export const ipfsService = new IPFSService();
