const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const owners = [
    deployer.address, 
    "0x546cc87E90CC13A48A2503931fb951F732f61b45", 
    "0x4832139826Dc7aF5F5Eb5a646aCba36C843158b5"  
  ];
  
  const requiredConfirmations = 2;
  
  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", {
    name: network.name,
    chainId: network.chainId 
  });
  
  // Deploy contract
  const SimpleMultiSig = await hre.ethers.getContractFactory("SimpleMultiSig");
  console.log("Deploying SimpleMultiSig...");
  
  const simpleMultiSig = await SimpleMultiSig.deploy(
    owners,
    requiredConfirmations
  );
  
  console.log("Waiting for deployment transaction to be mined...");
  await simpleMultiSig.deployed();
  
  console.log("SimpleMultiSig deployed to:", simpleMultiSig.address);
  console.log("Transaction hash:", simpleMultiSig.deployTransaction.hash);
  console.log("Owners:", owners);
  console.log("Required confirmations:", requiredConfirmations);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });