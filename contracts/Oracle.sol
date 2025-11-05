// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title OrganOracle
 * @dev Oracle contract for verifying donor death status from off-chain sources
 */
contract OrganOracle {
    
    // Owner of the contract
    address public owner;
    
    // Authorized oracle operators who can fulfill requests
    mapping(address => bool) public authorizedOracles;
    
    // Request ID counter
    uint256 private requestIdCounter;
    
    // Death verification requests
    struct DeathVerificationRequest {
        uint256 requestId;
        address donorAddress;
        address requester;
        uint256 timestamp;
        bool fulfilled;
        bool isDeceased;
        string evidenceCID; // IPFS CID for death certificate or evidence
        uint256 fulfilledTimestamp;
        address fulfilledBy;
    }
    
    // Mapping from request ID to request details
    mapping(uint256 => DeathVerificationRequest) public requests;
    
    // Mapping from donor address to their latest request ID
    mapping(address => uint256) public donorLatestRequest;
    
    // Mapping to prevent replay attacks
    mapping(bytes32 => bool) public usedSignatures;
    
    // Events
    event OracleRequest(
        uint256 indexed requestId,
        address indexed donorAddress,
        address indexed requester,
        uint256 timestamp
    );
    
    event OracleResponse(
        uint256 indexed requestId,
        address indexed donorAddress,
        bool isDeceased,
        string evidenceCID,
        address fulfilledBy,
        uint256 timestamp
    );
    
    event OracleAuthorized(address indexed oracle, bool authorized);
    
    event EmergencyDeathVerification(
        address indexed donorAddress,
        uint256 indexed requestId,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender], "Not an authorized oracle");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        requestIdCounter = 1;
        // Owner is automatically an authorized oracle
        authorizedOracles[owner] = true;
    }
    
    /**
     * @dev Authorize or deauthorize an oracle operator
     * @param oracleAddress Address of the oracle operator
     * @param authorized True to authorize, false to deauthorize
     */
    function setOracleAuthorization(address oracleAddress, bool authorized) 
        external 
        onlyOwner 
    {
        require(oracleAddress != address(0), "Invalid oracle address");
        authorizedOracles[oracleAddress] = authorized;
        emit OracleAuthorized(oracleAddress, authorized);
    }
    
    /**
     * @dev Request death verification for a donor
     * @param donorAddress Address of the donor to verify
     * @return requestId The ID of the created request
     */
    function requestDeathVerification(address donorAddress) 
        external 
        returns (uint256) 
    {
        require(donorAddress != address(0), "Invalid donor address");
        
        uint256 requestId = requestIdCounter++;
        
        requests[requestId] = DeathVerificationRequest({
            requestId: requestId,
            donorAddress: donorAddress,
            requester: msg.sender,
            timestamp: block.timestamp,
            fulfilled: false,
            isDeceased: false,
            evidenceCID: "",
            fulfilledTimestamp: 0,
            fulfilledBy: address(0)
        });
        
        donorLatestRequest[donorAddress] = requestId;
        
        emit OracleRequest(requestId, donorAddress, msg.sender, block.timestamp);
        
        return requestId;
    }
    
    /**
     * @dev Fulfill a death verification request (called by oracle)
     * @param requestId ID of the request to fulfill
     * @param isDeceased Whether the donor is deceased
     * @param evidenceCID IPFS CID of the death certificate or evidence
     */
    function fulfillDeathVerification(
        uint256 requestId,
        bool isDeceased,
        string memory evidenceCID
    ) 
        external 
        onlyAuthorizedOracle 
    {
        require(requests[requestId].requestId != 0, "Request does not exist");
        require(!requests[requestId].fulfilled, "Request already fulfilled");
        
        DeathVerificationRequest storage request = requests[requestId];
        request.fulfilled = true;
        request.isDeceased = isDeceased;
        request.evidenceCID = evidenceCID;
        request.fulfilledTimestamp = block.timestamp;
        request.fulfilledBy = msg.sender;
        
        emit OracleResponse(
            requestId,
            request.donorAddress,
            isDeceased,
            evidenceCID,
            msg.sender,
            block.timestamp
        );
        
        // If deceased, emit emergency event for quick processing
        if (isDeceased) {
            emit EmergencyDeathVerification(
                request.donorAddress,
                requestId,
                block.timestamp
            );
        }
    }
    
    /**
     * @dev Fulfill with signature verification (more secure)
     * @param requestId ID of the request
     * @param isDeceased Death status
     * @param evidenceCID Evidence IPFS CID
     * @param signature Signature from authorized oracle
     */
    function fulfillWithSignature(
        uint256 requestId,
        bool isDeceased,
        string memory evidenceCID,
        bytes memory signature
    ) 
        external 
        onlyAuthorizedOracle 
    {
        require(requests[requestId].requestId != 0, "Request does not exist");
        require(!requests[requestId].fulfilled, "Request already fulfilled");
        
        // Create hash of the data
        bytes32 messageHash = keccak256(abi.encodePacked(
            requestId,
            isDeceased,
            evidenceCID,
            block.chainid,
            address(this)
        ));
        
        // Check for replay attack
        require(!usedSignatures[messageHash], "Signature already used");
        usedSignatures[messageHash] = true;
        
        // Verify signature
        bytes32 ethSignedHash = getEthSignedMessageHash(messageHash);
        require(recoverSigner(ethSignedHash, signature) == msg.sender, "Invalid signature");
        
        // Fulfill the request
        DeathVerificationRequest storage request = requests[requestId];
        request.fulfilled = true;
        request.isDeceased = isDeceased;
        request.evidenceCID = evidenceCID;
        request.fulfilledTimestamp = block.timestamp;
        request.fulfilledBy = msg.sender;
        
        emit OracleResponse(
            requestId,
            request.donorAddress,
            isDeceased,
            evidenceCID,
            msg.sender,
            block.timestamp
        );
        
        if (isDeceased) {
            emit EmergencyDeathVerification(
                request.donorAddress,
                requestId,
                block.timestamp
            );
        }
    }
    
    /**
     * @dev Get death verification status for a donor
     * @param donorAddress Address of the donor
     * @return isVerified Whether verification is complete
     * @return isDeceased Whether the donor is deceased
     * @return evidenceCID Evidence IPFS CID
     */
    function getDeathVerification(address donorAddress) 
        external 
        view 
        returns (bool isVerified, bool isDeceased, string memory evidenceCID) 
    {
        uint256 latestRequestId = donorLatestRequest[donorAddress];
        
        if (latestRequestId == 0) {
            return (false, false, "");
        }
        
        DeathVerificationRequest memory request = requests[latestRequestId];
        return (request.fulfilled, request.isDeceased, request.evidenceCID);
    }
    
    /**
     * @dev Get request details
     * @param requestId ID of the request
     * @return request The request details
     */
    function getRequest(uint256 requestId) 
        external 
        view 
        returns (DeathVerificationRequest memory) 
    {
        return requests[requestId];
    }
    
    /**
     * @dev Get all pending requests
     * @return pendingRequests Array of pending request IDs
     */
    function getPendingRequests() 
        external 
        view 
        returns (uint256[] memory) 
    {
        // Count pending requests
        uint256 pendingCount = 0;
        for (uint256 i = 1; i < requestIdCounter; i++) {
            if (!requests[i].fulfilled) {
                pendingCount++;
            }
        }
        
        // Create array of pending request IDs
        uint256[] memory pendingRequests = new uint256[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 1; i < requestIdCounter; i++) {
            if (!requests[i].fulfilled) {
                pendingRequests[index] = i;
                index++;
            }
        }
        
        return pendingRequests;
    }
    
    // Signature helper functions
    function getEthSignedMessageHash(bytes32 messageHash) 
        internal 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }
    
    function recoverSigner(bytes32 ethSignedHash, bytes memory signature) 
        internal 
        pure 
        returns (address) 
    {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedHash, v, r, s);
    }
    
    function splitSignature(bytes memory sig) 
        internal 
        pure 
        returns (bytes32 r, bytes32 s, uint8 v) 
    {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
    
    /**
     * @dev Transfer ownership
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
        authorizedOracles[newOwner] = true;
    }
}