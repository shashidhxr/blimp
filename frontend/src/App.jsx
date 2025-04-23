/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { ethers } from "ethers";
import { 
  connectWallet, 
  getContract,
  getWalletBalance,
  getOwners,
  getTransactionCount,
  getTransaction,
  submitTransaction,
  confirmTransaction,
  executeTransaction,
  revokeConfirmation,
  CONTRACT_ADDRESS
} from './utils/contract';
import './App.css';

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contractBalance, setContractBalance] = useState('0');
  const [walletBalance, setWalletBalance] = useState('0');
  const [owners, setOwners] = useState([]);
  const [requiredConfirmations, setRequiredConfirmations] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  
  // Form states
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [data, setData] = useState('');

  // Refresh all contract data
  const refreshWalletInfo = async () => {
    if (!contract || !provider || !account) return;
    
    try {
      // Balances
      setContractBalance(ethers.formatEther(await getWalletBalance(provider)));
      setWalletBalance(ethers.formatEther(await provider.getBalance(account)));
      
      // Owners
      const ownersList = await getOwners(contract);
      setOwners(ownersList);
      setIsOwner(ownersList.some(o => o.toLowerCase() === account.toLowerCase()));
      
      // Required confirmations
      setRequiredConfirmations(await contract.requiredConfirmations());
      
      // Transactions
      const txCount = await getTransactionCount(contract);
      const txList = [];
      
      for (let i = 0; i < txCount; i++) {
        const tx = await getTransaction(contract, i);
        txList.push({
          index: i,
          to: tx[0],
          value: ethers.formatEther(tx[1]),
          data: tx[2],
          executed: tx[3],
          confirmations: tx[4].toString()
        });
      }
      
      setTransactions(txList);
    } catch (error) {
      console.error("Refresh error:", error);
      alert("Error: " + error.message);
    }
  };

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      const { provider, signer, account } = await connectWallet();
      const contract = await getContract(signer);
      
      setProvider(provider);
      setAccount(account);
      setContract(contract);
      
      await refreshWalletInfo();
    } catch (error) {
      console.error("Connection error:", error);
      alert("Failed to connect: " + error.message);
    }
  };

  // Transaction handlers
  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    
    if (!contract || !isOwner) {
      alert("Please connect with an owner wallet first");
      return;
    }

    if (!ethers.isAddress(recipient)) {
      alert("Please enter a valid recipient address");
      return;
    }

    try {
      const valueWei = ethers.parseEther(amount || "0");
      const txData = data || "0x";
      
      await submitTransaction(contract, recipient, valueWei, txData);
      alert("Transaction submitted successfully!");
      
      // Reset form fields
      setRecipient('');
      setAmount('');
      setData('');
      
      // Refresh data
      await refreshWalletInfo();
    } catch (error) {
      console.error("Submit transaction error:", error);
      alert("Error submitting transaction: " + error.message);
    }
  };

  const handleConfirmTransaction = async (txIndex) => {
    if (!contract || !isOwner) {
      alert("Please connect with an owner wallet first");
      return;
    }

    try {
      await confirmTransaction(contract, txIndex);
      alert("Transaction confirmed successfully!");
      await refreshWalletInfo();
    } catch (error) {
      console.error("Confirm transaction error:", error);
      alert("Error confirming transaction: " + error.message);
    }
  };

  const handleExecuteTransaction = async (txIndex) => {
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }
  
    try {
      // Show loading indicator
      const loadingMessage = `Executing transaction #${txIndex}...`;
      alert(loadingMessage);
      
      await executeTransaction(contract, txIndex);
      
      alert("Transaction executed successfully!");
      await refreshWalletInfo();
    } catch (error) {
      console.error("Execute transaction error:", error);
      
      // Extract and format the error message for the user
      let errorMsg = "Error executing transaction";
      
      if (error.message) {
        errorMsg = error.message;
      } else if (error.reason) {
        errorMsg = error.reason;
      }
      
      // Clean up the error message
      if (errorMsg.includes("execution reverted:")) {
        errorMsg = errorMsg.replace("execution reverted:", "").trim();
      }
      
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleRevokeConfirmation = async (txIndex) => {
    if (!contract || !isOwner) {
      alert("Please connect with an owner wallet first");
      return;
    }

    try {
      await revokeConfirmation(contract, txIndex);
      alert("Confirmation revoked successfully!");
      await refreshWalletInfo();
    } catch (error) {
      console.error("Revoke confirmation error:", error);
      alert("Error revoking confirmation: " + error.message);
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || '');
        if (contract) refreshWalletInfo();
      });
    }

    return () => {
      window.ethereum?.removeAllListeners('accountsChanged');
    };
  }, [contract]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>MultiSig Wallet</h1>
        
        {/* Account status and connect button */}
        <div className="connection-status">
          {account ? (
            <div>
              <p>Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
              <p>Wallet Balance: {parseFloat(walletBalance).toFixed(4)} ETH</p>
              {isOwner && <p className="owner-badge">Owner</p>}
            </div>
          ) : (
            <button className="connect-button" onClick={handleConnect}>Connect Wallet</button>
          )}
        </div>

        {/* Contract info */}
        {contract && (
          <div className="contract-info">
            <p>Contract Address: {CONTRACT_ADDRESS.substring(0, 6)}...{CONTRACT_ADDRESS.substring(CONTRACT_ADDRESS.length - 4)}</p>
            <p>Contract Balance: {parseFloat(contractBalance).toFixed(4)} ETH</p>
            <p>Required Confirmations: {requiredConfirmations.toString()}</p>
            <button className="refresh-button" onClick={refreshWalletInfo}>Refresh</button>
          </div>
        )}
      </header>

      {contract && (
        <div className="wallet-container">
          {/* Owners list */}
          <div className="owners-section">
            <h2>Owners</h2>
            <ul className="owners-list">
              {owners.map((owner, index) => (
                <li key={index} className={owner.toLowerCase() === account.toLowerCase() ? 'current-user' : ''}>
                  {owner.substring(0, 6)}...{owner.substring(owner.length - 4)}
                  {owner.toLowerCase() === account.toLowerCase() && ' (You)'}
                </li>
              ))}
            </ul>
          </div>

          {/* Submit transaction form */}
          {isOwner && (
            <div className="transaction-form">
              <h2>Submit New Transaction</h2>
              <form onSubmit={handleSubmitTransaction}>
                <div className="form-group">
                  <label>Recipient:</label>
                  <input 
                    type="text" 
                    value={recipient} 
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..." 
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Amount (ETH):</label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0" 
                    step="0.0001"
                    min="0"
                  />
                </div>
                
                <div className="form-group">
                  <label>Data (hex):</label>
                  <input 
                    type="text" 
                    value={data} 
                    onChange={(e) => setData(e.target.value)}
                    placeholder="0x (optional)" 
                  />
                </div>
                
                <button type="submit" className="submit-button">Submit Transaction</button>
              </form>
            </div>
          )}

          {/* Transactions list */}
          <div className="transactions-section">
            <h2>Transactions</h2>
            {transactions.length === 0 ? (
              <p>No transactions yet</p>
            ) : (
              <ul className="transactions-list">
                {transactions.map((tx, index) => (
                  <li key={index} className={`transaction ${tx.executed ? 'executed' : ''}`}>
                    <div className="transaction-header">
                      <span>TX #{tx.index}</span>
                      <span className={tx.executed ? 'status executed' : 'status pending'}>
                        {tx.executed ? 'Executed' : 'Pending'}
                      </span>
                    </div>
                    
                    <div className="transaction-details">
                      <p>To: {tx.to}</p>
                      <p>Value: {parseFloat(tx.value).toFixed(4)} ETH</p>
                      <p>Confirmations: {tx.confirmations} / {requiredConfirmations.toString()}</p>
                      {tx.data !== '0x' && <p>Data: {tx.data}</p>}
                    </div>
                    
                    <div className="transaction-actions">
                      {!tx.executed && isOwner && (
                        <>
                          <button 
                            onClick={() => handleConfirmTransaction(tx.index)}
                            className="confirm-button"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => handleRevokeConfirmation(tx.index)}
                            className="revoke-button"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                      
                      {!tx.executed && Number(tx.confirmations) >= Number(requiredConfirmations) && (
                        <button 
                          onClick={() => handleExecuteTransaction(tx.index)}
                          className="execute-button"
                        >
                          Execute
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;