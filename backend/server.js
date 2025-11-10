require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const contractService = require('./contractService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Initialize contract service
let isInitialized = false;

const initializeContracts = async () => {
  if (!isInitialized) {
    try {
      await contractService.initialize();
      isInitialized = true;
      console.log('✅ Contracts initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize contracts:', error.message);
      throw error;
    }
  }
};

function stringifyBigInts(obj) {
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(stringifyBigInts);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = stringifyBigInts(obj[key]);
    }
    return result;
  }
  return obj;
}


// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    initialized: isInitialized,
    ganacheUrl: process.env.GANACHE_URL 
  });
});

// Get account info
app.get('/api/account', async (req, res) => {
  try {
    await initializeContracts();
    const accountInfo = await contractService.getAccountInfo();
    res.json({ success: true, data: stringifyBigInts(accountInfo) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DONOR ENDPOINTS ====================

// Register donor
app.post('/api/donor/register', async (req, res) => {
  try {
    await initializeContracts();
    const { donorAddress, name, age, bloodType, medicalHistoryHash, preferences } = req.body;
    
    const result = await contractService.registerDonor(
      donorAddress,
      name,
      age,
      bloodType,
      medicalHistoryHash,
      preferences
    );
    
    res.json({ success: true, data: stringifyBigInts(result) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get donor info
app.get('/api/donor/:address', async (req, res) => {
  try {
    await initializeContracts();
    const { address } = req.params;
    const donorInfo = await contractService.getDonorInfo(address);
    res.json({ success: true, data: stringifyBigInts(donorInfo) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update donor status
app.post('/api/donor/status', async (req, res) => {
  try {
    await initializeContracts();
    const { donorAddress, status } = req.body;
    const result = await contractService.updateDonorStatus(donorAddress, status);
    res.json({ success: true, data: stringifyBigInts(result) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deactivate donor
app.post('/api/donor/deactivate', async (req, res) => {
  try {
    await initializeContracts();
    const { donorAddress } = req.body;
    const result = await contractService.deactivateDonor(donorAddress);
    res.json({ success: true, data: stringifyBigInts(result) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RECIPIENT ENDPOINTS ====================

// Register recipient
app.post('/api/recipient/register', async (req, res) => {
  try {
    await initializeContracts();
    const { recipientAddress, name, age, bloodType, medicalHistoryHash, location } = req.body;
    
    const result = await contractService.registerRecipient(
      recipientAddress,
      name,
      age,
      bloodType,
      medicalHistoryHash,
      location
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recipient info
app.get('/api/recipient/:address', async (req, res) => {
  try {
    await initializeContracts();
    const { address } = req.params;
    const recipientInfo = await contractService.getRecipientInfo(address);
    res.json({ success: true, data: stringifyBigInts(recipientInfo) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add to waiting list
app.post('/api/recipient/waiting-list/add', async (req, res) => {
  try {
    await initializeContracts();
    const { recipientAddress, organType, urgencyLevel } = req.body;
    const result = await contractService.addToWaitingList(recipientAddress, organType, urgencyLevel);
    res.json({ success: true, data: stringifyBigInts(result)});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update medical status
app.post('/api/recipient/medical-status', async (req, res) => {
  try {
    await initializeContracts();
    const { recipientAddress, status } = req.body;
    const result = await contractService.updateRecipientMedicalStatus(recipientAddress, status);
    res.json({ success: true, data: stringifyBigInts(result) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HOSPITAL ENDPOINTS ====================

// Register hospital
app.post('/api/hospital/register', async (req, res) => {
  try {
    await initializeContracts();
    const { hospitalAddress, hospitalInfo } = req.body;
    const result = await contractService.registerHospital(hospitalAddress, hospitalInfo);
    res.json({ success: true, data: stringifyBigInts(result) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get hospital info
app.get('/api/hospital/:address', async (req, res) => {
  try {
    await initializeContracts();
    const { address } = req.params;
    const hospitalInfo = await contractService.getHospitalInfo(address);
    res.json({ success: true, data: stringifyBigInts(hospitalInfo) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify hospital
app.post('/api/hospital/verify', async (req, res) => {
  try {
    await initializeContracts();
    const { hospitalAddress, credentials } = req.body;
    const result = await contractService.verifyHospital(hospitalAddress, credentials);
    res.json({ success: true, data: stringifyBigInts(result) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authorize staff
app.post('/api/hospital/staff/authorize', async (req, res) => {
  try {
    await initializeContracts();
    const { hospitalAddress, staffAddress, role } = req.body;
    const result = await contractService.authorizeStaff(hospitalAddress, staffAddress, role);
    res.json({ success: true, data: stringifyBigInts(result) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update capacity
app.post('/api/hospital/capacity', async (req, res) => {
  try {
    await initializeContracts();
    const { hospitalAddress, organType, capacity } = req.body;
    const result = await contractService.updateHospitalCapacity(hospitalAddress, organType, capacity);
    res.json({ success: true, data: stringifyBigInts(result) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get hospital capacity
app.get('/api/hospital/:address/capacity/:organType', async (req, res) => {
  try {
    await initializeContracts();
    const { address, organType } = req.params;
    const capacity = await contractService.getHospitalCapacity(address, parseInt(organType));
    res.json({ success: true, data: stringifyBigInts({ capacity }) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get staff role
app.get('/api/hospital/:hospitalAddress/staff/:staffAddress', async (req, res) => {
  try {
    await initializeContracts();
    const { hospitalAddress, staffAddress } = req.params;
    const role = await contractService.getStaffRole(hospitalAddress, staffAddress);
    res.json({ success: true, data: stringifyBigInts({ role }) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Connecting to Ganache at ${process.env.GANACHE_URL}`);
  
  try {
    await initializeContracts();
  } catch (error) {
    console.error('⚠️  Server started but contracts not initialized. Check your .env file.');
  }
});