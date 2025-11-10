// API Base URL
const API_BASE_URL = 'http://localhost:3001/api';

// DOM elements
const accountEl = document.getElementById('account');
const statusEl = document.getElementById('status');
const donorInfoEl = document.getElementById('donorInfo');
const donorInfoContentEl = document.getElementById('donorInfoContent');
const recipientInfoEl = document.getElementById('recipientInfo');
const recipientInfoContentEl = document.getElementById('recipientInfoContent');
const hospitalInfoEl = document.getElementById('hospitalInfo');
const hospitalInfoContentEl = document.getElementById('hospitalInfoContent');

// Utility functions
const updateStatus = (message, type = 'info') => {
  statusEl.className = `alert alert-${type}`;
  statusEl.textContent = message;
};

const showError = (message) => {
  updateStatus(`Error: ${message}`, 'danger');
  console.error(message);
};

const showSuccess = (message) => {
  updateStatus(message, 'success');
};

// API call helper
const apiCall = async (endpoint, method = 'GET', body = null) => {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API call failed');
    }

    return data.data;
  } catch (error) {
    throw new Error(error.message || 'Network error');
  }
};

// Initialize and get account info
const initializeApp = async () => {
  try {
    updateStatus('Connecting to blockchain...');
    
    const accountInfo = await apiCall('/account');
    
    accountEl.innerText = `Connected: ${accountInfo.address.substring(0, 6)}...${accountInfo.address.substring(38)} | Balance: ${parseFloat(accountInfo.balance).toFixed(4)} ETH`;
    
    showSuccess('Connected to Ganache successfully!');
    
    console.log('Account Info:', accountInfo);
  } catch (error) {
    showError(`Failed to connect: ${error.message}`);
  }
};

// ==================== DONOR FUNCTIONS ====================

const registerDonor = async (event) => {
  event.preventDefault();
  
  try {
    const form = event.target;
    const donorData = {
      donorAddress: form.donorAddress.value,
      name: form.donorName.value,
      age: parseInt(form.donorAge.value),
      bloodType: form.donorBloodType.value,
      medicalHistoryHash: form.donorMedicalHistory.value || '',
      preferences: {
        heart: form.donorHeart.checked,
        liver: form.donorLiver.checked,
        kidneys: form.donorKidneys.checked
      }
    };

    updateStatus('Registering donor...');

    const result = await apiCall('/donor/register', 'POST', donorData);
    
    showSuccess(`Donor registered successfully! TX: ${result.transactionHash}`);
    form.reset();
  } catch (error) {
    showError(`Failed to register donor: ${error.message}`);
  }
};

const getDonorInfo = async () => {
  try {
    const address = document.getElementById('getDonorAddress').value;
    if (!address) {
      showError('Please enter a donor address.');
      return;
    }

    updateStatus('Fetching donor information...');

    const donor = await apiCall(`/donor/${address}`);
    
    const statusNames = ['Active', 'Deactivated', 'Matched', 'Deceased'];
    
    donorInfoContentEl.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Name:</strong> ${donor.name}</p>
          <p><strong>Age:</strong> ${donor.age}</p>
          <p><strong>Blood Type:</strong> ${donor.bloodType}</p>
          <p><strong>Status:</strong> <span class="badge bg-primary">${statusNames[donor.status]}</span></p>
        </div>
        <div class="col-md-6">
          <p><strong>Medical History Hash:</strong> ${donor.medicalHistoryHash || 'N/A'}</p>
          <p><strong>Donation Preferences:</strong></p>
          <ul>
            <li>Heart: ${donor.preferences.heart ? '✅' : '❌'}</li>
            <li>Liver: ${donor.preferences.liver ? '✅' : '❌'}</li>
            <li>Kidneys: ${donor.preferences.kidneys ? '✅' : '❌'}</li>
          </ul>
        </div>
      </div>
    `;
    
    donorInfoEl.style.display = 'block';
    showSuccess('Donor information retrieved successfully!');
  } catch (error) {
    showError(`Failed to get donor info: ${error.message}`);
    donorInfoEl.style.display = 'none';
  }
};

const updateDonorStatus = async () => {
  try {
    const address = document.getElementById('updateDonorAddress').value;
    const status = document.getElementById('donorStatusSelect').value;
    
    if (!address) {
      showError('Please enter a donor address.');
      return;
    }

    updateStatus('Updating donor status...');

    const result = await apiCall('/donor/status', 'POST', {
      donorAddress: address,
      status: parseInt(status)
    });
    
    showSuccess(`Donor status updated! TX: ${result.transactionHash}`);
    document.getElementById('updateDonorAddress').value = '';
  } catch (error) {
    showError(`Failed to update donor status: ${error.message}`);
  }
};

const deactivateDonor = async () => {
  try {
    const address = document.getElementById('deactivateDonorAddress').value;
    
    if (!address) {
      showError('Please enter a donor address.');
      return;
    }

    updateStatus('Deactivating donor...');

    const result = await apiCall('/donor/deactivate', 'POST', {
      donorAddress: address
    });
    
    showSuccess(`Donor deactivated! TX: ${result.transactionHash}`);
    document.getElementById('deactivateDonorAddress').value = '';
  } catch (error) {
    showError(`Failed to deactivate donor: ${error.message}`);
  }
};

// ==================== RECIPIENT FUNCTIONS ====================

const registerRecipient = async (event) => {
  event.preventDefault();
  
  try {
    const form = event.target;
    const recipientData = {
      recipientAddress: form.recipientAddress.value,
      name: form.recipientName.value,
      age: parseInt(form.recipientAge.value),
      bloodType: form.recipientBloodType.value,
      medicalHistoryHash: form.recipientMedicalHistory.value || '',
      location: {
        city: form.recipientCity.value,
        country: form.recipientCountry.value,
        additionalInfo: form.recipientAdditionalInfo.value || ''
      }
    };

    updateStatus('Registering recipient...');

    const result = await apiCall('/recipient/register', 'POST', recipientData);
    
    showSuccess(`Recipient registered successfully! TX: ${result.transactionHash}`);
    form.reset();
  } catch (error) {
    showError(`Failed to register recipient: ${error.message}`);
  }
};

const getRecipientInfo = async () => {
  try {
    const address = document.getElementById('getRecipientAddress').value;
    if (!address) {
      showError('Please enter a recipient address.');
      return;
    }

    updateStatus('Fetching recipient information...');

    const recipient = await apiCall(`/recipient/${address}`);
    
    const statusNames = ['Waiting', 'Transplanted', 'Critical', 'Stable', 'Rejected'];
    
    recipientInfoContentEl.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Name:</strong> ${recipient.name}</p>
          <p><strong>Age:</strong> ${recipient.age}</p>
          <p><strong>Blood Type:</strong> ${recipient.bloodType}</p>
          <p><strong>Medical Status:</strong> <span class="badge bg-warning">${statusNames[recipient.medicalStatus]}</span></p>
        </div>
        <div class="col-md-6">
          <p><strong>Medical History Hash:</strong> ${recipient.medicalHistoryHash || 'N/A'}</p>
          <p><strong>Location:</strong></p>
          <ul>
            <li>City: ${recipient.location.city}</li>
            <li>Country: ${recipient.location.country}</li>
            <li>Additional Info: ${recipient.location.additionalInfo || 'N/A'}</li>
          </ul>
        </div>
      </div>
    `;
    
    recipientInfoEl.style.display = 'block';
    showSuccess('Recipient information retrieved successfully!');
  } catch (error) {
    showError(`Failed to get recipient info: ${error.message}`);
    recipientInfoEl.style.display = 'none';
  }
};

const addToWaitingList = async () => {
  try {
    const address = document.getElementById('waitingListAddress').value;
    const organType = document.getElementById('organTypeSelect').value;
    const urgency = document.getElementById('urgencyLevel').value;
    
    if (!address || !urgency) {
      showError('Please fill in all fields.');
      return;
    }

    updateStatus('Adding to waiting list...');

    const result = await apiCall('/recipient/waiting-list/add', 'POST', {
      recipientAddress: address,
      organType: parseInt(organType),
      urgencyLevel: parseInt(urgency)
    });
    
    showSuccess(`Added to waiting list! TX: ${result.transactionHash}`);
    document.getElementById('waitingListAddress').value = '';
    document.getElementById('urgencyLevel').value = '';
  } catch (error) {
    showError(`Failed to add to waiting list: ${error.message}`);
  }
};

const updateMedicalStatus = async () => {
  try {
    const address = document.getElementById('updateRecipientAddress').value;
    const status = document.getElementById('medicalStatusSelect').value;
    
    if (!address) {
      showError('Please enter a recipient address.');
      return;
    }

    updateStatus('Updating medical status...');

    const result = await apiCall('/recipient/medical-status', 'POST', {
      recipientAddress: address,
      status: parseInt(status)
    });
    
    showSuccess(`Medical status updated! TX: ${result.transactionHash}`);
    document.getElementById('updateRecipientAddress').value = '';
  } catch (error) {
    showError(`Failed to update medical status: ${error.message}`);
  }
};

// ==================== HOSPITAL FUNCTIONS ====================

const registerHospital = async (event) => {
  event.preventDefault();
  
  try {
    const form = event.target;
    const hospitalData = {
      hospitalAddress: form.hospitalAddress.value,
      hospitalInfo: {
        name: form.hospitalName.value,
        location: form.hospitalLocation.value,
        licenseId: form.hospitalLicenseId.value,
        isVerified: false
      }
    };

    updateStatus('Registering hospital...');

    const result = await apiCall('/hospital/register', 'POST', hospitalData);
    
    showSuccess(`Hospital registered successfully! TX: ${result.transactionHash}`);
    form.reset();
  } catch (error) {
    showError(`Failed to register hospital: ${error.message}`);
  }
};

const getHospitalInfo = async () => {
  try {
    const address = document.getElementById('getHospitalAddress').value;
    if (!address) {
      showError('Please enter a hospital address.');
      return;
    }

    updateStatus('Fetching hospital information...');

    const hospital = await apiCall(`/hospital/${address}`);
    
    hospitalInfoContentEl.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Name:</strong> ${hospital.name}</p>
          <p><strong>Location:</strong> ${hospital.location}</p>
          <p><strong>License ID:</strong> ${hospital.licenseId}</p>
          <p><strong>Verification Status:</strong> 
            <span class="badge ${hospital.isVerified ? 'bg-success' : 'bg-warning'}">
              ${hospital.isVerified ? 'Verified' : 'Not Verified'}
            </span>
          </p>
        </div>
        <div class="col-md-6">
          <div id="hospitalCapacities">
            <p><strong>Organ Capacities:</strong></p>
            <div id="capacityList">Loading capacities...</div>
          </div>
        </div>
      </div>
    `;
    
    // Fetch capacities
    try {
      const heartCapacity = await apiCall(`/hospital/${address}/capacity/0`);
      const liverCapacity = await apiCall(`/hospital/${address}/capacity/1`);
      const kidneysCapacity = await apiCall(`/hospital/${address}/capacity/2`);
      
      document.getElementById('capacityList').innerHTML = `
        <ul>
          <li>Heart: ${heartCapacity.capacity}</li>
          <li>Liver: ${liverCapacity.capacity}</li>
          <li>Kidneys: ${kidneysCapacity.capacity}</li>
        </ul>
      `;
    } catch (error) {
      document.getElementById('capacityList').innerHTML = 'Could not load capacities.';
    }
    
    hospitalInfoEl.style.display = 'block';
    showSuccess('Hospital information retrieved successfully!');
  } catch (error) {
    showError(`Failed to get hospital info: ${error.message}`);
    hospitalInfoEl.style.display = 'none';
  }
};

const verifyHospital = async () => {
  try {
    const address = document.getElementById('verifyHospitalAddress').value;
    const credentials = document.getElementById('hospitalCredentials').value;
    
    if (!address || !credentials) {
      showError('Please fill in all fields.');
      return;
    }

    updateStatus('Verifying hospital...');

    const result = await apiCall('/hospital/verify', 'POST', {
      hospitalAddress: address,
      credentials: credentials
    });
    
    showSuccess(`Hospital verified! TX: ${result.transactionHash}`);
    document.getElementById('verifyHospitalAddress').value = '';
    document.getElementById('hospitalCredentials').value = '';
  } catch (error) {
    showError(`Failed to verify hospital: ${error.message}`);
  }
};

const authorizeStaff = async () => {
  try {
    const hospitalAddress = document.getElementById('staffHospitalAddress').value;
    const staffAddress = document.getElementById('staffAddress').value;
    const role = document.getElementById('staffRoleSelect').value;
    
    if (!hospitalAddress || !staffAddress) {
      showError('Please fill in all fields.');
      return;
    }

    updateStatus('Authorizing staff...');

    const result = await apiCall('/hospital/staff/authorize', 'POST', {
      hospitalAddress,
      staffAddress,
      role: parseInt(role)
    });
    
    showSuccess(`Staff authorized! TX: ${result.transactionHash}`);
    document.getElementById('staffHospitalAddress').value = '';
    document.getElementById('staffAddress').value = '';
  } catch (error) {
    showError(`Failed to authorize staff: ${error.message}`);
  }
};

const updateHospitalCapacity = async () => {
  try {
    const hospitalAddress = document.getElementById('capacityHospitalAddress').value;
    const organType = document.getElementById('capacityOrganType').value;
    const capacity = document.getElementById('capacityAmount').value;
    
    if (!hospitalAddress || !capacity) {
      showError('Please fill in all fields.');
      return;
    }

    updateStatus('Updating hospital capacity...');

    const result = await apiCall('/hospital/capacity', 'POST', {
      hospitalAddress,
      organType: parseInt(organType),
      capacity: parseInt(capacity)
    });
    
    showSuccess(`Hospital capacity updated! TX: ${result.transactionHash}`);
    document.getElementById('capacityHospitalAddress').value = '';
    document.getElementById('capacityAmount').value = '';
  } catch (error) {
    showError(`Failed to update hospital capacity: ${error.message}`);
  }
};

const getStaffRole = async () => {
  try {
    const hospitalAddress = document.getElementById('roleHospitalAddress').value;
    const staffAddress = document.getElementById('roleStaffAddress').value;
    
    if (!hospitalAddress || !staffAddress) {
      showError('Please fill in all fields.');
      return;
    }

    updateStatus('Fetching staff role...');

    const result = await apiCall(`/hospital/${hospitalAddress}/staff/${staffAddress}`);
    
    const roleNames = ['Admin', 'Surgeon', 'Coordinator', 'None'];
    const resultEl = document.getElementById('staffRoleResult');
    
    resultEl.innerHTML = `
      <div class="alert alert-info">
        <strong>Staff Role:</strong> <span class="badge bg-primary">${roleNames[result.role]}</span>
      </div>
    `;
    
    resultEl.style.display = 'block';
    showSuccess('Staff role retrieved successfully!');
  } catch (error) {
    showError(`Failed to get staff role: ${error.message}`);
    document.getElementById('staffRoleResult').style.display = 'none';
  }
};

// Event Listeners Setup
const setupEventListeners = () => {
  // Donor events
  document.getElementById('donorForm').addEventListener('submit', registerDonor);
  document.getElementById('getDonorBtn').addEventListener('click', getDonorInfo);
  document.getElementById('updateDonorStatusBtn').addEventListener('click', updateDonorStatus);
  document.getElementById('deactivateDonorBtn').addEventListener('click', deactivateDonor);

  // Recipient events
  document.getElementById('recipientForm').addEventListener('submit', registerRecipient);
  document.getElementById('getRecipientBtn').addEventListener('click', getRecipientInfo);
  document.getElementById('addToWaitingListBtn').addEventListener('click', addToWaitingList);
  document.getElementById('updateMedicalStatusBtn').addEventListener('click', updateMedicalStatus);

  // Hospital events
  document.getElementById('hospitalForm').addEventListener('submit', registerHospital);
  document.getElementById('getHospitalBtn').addEventListener('click', getHospitalInfo);
  document.getElementById('verifyHospitalBtn').addEventListener('click', verifyHospital);
  document.getElementById('authorizeStaffBtn').addEventListener('click', authorizeStaff);
  document.getElementById('updateCapacityBtn').addEventListener('click', updateHospitalCapacity);
  document.getElementById('getStaffRoleBtn').addEventListener('click', getStaffRole);
};

// Initialize application
const main = async () => {
  updateStatus('Initializing application...');
  setupEventListeners();
  await initializeApp();
};

// Start the application
main().catch(error => {
  console.error('Failed to initialize application:', error);
  showError(`Failed to initialize application: ${error.message}`);
});