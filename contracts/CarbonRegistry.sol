// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./BlueCarbon.sol";
import "./NFTCertificate.sol";

/**
 * @title CarbonRegistry
 * @dev Registry contract for managing Blue Carbon MRV projects with double-counting prevention
 * Coordinates between BlueCarbon ERC20 tokens and NFT certificates
 */
contract CarbonRegistry is Ownable, ReentrancyGuard {
    
    BlueCarbon public immutable blueCarbonToken;
    NFTCertificate public immutable nftCertificate;

    // Project status enum
    enum ProjectStatus { Pending, Verified, Rejected, Locked }

    // Project registry structure
    struct RegisteredProject {
        string projectId;
        address submitter;
        uint256 areaHectares;
        string location;
        bytes32 locationHash;
        bytes32 dataHash;
        ProjectStatus status;
        uint256 submissionTime;
        uint256 verificationTime;
        address verifier;
        uint256 carbonCredits;
        uint256 nftTokenId;
        bool nftMinted;
    }

    // Mappings for double-counting prevention
    mapping(string => RegisteredProject) public projects;
    mapping(bytes32 => bool) public usedLocationHashes;
    mapping(bytes32 => bool) public usedDataHashes;
    mapping(address => string[]) public submitterProjects;
    
    // Verification requirements
    mapping(address => bool) public authorizedVerifiers;
    
    // Statistics
    uint256 public totalRegisteredProjects;
    uint256 public totalVerifiedProjects;
    uint256 public totalRejectedProjects;

    // Events
    event ProjectRegistered(
        string indexed projectId,
        address indexed submitter,
        bytes32 locationHash,
        bytes32 dataHash
    );

    event ProjectVerified(
        string indexed projectId,
        address indexed verifier,
        uint256 carbonCredits,
        uint256 nftTokenId
    );

    event ProjectRejected(
        string indexed projectId,
        address indexed verifier,
        string reason
    );

    event DuplicateAttemptDetected(
        string indexed projectId,
        address indexed submitter,
        string conflictType
    );

    event VerifierAuthorized(address indexed verifier);
    event VerifierRevoked(address indexed verifier);

    constructor(address _blueCarbonToken, address _nftCertificate) {
        blueCarbonToken = BlueCarbon(_blueCarbonToken);
        nftCertificate = NFTCertificate(_nftCertificate);
        authorizedVerifiers[msg.sender] = true;
    }

    modifier onlyAuthorizedVerifier() {
        require(authorizedVerifiers[msg.sender], "CarbonRegistry: Not an authorized verifier");
        _;
    }

    modifier projectExists(string memory projectId) {
        require(bytes(projects[projectId].projectId).length > 0, "CarbonRegistry: Project does not exist");
        _;
    }

    /**
     * @dev Register a new project with double-counting prevention
     * @param projectId Unique project identifier
     * @param areaHectares Area of the plantation in hectares
     * @param location Geographic location description
     * @param latitude Latitude coordinates (as string to avoid precision loss)
     * @param longitude Longitude coordinates (as string to avoid precision loss)
     * @param ipfsDataHash IPFS hash of project documentation
     */
    function registerProject(
        string memory projectId,
        uint256 areaHectares,
        string memory location,
        string memory latitude,
        string memory longitude,
        string memory ipfsDataHash
    ) external nonReentrant {
        require(bytes(projectId).length > 0, "CarbonRegistry: Empty project ID");
        require(areaHectares > 0, "CarbonRegistry: Area must be greater than 0");
        require(bytes(projects[projectId].projectId).length == 0, "CarbonRegistry: Project ID already exists");

        // Create hashes for double-counting prevention
        bytes32 locationHash = keccak256(abi.encodePacked(latitude, longitude, areaHectares));
        bytes32 dataHash = keccak256(abi.encodePacked(projectId, ipfsDataHash, msg.sender));

        // Check for duplicate locations (with tolerance for small variations)
        require(!usedLocationHashes[locationHash], "CarbonRegistry: Location already registered");
        
        // Check for duplicate data submissions
        require(!usedDataHashes[dataHash], "CarbonRegistry: Data already submitted");

        // Register the project
        projects[projectId] = RegisteredProject({
            projectId: projectId,
            submitter: msg.sender,
            areaHectares: areaHectares,
            location: location,
            locationHash: locationHash,
            dataHash: dataHash,
            status: ProjectStatus.Pending,
            submissionTime: block.timestamp,
            verificationTime: 0,
            verifier: address(0),
            carbonCredits: 0,
            nftTokenId: 0,
            nftMinted: false
        });

        // Mark hashes as used
        usedLocationHashes[locationHash] = true;
        usedDataHashes[dataHash] = true;

        // Add to submitter's project list
        submitterProjects[msg.sender].push(projectId);
        totalRegisteredProjects++;

        emit ProjectRegistered(projectId, msg.sender, locationHash, dataHash);
    }

    /**
     * @dev Verify a project and mint carbon credits + NFT certificate
     * @param projectId Project to verify
     * @param carbonCredits Amount of carbon credits to award
     * @param metadataURI IPFS URI for NFT metadata
     * @param ecosystem Type of ecosystem ("mangrove", "seagrass", "saltmarsh")
     */
    function verifyProjectAndMint(
        string memory projectId,
        uint256 carbonCredits,
        string memory metadataURI,
        string memory ecosystem
    ) external onlyAuthorizedVerifier projectExists(projectId) nonReentrant {
        RegisteredProject storage project = projects[projectId];
        require(project.status == ProjectStatus.Pending, "CarbonRegistry: Project not pending verification");
        require(carbonCredits > 0, "CarbonRegistry: Carbon credits must be greater than 0");

        // Update project status
        project.status = ProjectStatus.Verified;
        project.verificationTime = block.timestamp;
        project.verifier = msg.sender;
        project.carbonCredits = carbonCredits;

        // Mint carbon credits to the project submitter
        blueCarbonToken.verifyProjectAndMint(projectId, project.submitter, carbonCredits);

        // Mint NFT certificate
        uint256 nftTokenId = nftCertificate.mintCertificate(
            projectId,
            project.location,
            project.areaHectares,
            carbonCredits,
            ecosystem,
            project.submitter,
            metadataURI
        );

        project.nftTokenId = nftTokenId;
        project.nftMinted = true;

        totalVerifiedProjects++;

        emit ProjectVerified(projectId, msg.sender, carbonCredits, nftTokenId);
    }

    /**
     * @dev Reject a project
     * @param projectId Project to reject
     * @param reason Reason for rejection
     */
    function rejectProject(
        string memory projectId,
        string memory reason
    ) external onlyAuthorizedVerifier projectExists(projectId) {
        RegisteredProject storage project = projects[projectId];
        require(project.status == ProjectStatus.Pending, "CarbonRegistry: Project not pending verification");

        project.status = ProjectStatus.Rejected;
        project.verificationTime = block.timestamp;
        project.verifier = msg.sender;

        totalRejectedProjects++;

        emit ProjectRejected(projectId, msg.sender, reason);
    }

    /**
     * @dev Check if a location is already registered (double-counting prevention)
     * @param latitude Latitude coordinates
     * @param longitude Longitude coordinates
     * @param areaHectares Area in hectares
     * @return bool True if location is already used
     */
    function isLocationUsed(
        string memory latitude,
        string memory longitude,
        uint256 areaHectares
    ) external view returns (bool) {
        bytes32 locationHash = keccak256(abi.encodePacked(latitude, longitude, areaHectares));
        return usedLocationHashes[locationHash];
    }

    /**
     * @dev Get project details
     * @param projectId Project identifier
     * @return RegisteredProject struct
     */
    function getProject(string memory projectId) external view returns (RegisteredProject memory) {
        return projects[projectId];
    }

    /**
     * @dev Get all projects submitted by an address
     * @param submitter Address to query
     * @return string[] Array of project IDs
     */
    function getProjectsBySubmitter(address submitter) external view returns (string[] memory) {
        return submitterProjects[submitter];
    }

    /**
     * @dev Authorize a verifier
     * @param verifier Address to authorize
     */
    function authorizeVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "CarbonRegistry: Invalid verifier address");
        authorizedVerifiers[verifier] = true;
        emit VerifierAuthorized(verifier);
    }

    /**
     * @dev Revoke verifier authorization
     * @param verifier Address to revoke
     */
    function revokeVerifier(address verifier) external onlyOwner {
        authorizedVerifiers[verifier] = false;
        emit VerifierRevoked(verifier);
    }

    /**
     * @dev Check if an address is an authorized verifier
     * @param verifier Address to check
     * @return bool True if authorized
     */
    function isAuthorizedVerifier(address verifier) external view returns (bool) {
        return authorizedVerifiers[verifier];
    }

    /**
     * @dev Get registry statistics
     * @return totalRegistered Total projects registered
     * @return totalVerified Total projects verified
     * @return totalRejected Total projects rejected
     * @return totalPending Total projects pending verification
     */
    function getRegistryStats() external view returns (
        uint256 totalRegistered,
        uint256 totalVerified,
        uint256 totalRejected,
        uint256 totalPending
    ) {
        return (
            totalRegisteredProjects,
            totalVerifiedProjects,
            totalRejectedProjects,
            totalRegisteredProjects - totalVerifiedProjects - totalRejectedProjects
        );
    }

    /**
     * @dev Emergency function to lock a project (in case of disputes)
     * @param projectId Project to lock
     */
    function lockProject(string memory projectId) external onlyOwner projectExists(projectId) {
        projects[projectId].status = ProjectStatus.Locked;
    }

    /**
     * @dev Unlock a previously locked project
     * @param projectId Project to unlock
     */
    function unlockProject(string memory projectId) external onlyOwner projectExists(projectId) {
        require(projects[projectId].status == ProjectStatus.Locked, "CarbonRegistry: Project not locked");
        projects[projectId].status = ProjectStatus.Pending;
    }
}