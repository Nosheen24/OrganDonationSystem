// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Donor
 * @dev Smart contract for managing organ donors with Oracle integration
 */
contract Donor {
    
    address public owner;
    address public oracleContract;
    
    enum DonorStatus { Active, Deactivated, Matched, Deceased }
    
    struct DonationPreferences {
        bool heart;
        bool liver;
        bool kidneys;
    }
    
    struct DonorInfo {
        string name;
        uint256 age;
        string bloodType;
        DonorStatus status;
        string medicalHistoryHash;
        DonationPreferences preferences;
        uint256 registrationDate;
        uint256 deathVerificationRequestId; // NEW: Oracle request ID
        uint256 deathTimestamp; // NEW: Timestamp of death confirmation
        string deathEvidenceCID; // NEW: IPFS CID of death certificate
    }
    
    mapping(address => DonorInfo) public donors;
    mapping(address => bool) public isDonorRegistered;
    address[] public donorList;
    
    // NEW: Mapping to track which contracts can update donor status
    mapping(address => bool) public authorizedContracts;
    
    // Events
    event DonorRegistered(
        address indexed donorAddress,
        string name,
        uint256 age,
        string bloodType,
        uint256 timestamp
    );
    
    event DonorStatusUpdated(
        address indexed donorAddress,
        DonorStatus newStatus,
        uint256 timestamp
    );
    
    event DonorDeactivated(
        address indexed donorAddress,
        uint256 timestamp
    );
    
    // NEW: Oracle-related events
    event DeathVerificationRequested(
        address indexed donorAddress,
        uint256 indexed requestId,
        uint256 timestamp
    );
    
    event DeathConfirmed(
        address indexed donorAddress,
        uint256 indexed requestId,
        string evidenceCID,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedContracts[msg.sender],
            "Not authorized"
        );
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Set the oracle contract address
     * @param _oracleContract Address of the OrganOracle contract
     */
    function setOracleContract(address _oracleContract) external onlyOwner {
        require(_oracleContract != address(0), "Invalid oracle address");
        oracleContract = _oracleContract;
        authorizedContracts[_oracleContract] = true;
    }
    
    /**
     * @dev Authorize a contract to update donor status
     * @param contractAddress Address of the contract
     * @param authorized True to authorize, false to revoke
     */
    function setAuthorizedContract(address contractAddress, bool authorized) 
        external 
        onlyOwner 
    {
        authorizedContracts[contractAddress] = authorized;
    }
    
    /**
     * @dev Register a new donor
     */
    function registerDonor(
        address donorAddress,
        string memory name,
        uint256 age,
        string memory bloodType,
        string memory medicalHistoryHash,
        DonationPreferences memory preferences
    ) external onlyOwner {
        require(!isDonorRegistered[donorAddress], "Donor already registered");
        require(age >= 18, "Donor must be at least 18 years old");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(bloodType).length > 0, "Blood type cannot be empty");
        
        donors[donorAddress] = DonorInfo({
            name: name,
            age: age,
            bloodType: bloodType,
            status: DonorStatus.Active,
            medicalHistoryHash: medicalHistoryHash,
            preferences: preferences,
            registrationDate: block.timestamp,
            deathVerificationRequestId: 0,
            deathTimestamp: 0,
            deathEvidenceCID: ""
        });
        
        isDonorRegistered[donorAddress] = true;
        donorList.push(donorAddress);
        
        emit DonorRegistered(donorAddress, name, age, bloodType, block.timestamp);
    }
    
    /**
     * @dev Update donor status
     */
    function updateDonorStatus(address donorAddress, DonorStatus newStatus) 
        external 
        onlyAuthorized 
    {
        require(isDonorRegistered[donorAddress], "Donor not registered");
        
        donors[donorAddress].status = newStatus;
        
        emit DonorStatusUpdated(donorAddress, newStatus, block.timestamp);
    }
    
    /**
     * @dev Deactivate a donor
     */
    function deactivateDonor(address donorAddress) external onlyOwner {
        require(isDonorRegistered[donorAddress], "Donor not registered");
        
        donors[donorAddress].status = DonorStatus.Deactivated;
        
        emit DonorDeactivated(donorAddress, block.timestamp);
    }
    
    /**
     * @dev NEW: Request death verification from Oracle
     * @param donorAddress Address of the donor
     */
    function requestDeathVerification(address donorAddress) 
        external 
        onlyAuthorized 
        returns (uint256) 
    {
        require(isDonorRegistered[donorAddress], "Donor not registered");
        require(oracleContract != address(0), "Oracle contract not set");
        require(
            donors[donorAddress].status == DonorStatus.Active,
            "Donor must be active"
        );
        
        // Call oracle contract to request verification
        (bool success, bytes memory data) = oracleContract.call(
            abi.encodeWithSignature("requestDeathVerification(address)", donorAddress)
        );
        
        require(success, "Oracle request failed");
        uint256 requestId = abi.decode(data, (uint256));
        
        donors[donorAddress].deathVerificationRequestId = requestId;
        
        emit DeathVerificationRequested(donorAddress, requestId, block.timestamp);
        
        return requestId;
    }
    
    /**
     * @dev NEW: Confirm donor death (called by Oracle or authorized contract)
     * @param donorAddress Address of the donor
     * @param requestId Oracle request ID
     * @param evidenceCID IPFS CID of death certificate
     */
    function confirmDeath(
        address donorAddress,
        uint256 requestId,
        string memory evidenceCID
    ) 
        external 
        onlyAuthorized 
    {
        require(isDonorRegistered[donorAddress], "Donor not registered");
        require(
            donors[donorAddress].deathVerificationRequestId == requestId,
            "Invalid request ID"
        );
        
        donors[donorAddress].status = DonorStatus.Deceased;
        donors[donorAddress].deathTimestamp = block.timestamp;
        donors[donorAddress].deathEvidenceCID = evidenceCID;
        
        emit DeathConfirmed(donorAddress, requestId, evidenceCID, block.timestamp);
        emit DonorStatusUpdated(donorAddress, DonorStatus.Deceased, block.timestamp);
    }
    
    /**
     * @dev Get donor information
     */
    function getDonorInfo(address donorAddress) 
        external 
        view 
        returns (
            string memory name,
            uint256 age,
            string memory bloodType,
            DonorStatus status,
            string memory medicalHistoryHash,
            DonationPreferences memory preferences
        ) 
    {
        require(isDonorRegistered[donorAddress], "Donor not registered");
        
        DonorInfo memory donor = donors[donorAddress];
        return (
            donor.name,
            donor.age,
            donor.bloodType,
            donor.status,
            donor.medicalHistoryHash,
            donor.preferences
        );
    }
    
    /**
     * @dev NEW: Get donor death information
     */
    function getDonorDeathInfo(address donorAddress)
        external
        view
        returns (
            uint256 deathVerificationRequestId,
            uint256 deathTimestamp,
            string memory deathEvidenceCID
        )
    {
        require(isDonorRegistered[donorAddress], "Donor not registered");
        
        DonorInfo memory donor = donors[donorAddress];
        return (
            donor.deathVerificationRequestId,
            donor.deathTimestamp,
            donor.deathEvidenceCID
        );
    }
    
    /**
     * @dev Check if donor is active
     */
    function isDonorActive(address donorAddress) external view returns (bool) {
        return isDonorRegistered[donorAddress] && 
               donors[donorAddress].status == DonorStatus.Active;
    }
    
    /**
     * @dev Get total number of donors
     */
    function getTotalDonors() external view returns (uint256) {
        return donorList.length;
    }
    
    /**
     * @dev Get all donors
     */
    function getAllDonors() external view returns (address[] memory) {
        return donorList;
    }
    
    /**
     * @dev NEW: Get all deceased donors
     */
    function getDeceasedDonors() external view returns (address[] memory) {
        uint256 deceasedCount = 0;
        
        // Count deceased donors
        for (uint256 i = 0; i < donorList.length; i++) {
            if (donors[donorList[i]].status == DonorStatus.Deceased) {
                deceasedCount++;
            }
        }
        
        // Create array of deceased donors
        address[] memory deceasedDonors = new address[](deceasedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < donorList.length; i++) {
            if (donors[donorList[i]].status == DonorStatus.Deceased) {
                deceasedDonors[index] = donorList[i];
                index++;
            }
        }
        
        return deceasedDonors;
    }
}