const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

// Load contract ABIs
const donorABI = require('../build/contracts/Donor.json').abi;
const recipientABI = require('../build/contracts/Recipient.json').abi;
const hospitalABI = require('../build/contracts/Hospital.json').abi;

class ContractService {
  constructor() {
    this.web3 = null;
    this.account = null;
    this.donorContract = null;
    this.recipientContract = null;
    this.hospitalContract = null;
  }

  async initialize() {
    try {
      // Connect to Ganache
      this.web3 = new Web3(process.env.GANACHE_URL);
      
      // Create account from private key
      const privateKey = process.env.PRIVATE_KEY.startsWith('0x') 
        ? process.env.PRIVATE_KEY 
        : '0x' + process.env.PRIVATE_KEY;
      
      this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(this.account);
      this.web3.eth.defaultAccount = this.account.address;

      console.log('📍 Connected account:', this.account.address);

      // Get contract addresses from build files
      const donorBuild = require('../build/contracts/Donor.json');
      const recipientBuild = require('../build/contracts/Recipient.json');
      const hospitalBuild = require('../build/contracts/Hospital.json');

      // Get network ID
      const networkId = await this.web3.eth.net.getId();
      console.log('🌐 Network ID:', networkId);

      // Get deployed addresses
      const donorAddress = donorBuild.networks[networkId]?.address;
      const recipientAddress = recipientBuild.networks[networkId]?.address;
      const hospitalAddress = hospitalBuild.networks[networkId]?.address;

      if (!donorAddress || !recipientAddress || !hospitalAddress) {
        throw new Error('Contracts not deployed. Please run: truffle migrate --reset');
      }

      // Initialize contracts
      this.donorContract = new this.web3.eth.Contract(donorABI, donorAddress);
      this.recipientContract = new this.web3.eth.Contract(recipientABI, recipientAddress);
      this.hospitalContract = new this.web3.eth.Contract(hospitalABI, hospitalAddress);

      console.log('📄 Donor Contract:', donorAddress);
      console.log('📄 Recipient Contract:', recipientAddress);
      console.log('📄 Hospital Contract:', hospitalAddress);

      // Check balance
      const balance = await this.web3.eth.getBalance(this.account.address);
      console.log('💰 Account balance:', this.web3.utils.fromWei(balance, 'ether'), 'ETH');

      return true;
    } catch (error) {
      console.error('Initialization error:', error.message);
      throw error;
    }
  }

  async getAccountInfo() {
    const balance = await this.web3.eth.getBalance(this.account.address);
    return {
      address: this.account.address,
      balance: this.web3.utils.fromWei(balance, 'ether'),
      donorContract: this.donorContract.options.address,
      recipientContract: this.recipientContract.options.address,
      hospitalContract: this.hospitalContract.options.address
    };
  }

  // ==================== DONOR METHODS ====================

  async registerDonor(donorAddress, name, age, bloodType, medicalHistoryHash, preferences) {
    try {
      const tx = await this.donorContract.methods
        .registerDonor(
          donorAddress,
          name,
          age,
          bloodType,
          medicalHistoryHash || '',
          preferences
        )
        .send({
          from: this.account.address,
          gas: 500000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Register donor failed: ${error.message}`);
    }
  }

  async getDonorInfo(donorAddress) {
    try {
      const donor = await this.donorContract.methods.getDonorInfo(donorAddress).call();
      return {
        name: donor.name || donor[0],
        age: donor.age || donor[1],
        bloodType: donor.bloodType || donor[2],
        status: donor.status || donor[3],
        medicalHistoryHash: donor.medicalHistoryHash || donor[4],
        preferences: donor.preferences || donor[5]
      };
    } catch (error) {
      throw new Error(`Get donor info failed: ${error.message}`);
    }
  }

  async updateDonorStatus(donorAddress, status) {
    try {
      const tx = await this.donorContract.methods
        .updateDonorStatus(donorAddress, status)
        .send({
          from: this.account.address,
          gas: 300000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Update donor status failed: ${error.message}`);
    }
  }

  async deactivateDonor(donorAddress) {
    try {
      const tx = await this.donorContract.methods
        .deactivateDonor(donorAddress)
        .send({
          from: this.account.address,
          gas: 300000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Deactivate donor failed: ${error.message}`);
    }
  }

  // ==================== RECIPIENT METHODS ====================

  async registerRecipient(recipientAddress, name, age, bloodType, medicalHistoryHash, location) {
    try {
      const tx = await this.recipientContract.methods
        .registerRecipient(
          recipientAddress,
          name,
          age,
          bloodType,
          medicalHistoryHash || '',
          location
        )
        .send({
          from: this.account.address,
          gas: 500000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Register recipient failed: ${error.message}`);
    }
  }

  async getRecipientInfo(recipientAddress) {
    try {
      const recipient = await this.recipientContract.methods.getRecipientInfo(recipientAddress).call();
      return {
        name: recipient.name || recipient[0],
        age: recipient.age || recipient[1],
        bloodType: recipient.bloodType || recipient[2],
        medicalHistoryHash: recipient.medicalHistoryHash || recipient[3],
        medicalStatus: recipient.medicalStatus || recipient[4],
        location: recipient.location || recipient[5]
      };
    } catch (error) {
      throw new Error(`Get recipient info failed: ${error.message}`);
    }
  }

  async addToWaitingList(recipientAddress, organType, urgencyLevel) {
    try {
      const tx = await this.recipientContract.methods
        .addToWaitingList(recipientAddress, organType, urgencyLevel)
        .send({
          from: this.account.address,
          gas: 300000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Add to waiting list failed: ${error.message}`);
    }
  }

  async updateRecipientMedicalStatus(recipientAddress, status) {
    try {
      const tx = await this.recipientContract.methods
        .updateRecipientMedicalStatus(recipientAddress, status)
        .send({
          from: this.account.address,
          gas: 300000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Update medical status failed: ${error.message}`);
    }
  }

  // ==================== HOSPITAL METHODS ====================

  async registerHospital(hospitalAddress, hospitalInfo) {
    try {
      const tx = await this.hospitalContract.methods
        .registerHospital(hospitalAddress, hospitalInfo)
        .send({
          from: this.account.address,
          gas: 500000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Register hospital failed: ${error.message}`);
    }
  }

  async getHospitalInfo(hospitalAddress) {
    try {
      const hospital = await this.hospitalContract.methods.getHospitalInfo(hospitalAddress).call();
      return {
        name: hospital.name || hospital[0],
        location: hospital.location || hospital[1],
        licenseId: hospital.licenseId || hospital[2],
        isVerified: hospital.isVerified || hospital[3]
      };
    } catch (error) {
      throw new Error(`Get hospital info failed: ${error.message}`);
    }
  }

  async verifyHospital(hospitalAddress, credentials) {
    try {
      const credentialsBytes = this.web3.utils.asciiToHex(credentials);
      
      const tx = await this.hospitalContract.methods
        .verifyHospitalCredentials(hospitalAddress, credentialsBytes)
        .send({
          from: this.account.address,
          gas: 300000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Verify hospital failed: ${error.message}`);
    }
  }

  async authorizeStaff(hospitalAddress, staffAddress, role) {
    try {
      const tx = await this.hospitalContract.methods
        .authorizeHospitalStaff(hospitalAddress, staffAddress, role)
        .send({
          from: this.account.address,
          gas: 300000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Authorize staff failed: ${error.message}`);
    }
  }

  async updateHospitalCapacity(hospitalAddress, organType, capacity) {
    try {
      const tx = await this.hospitalContract.methods
        .updateHospitalCapacity(hospitalAddress, organType, capacity)
        .send({
          from: this.account.address,
          gas: 300000
        });

      return {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      throw new Error(`Update hospital capacity failed: ${error.message}`);
    }
  }

  async getHospitalCapacity(hospitalAddress, organType) {
    try {
      const capacity = await this.hospitalContract.methods
        .getHospitalCapacity(hospitalAddress, organType)
        .call();
      return capacity.toString();
    } catch (error) {
      throw new Error(`Get hospital capacity failed: ${error.message}`);
    }
  }

  async getStaffRole(hospitalAddress, staffAddress) {
    try {
      const role = await this.hospitalContract.methods
        .getStaffRole(hospitalAddress, staffAddress)
        .call();
      return role.toString();
    } catch (error) {
      throw new Error(`Get staff role failed: ${error.message}`);
    }
  }
}

module.exports = new ContractService();