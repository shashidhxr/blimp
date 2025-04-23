// scripts/deploy-debug.js
const hre = require("hardhat");

async function main() {
  try {
    console.log("Starting deployment with debug info...");
    
    // Get the network info
    const provider = hre.ethers.provider;
    const network = await provider.getNetwork();
    console.log("Connected to network:", {
      name: network.name,
      chainId: network.chainId
    });
    
    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Check account balance
    const balance = await provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
    
    if (balance.eq(0)) {
      throw new Error("Deployer account has 0 ETH. Please fund the account first.");
    }
    
    // Specify owner addresses
    const owners = [
      deployer.address,
      "0x546cc87E90CC13A48A2503931fb951F732f61b45", // Replace with your actual MetaMask address
      "0x4832139826Dc7aF5F5Eb5a646aCba36C843158b5"  // Replace with your actual MetaMask address
    ];
    
    // Logging the owner addresses
    console.log("Owner addresses:");
    owners.forEach((addr, i) => console.log(`Owner ${i+1}: ${addr}`));
    
    const requiredConfirmations = 2;
    console.log("Required confirmations:", requiredConfirmations);
    
    // Get the contract factory
    const SimpleMultiSig = await hre.ethers.getContractFactory("SimpleMultiSig");
    console.log("Contract factory created");
    
    // Send the deployment transaction
    console.log("Sending deployment transaction...");
    const deployTx = await SimpleMultiSig.deploy(owners, requiredConfirmations);
    
    console.log("Deployment transaction sent!");
    console.log("Transaction hash:", deployTx.deployTransaction.hash);
    console.log("Waiting for transaction confirmation...");
    
    // Wait for confirmation with timeout
    const TIMEOUT_MS = 120000; // 2 minutes
    const CONFIRM_BLOCKS = 2;
    
    const deploymentReceipt = await Promise.race([
      deployTx.deployed(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Deployment timeout after 2 minutes")), TIMEOUT_MS)
      )
    ]);
    
    console.log("Contract deployed successfully!");
    console.log("Contract address:", deploymentReceipt.address);
    
    // Verify contract is deployed
    const code = await provider.getCode(deploymentReceipt.address);
    if (code === '0x') {
      console.log("WARNING: Contract bytecode is empty. Deployment might have failed silently.");
    } else {
      console.log("Contract bytecode verified - contract is deployed correctly");
      console.log("Bytecode length:", (code.length - 2) / 2, "bytes");
    }
    
    // Try calling a function to verify contract is working
    console.log("Testing contract by calling getOwners()...");
    const deployedContract = SimpleMultiSig.attach(deploymentReceipt.address);
    const ownersFromContract = await deployedContract.getOwners();
    console.log("Owners returned from contract:", ownersFromContract);
    
    console.log("Deployment and verification complete!");
    return deploymentReceipt.address;
    
  } catch (error) {
    console.error("Deployment failed with error:");
    console.error(error);
    
    // Try to extract more details for certain errors
    if (error.message.includes("transaction failed")) {
      console.log("Transaction failed. Possible reasons:");
      console.log("1. Gas issues");
      console.log("2. Contract constructor error");
      console.log("3. Network congestion or RPC issues");
    }
    
    process.exit(1);
  }
}

main()
  .then((address) => {
    console.log("Final contract address:", address);
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });