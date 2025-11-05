/**
 * Oracle Service - Listens for death verification requests and fulfills them
 * Run this service: node oracle-service.js
 */

const Web3 = require('web3');
const fs = require('fs');
const axios = require('axios'); // Install: npm install axios

// Configuration
const CONFIG = {
  // Ganache RPC URL
  rpcUrl: 'http://127.0.0.1:7545',
  
  // Oracle operator account (must be authorized in OrganOracle contract)
  oracleAccount: '0xYOUR_ORACLE_ACCOUNT', // UPDATE THIS
  oraclePrivateKey: '0xYOUR_ORACLE_PRIVATE_KEY', // UPDATE THIS
  
  // Contract addresses (will be loaded from deployment file)
  oracleContractAddress: '',
  donorContractAddress: '',
  
  // API configuration (mock or real)
  useMockAPI: true, // Set to false when using real API
  mockDeathProbability: 0.5, // 50% chance of death in mock mode
  
  // Real API endpoint (if useMockAPI is false)
  deathVerificationAPI: 'https://api.hospital.gov/death-verification',
  apiKey: 'YOUR_API_KEY_HERE',
  
  // Polling interval (milliseconds)
  pollingInterval: 5000, // Check for new requests every 5 seconds
  
  // IPFS configuration (for storing evidence)
  ipfsGateway: 'https://ipfs.io/ipfs/',
  uploadToIPFS: false // Set to true if you want to upload evidence to IPFS
};

// Load contract ABIs
const oracleABI = require('./build/contracts/OrganOracle.json').abi;
const donorABI = require('./build/contracts/Donor.json').abi;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.rpcUrl));

let oracleContract;
let donorContract;
let isRunning = false;
let processedRequests = new Set();

/**
 * Initialize the oracle service
 */
async function initialize() {
  console.log('🚀 Starting Organ Donation Oracle Service...\n');
  
  try {
    // Load deployment info
    if (fs.existsSync('./oracle-deployment.json')) {
      const deploymentInfo = JSON.parse(fs.readFileSync('./oracle-deployment.json', 'utf8'));
      CONFIG.oracleContractAddress = deploymentInfo.contracts.oracle;
      CONFIG.donorContractAddress = deploymentInfo.contracts.donor;
      
      // If oracle account not set, use the owner from deployment
      if (CONFIG.oracleAccount === '0xYOUR_ORACLE_ACCOUNT') {
        CONFIG.oracleAccount = deploymentInfo.accounts.owner;
        console.log('⚠ Using owner account as oracle operator');
      }
      
      console.log('✓ Loaded deployment configuration');
      console.log('  Oracle Contract:', CONFIG.oracleContractAddress);
      console.log('  Donor Contract:', CONFIG.donorContractAddress);
    } else {
      console.error('❌ oracle-deployment.json not found!');
      console.log('Please deploy contracts first using: truffle migrate --reset');
      process.exit(1);
    }
    
    // Initialize contracts
    oracleContract = new web3.eth.Contract(oracleABI, CONFIG.oracleContractAddress);
    donorContract = new web3.eth.Contract(donorABI, CONFIG.donorContractAddress);
    
    // Verify oracle account
    const accounts = await web3.eth.getAccounts();
    if (!accounts.includes(CONFIG.oracleAccount)) {
      console.error('❌ Oracle account not found in available accounts');
      console.log('Available accounts:', accounts);
      process.exit(1);
    }
    
    // Check authorization
    const isAuthorized = await oracleContract.methods
      .authorizedOracles(CONFIG.oracleAccount)
      .call();
    
    if (!isAuthorized) {
      console.error('❌ Oracle account is not authorized!');
      console.log('Run this command to authorize:');
      console.log(`truffle console`);
      console.log(`let oracle = await OrganOracle.deployed()`);
      console.log(`oracle.setOracleAuthorization("${CONFIG.oracleAccount}", true)`);
      process.exit(1);
    }
    
    console.log('✓ Oracle account authorized');
    console.log('  Account:', CONFIG.oracleAccount);
    console.log('  Balance:', web3.utils.fromWei(await web3.eth.getBalance(CONFIG.oracleAccount), 'ether'), 'ETH');
    
    console.log('\n✓ Oracle service initialized successfully!');
    console.log(`📡 Polling for requests every ${CONFIG.pollingInterval}ms`);
    console.log(`🔧 Mock API mode: ${CONFIG.useMockAPI ? 'ENABLED' : 'DISABLED'}\n`);
    
    isRunning = true;
    
    // Start listening for events
    listenForEvents();
    
    // Start polling for pending requests
    pollPendingRequests();
    
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

/**
 * Listen for OracleRequest events
 */
function listenForEvents() {
  console.log('👂 Listening for OracleRequest events...\n');
  
  oracleContract.events.OracleRequest({
    fromBlock: 'latest'
  })
  .on('data', async (event) => {
    console.log('🔔 New death verification request received!');
    console.log('  Request ID:', event.returnValues.requestId);
    console.log('  Donor Address:', event.returnValues.donorAddress);
    console.log('  Requester:', event.returnValues.requester);
    console.log('  Timestamp:', new Date(event.returnValues.timestamp * 1000).toLocaleString());
    console.log('');
    
    await processRequest(
      event.returnValues.requestId,
      event.returnValues.donorAddress
    );
  })
  .on('error', (error) => {
    console.error('❌ Event listener error:', error);
  });
}

/**
 * Poll for pending requests (backup method)
 */
async function pollPendingRequests() {
  if (!isRunning) return;
  
  try {
    const pendingRequests = await oracleContract.methods.getPendingRequests().call();
    
    if (pendingRequests.length > 0) {
      console.log(`📋 Found ${pendingRequests.length} pending request(s)`);
      
      for (const requestId of pendingRequests) {
        if (!processedRequests.has(requestId)) {
          const request = await oracleContract.methods.getRequest(requestId).call();
          await processRequest(requestId, request.donorAddress);
        }
      }
    }
  } catch (error) {
    console.error('⚠ Error polling pending requests:', error.message);
  }
  
  // Schedule next poll
  setTimeout(pollPendingRequests, CONFIG.pollingInterval);
}

/**
 * Process a death verification request
 */
async function processRequest(requestId, donorAddress) {
  if (processedRequests.has(requestId)) {
    return; // Already processed
  }
  
  console.log(`\n🔍 Processing request ${requestId} for donor ${donorAddress}...`);
  
  try {
    // Get donor information
    const donorInfo = await donorContract.methods.getDonorInfo(donorAddress).call();
    console.log('  Donor Name:', donorInfo.name);
    console.log('  Age:', donorInfo.age);
    console.log('  Blood Type:', donorInfo.bloodType);
    
    // Verify death status
    let isDeceased, evidenceCID;
    
    if (CONFIG.useMockAPI) {
      // Mock verification
      const result = await mockDeathVerification(donorAddress, donorInfo);
      isDeceased = result.isDeceased;
      evidenceCID = result.evidenceCID;
    } else {
      // Real API verification
      const result = await realDeathVerification(donorAddress, donorInfo);
      isDeceased = result.isDeceased;
      evidenceCID = result.evidenceCID;
    }
    
    console.log(`  Death Status: ${isDeceased ? '💀 DECEASED' : '✅ ALIVE'}`);
    console.log('  Evidence CID:', evidenceCID);
    
    // Fulfill the request on blockchain
    await fulfillRequest(requestId, isDeceased, evidenceCID);
    
    // If deceased, update donor contract
    if (isDeceased) {
      await updateDonorStatus(donorAddress, requestId, evidenceCID);
    }
    
    processedRequests.add(requestId);
    console.log('✓ Request processed successfully\n');
    
  } catch (error) {
    console.error(`❌ Error processing request ${requestId}:`, error.message);
  }
}

/**
 * Mock death verification (for testing)
 */
async function mockDeathVerification(donorAddress, donorInfo) {
  console.log('  🎭 Using MOCK death verification...');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Random death determination
  const isDeceased = Math.random() < CONFIG.mockDeathProbability;
  
  // Generate mock evidence CID
  const evidenceCID = isDeceased 
    ? `QmMock${donorAddress.substring(2, 10)}DeathCert${Date.now()}`
    : '';
  
  return { isDeceased, evidenceCID };
}

/**
 * Real death verification via API
 */
async function realDeathVerification(donorAddress, donorInfo) {
  console.log('  🌐 Calling real death verification API...');
  
  try {
    const response = await axios.post(
      CONFIG.deathVerificationAPI,
      {
        donorAddress: donorAddress,
        name: donorInfo.name,
        age: donorInfo.age,
        bloodType: donorInfo.bloodType
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    return {
      isDeceased: response.data.isDeceased,
      evidenceCID: response.data.evidenceCID || ''
    };
  } catch (error) {
    console.error('  ⚠ API call failed:', error.message);
    // Fallback to mock in case of API failure
    return await mockDeathVerification(donorAddress, donorInfo);
  }
}

/**
 * Fulfill the oracle request on blockchain
 */
async function fulfillRequest(requestId, isDeceased, evidenceCID) {
  console.log('  📝 Submitting verification to blockchain...');
  
  try {
    const gasEstimate = await oracleContract.methods
      .fulfillDeathVerification(requestId, isDeceased, evidenceCID)
      .estimateGas({ from: CONFIG.oracleAccount });
    
    const tx = await oracleContract.methods
      .fulfillDeathVerification(requestId, isDeceased, evidenceCID)
      .send({
        from: CONFIG.oracleAccount,
        gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
      });
    
    console.log('  ✓ Transaction confirmed');
    console.log('  Tx Hash:', tx.transactionHash);
    console.log('  Gas Used:', tx.gasUsed);
    
    return tx;
  } catch (error) {
    console.error('  ❌ Blockchain transaction failed:', error.message);
    throw error;
  }
}

/**
 * Update donor status in Donor contract
 */
async function updateDonorStatus(donorAddress, requestId, evidenceCID) {
  console.log('  🔄 Updating donor status to DECEASED...');
  
  try {
    const tx = await donorContract.methods
      .confirmDeath(donorAddress, requestId, evidenceCID)
      .send({
        from: CONFIG.oracleAccount,
        gas: 300000
      });
    
    console.log('  ✓ Donor status updated');
    console.log('  Tx Hash:', tx.transactionHash);
    
    return tx;
  } catch (error) {
    console.error('  ⚠ Could not update donor status:', error.message);
    // Don't throw - oracle fulfillment already succeeded
  }
}

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('\n👋 Shutting down oracle service...');
  isRunning = false;
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the service
initialize().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Export for testing
module.exports = {
  initialize,
  processRequest,
  mockDeathVerification,
  realDeathVerification
};