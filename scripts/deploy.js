const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying BlueCarbon contract...");

  // Get the ContractFactory and Signers here.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy the contract
  const BlueCarbon = await ethers.getContractFactory("BlueCarbon");
  const blueCarbon = await BlueCarbon.deploy();
  
  await blueCarbon.waitForDeployment();
  const contractAddress = await blueCarbon.getAddress();

  console.log("BlueCarbon contract deployed to:", contractAddress);

  // Grant some initial roles for testing
  console.log("Setting up initial roles...");
  
  // Grant admin role to deployer (already has it from constructor)
  console.log("Deployer has admin role");

  // You can grant NGO role to specific addresses here
  // await blueCarbon.grantNGORole("0x...");

  console.log("Deployment completed!");
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Deployer address: ${deployer.address}`);
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    deployer: deployer.address,
    network: "mumbai",
    timestamp: new Date().toISOString(),
  };

  console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
