import { ethers } from "ethers";
import SimpleMultiSigArtifact from "../artifacts/contracts/SimpleMulitiSig.sol/SimpleMultiSig.json";

export const CONTRACT_ADDRESS = "0xB653da6776AC908759Df31bF0C6158d3c2971974";

export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed!");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], 
      });
    } catch (error) {
      console.error("Failed to switch network:", error);
      throw new Error("Please connect to Sepolia network");
    }
  }

  return { provider, signer, account: accounts[0] };
};

// Initialize contract instance
export const getContract = async (signer) => {
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    SimpleMultiSigArtifact.abi,
    signer
  );
};

// Contract interaction functions
export const getWalletBalance = async (provider) => {
  return provider.getBalance(CONTRACT_ADDRESS);
};

export const getOwners = async (contract) => {
  return contract.getOwners();
};

export const getRequiredConfirmations = async (contract) => {
  return contract.requiredConfirmations();
};

export const getTransactionCount = async (contract) => {
  return contract.getTransactionCount();
};

export const getTransaction = async (contract, txIndex) => {
  return contract.getTransaction(txIndex);
};

export const submitTransaction = async (contract, to, value, data) => {
  const tx = await contract.submitTransaction(to, value, data || "0x");
  return tx.wait();
};

export const confirmTransaction = async (contract, txIndex) => {
  const tx = await contract.confirmTransaction(txIndex);
  return tx.wait();
};

export const executeTransaction = async (contract, txIndex) => {
  try {
    // Get the transaction details first to check
    const tx = await contract.getTransaction(txIndex);
    
    // Check if the transaction has already been executed
    if (tx[3]) {
      throw new Error("Transaction has already been executed");
    }
    
    // Check if the contract has enough balance for the transaction
    const provider = contract.runner.provider;
    const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
    
    if (tx[1] > contractBalance) {
      throw new Error(`Contract has insufficient balance. Needs ${ethers.formatEther(tx[1])} ETH but has ${ethers.formatEther(contractBalance)} ETH`);
    }
    
    // Check confirmations
    const requiredConfirmations = await contract.requiredConfirmations();
    if (tx[4] < requiredConfirmations) {
      throw new Error(`Not enough confirmations. Has ${tx[4]} but needs ${requiredConfirmations}`);
    }
    
    // Execute with explicit gas limit to avoid estimation issues
    const gasEstimate = await contract.executeTransaction.estimateGas(txIndex, {
      gasLimit: 500000 // Higher gas limit
    }).catch(error => {
      console.error("Gas estimation failed:", error);
      return 500000; // Use default if estimation fails
    });
    
    // Add 20% more gas as buffer
    const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
    
    const execTx = await contract.executeTransaction(txIndex, {
      gasLimit: gasLimit
    });
    
    return execTx.wait();
  } catch (error) {
    // Try to extract more helpful error message
    if (error.reason) {
      throw new Error(`Execution error: ${error.reason}`);
    } else if (error.data) {
      // Try to decode the error data
      try {
        const errorInterface = new ethers.Interface(["function Error(string)"]);
        const decodedError = errorInterface.parseError(error.data);
        throw new Error(`Contract error: ${decodedError.args[0]}`);
      // eslint-disable-next-line no-unused-vars
      } catch (decodeError) {
        // If decoding fails, throw original error
        throw error;
      }
    } else {
      throw error;
    }
  }
};

export const revokeConfirmation = async (contract, txIndex) => {
  const tx = await contract.revokeConfirmation(txIndex);
  return tx.wait();
};