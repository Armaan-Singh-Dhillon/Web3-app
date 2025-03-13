import { useState, useEffect } from "react";
import Web3 from "web3";
import React from "react";
import "./App.css"; // Import CSS for styling

// ✅ Load environment variables
const web3 = new Web3(import.meta.env.VITE_GANACHE_RPC);
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const privateKey = import.meta.env.VITE_PRIVATE_KEY;
const account = import.meta.env.VITE_ACCOUNT;
const thingsboardToken = import.meta.env.VITE_THINGSBOARD_TOKEN;
const DEVICE_ID = import.meta.env.VITE_DEVICE_ID; // ThingsBoard device ID

// ✅ Contract ABI
const contractABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_totalEnergy", "type": "uint256" }],
    "name": "storeEnergy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBill",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "payBill",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

// ✅ Create contract instance
const contract = new web3.eth.Contract(contractABI, contractAddress);

function App() {
  const [energy, setEnergy] = useState(null);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]); // ✅ Store last 5 transactions

  // ✅ Fetch Energy Data from ThingsBoard
  async function fetchEnergyData() {
    try {
      const response = await fetch(
        `/thingsboard/api/plugins/telemetry/DEVICE/${DEVICE_ID}/values/timeseries?keys=power`,
        {
          headers: { "X-Authorization": `Bearer ${thingsboardToken}` },
        }
      );

      const data = await response.json();
      const power = data.power[0].value;
      const energyValue = Math.floor(power);
      console.log(`⚡ Fetched Energy: ${energyValue} kWh`);
      setEnergy(energyValue);
    } catch (error) {
      console.error("❌ Error fetching energy data:", error.message);
    }
  }

  // ✅ Utility Function: Add Transaction to History (Limit to 5)
  function addTransaction(type, amount, hash) {
    setTransactions((prev) => {
      const newTransactions = [{ type, amount, hash }, ...prev]; // Add to the top
      return newTransactions.slice(0, 5); // Keep only the last 5 transactions
    });
  }

  // ✅ Send Energy Data to Contract
  async function sendEnergyData() {
    if (!energy) return;
    setLoading(true);

    try {
      const roundedEnergy = Math.floor(energy);
      const tx = contract.methods.storeEnergy(roundedEnergy);
      const gas = await tx.estimateGas({ from: account });
      const gasPrice = await web3.eth.getGasPrice();
      const data = tx.encodeABI();
      const nonce = await web3.eth.getTransactionCount(account, "latest");

      const signedTx = await web3.eth.accounts.signTransaction(
        {
          to: contractAddress,
          data,
          gas,
          gasPrice,
          nonce,
        },
        privateKey
      );

      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log(`✅ Energy data stored! TX Hash: ${receipt.transactionHash}`);

      // ✅ Add Transaction to History
      addTransaction("Energy Stored", energy.toString(), receipt.transactionHash);
    } catch (error) {
      console.error("❌ Error sending energy data:", error.message);
    }

    setLoading(false);
  }

  // ✅ Fetch Bill from Contract
  async function fetchBill() {
    setLoading(true);
    try {
      const billAmount = await contract.methods.getBill().call({ from: account });
      console.log(`💰 Bill Amount: ${billAmount.toString()} wei`);
      setBill(billAmount);
    } catch (error) {
      console.error("❌ Error fetching bill:", error.message);
    }
    setLoading(false);
  }

  // ✅ Pay Bill on the Contract
  async function payBill() {
    setLoading(true);
    try {
      const billAmount = await contract.methods.getBill().call({ from: account });

      if (billAmount == 0) {
        console.log("✅ No bill pending!");
        setLoading(false);
        return;
      }

      console.log(`💰 Bill to pay: ${billAmount.toString()} wei`);

      const tx = contract.methods.payBill();
      const gas = await tx.estimateGas({ from: account, value: billAmount });
      const gasPrice = await web3.eth.getGasPrice();
      const data = tx.encodeABI();
      const nonce = await web3.eth.getTransactionCount(account, "latest");

      const signedTx = await web3.eth.accounts.signTransaction(
        {
          to: contractAddress,
          data,
          gas,
          gasPrice,
          nonce,
          value: billAmount.toString(),
        },
        privateKey
      );

      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log(`✅ Bill paid successfully! TX Hash: ${receipt.transactionHash}`);

      // ✅ Add Transaction to History
      addTransaction("Bill Payment", billAmount.toString(), receipt.transactionHash);
    } catch (error) {
      console.error("❌ Error paying bill:", error.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEnergyData();
  }, []);

  return (
  <div className="container">
    <h1>
      ⚡ Energy Billing System
    </h1>

    <div className="info">
      <p>⚡ Energy: {energy !== null ? `${energy} kWh` : "Fetching..."}</p>
      <p>💰 Bill: {bill !== null ? `${bill} wei` : "Not Fetched"}</p>
    </div>

    <div className="buttons">
      <button onClick={sendEnergyData} disabled={loading}>
        {loading ? "Processing..." : "Store Energy"}
      </button>
      <button onClick={fetchBill} disabled={loading}>
        {loading ? "Fetching..." : "Fetch Bill"}
      </button>
      <button onClick={payBill} disabled={loading}>
        {loading ? "Processing..." : "Pay Bill"}
      </button>
    </div>

    <div className="transaction-history">
      <h2>📜 Transaction History (Last 5)</h2>
      <ul>
        {transactions.length > 0 ? (
          transactions.map((tx, index) => (
            <li key={index}>
              <strong>{tx.type}:</strong> {tx.amount} wei <br />
              <strong>Tx Hash:</strong> {tx.hash}
            </li>
          ))
        ) : (
          <p>No recent transactions.</p>
        )}
      </ul>
    </div>
  </div>
);

}

export default App;
