const OrganOracle = artifacts.require("OrganOracle");
const Donor = artifacts.require("Donor");
const OrganNFT = artifacts.require("OrganNFT");
const OrganMatching = artifacts.require("OrganMatching");

module.exports = async function (deployer, network, accounts) {
  try {
    console.log("\n=== Deploying OrganOracle Contract ===");
    
    // Deploy OrganOracle
    await deployer.deploy(OrganOracle);
    const oracleInstance = await OrganOracle.deployed();
    
    console.log("✓ OrganOracle deployed at:", oracleInstance.address);
    console.log("✓ Oracle owner:", accounts[0]);
    
    // Get deployed contract instances
    const donorInstance = await Donor.deployed();
    const organNFTInstance = await OrganNFT.deployed();
    const organMatchingInstance = await OrganMatching.deployed();
    
    console.log("\n=== Configuring Contract Integrations ===");
    
    // 1. Set Oracle contract in Donor contract
    try {
      await donorInstance.setOracleContract(oracleInstance.address, {
        from: accounts[0]
      });
      console.log("✓ Oracle contract set in Donor contract");
    } catch (error) {
      console.log("⚠ Could not set oracle in Donor contract:", error.message);
    }
    
    // 2. Authorize OrganMatching contract to call Oracle
    try {
      await oracleInstance.setOracleAuthorization(organMatchingInstance.address, true, {
        from: accounts[0]
      });
      console.log("✓ OrganMatching authorized in Oracle contract");
    } catch (error) {
      console.log("⚠ Could not authorize OrganMatching:", error.message);
    }
    
    // 3. Authorize Oracle to update Donor contract
    try {
      await donorInstance.setAuthorizedContract(oracleInstance.address, true, {
        from: accounts[0]
      });
      console.log("✓ Oracle authorized to update Donor contract");
    } catch (error) {
      console.log("⚠ Could not authorize Oracle in Donor:", error.message);
    }
    
    // 4. Set up additional oracle operators if needed (accounts[1] as backup oracle)
    if (accounts.length > 1) {
      try {
        await oracleInstance.setOracleAuthorization(accounts[1], true, {
          from: accounts[0]
        });
        console.log("✓ Backup oracle operator authorized:", accounts[1]);
      } catch (error) {
        console.log("⚠ Could not set backup oracle:", error.message);
      }
    }
    
    console.log("\n=== Deployment Summary ===");
    console.log("Contract Addresses:");
    console.log("- OrganOracle:", oracleInstance.address);
    console.log("- Donor:", donorInstance.address);
    console.log("- OrganNFT:", organNFTInstance.address);
    console.log("- OrganMatching:", organMatchingInstance.address);
    
    console.log("\nAuthorized Addresses:");
    console.log("- Owner/Primary Oracle:", accounts[0]);
    if (accounts.length > 1) {
      console.log("- Backup Oracle:", accounts[1]);
    }
    
    console.log("\n=== Next Steps ===");
    console.log("1. Start the Oracle Listener service");
    console.log("2. Update frontend configuration with Oracle contract address");
    console.log("3. Test death verification flow on Ganache");
    console.log("4. Monitor Oracle events for pending requests");
    
    // Save deployment info to file for oracle service
    const fs = require('fs');
    const deploymentInfo = {
      network: network,
      timestamp: new Date().toISOString(),
      contracts: {
        oracle: oracleInstance.address,
        donor: donorInstance.address,
        organNFT: organNFTInstance.address,
        organMatching: organMatchingInstance.address
      },
      accounts: {
        owner: accounts[0],
        backupOracle: accounts[1] || null
      }
    };
    
    fs.writeFileSync(
      './oracle-deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n✓ Deployment info saved to oracle-deployment.json");
    
  } catch (error) {
    console.error("\n❌ Error during OrganOracle deployment:", error);
    throw error;
  }
};