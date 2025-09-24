// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title NFTCertificate
 * @dev NFT contract for Blue Carbon MRV plantation certificates
 * Each verified plantation project gets a unique NFT with metadata
 */
contract NFTCertificate is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    // Mapping from project ID to token ID
    mapping(string => uint256) public projectToTokenId;
    
    // Mapping from token ID to project details
    mapping(uint256 => PlantationData) public tokenToProject;
    
    // Mapping to prevent duplicate project certificates
    mapping(string => bool) public projectCertified;

    struct PlantationData {
        string projectId;
        string location;
        uint256 areaHectares;
        uint256 carbonCredits;
        uint256 plantationDate;
        string ecosystem; // "mangrove", "seagrass", "saltmarsh"
        address beneficiary;
        bool verified;
    }

    event CertificateMinted(
        uint256 indexed tokenId,
        string indexed projectId,
        address indexed beneficiary,
        uint256 areaHectares,
        uint256 carbonCredits
    );

    event ProjectVerified(
        string indexed projectId,
        uint256 indexed tokenId,
        address verifier
    );

    constructor() ERC721("Blue Carbon Certificate", "BCC") {}

    /**
     * @dev Mint a new plantation certificate NFT
     * @param projectId Unique project identifier
     * @param location Geographic location of the plantation
     * @param areaHectares Area of plantation in hectares
     * @param carbonCredits Carbon credits generated
     * @param ecosystem Type of blue carbon ecosystem
     * @param beneficiary Address that will receive the NFT
     * @param metadataURI IPFS URI containing certificate metadata
     */
    function mintCertificate(
        string memory projectId,
        string memory location,
        uint256 areaHectares,
        uint256 carbonCredits,
        string memory ecosystem,
        address beneficiary,
        string memory metadataURI
    ) public onlyOwner returns (uint256) {
        require(!projectCertified[projectId], "Project already certified");
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(areaHectares > 0, "Area must be greater than 0");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Store project data
        tokenToProject[tokenId] = PlantationData({
            projectId: projectId,
            location: location,
            areaHectares: areaHectares,
            carbonCredits: carbonCredits,
            plantationDate: block.timestamp,
            ecosystem: ecosystem,
            beneficiary: beneficiary,
            verified: true
        });

        // Update mappings
        projectToTokenId[projectId] = tokenId;
        projectCertified[projectId] = true;

        // Mint the NFT
        _safeMint(beneficiary, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit CertificateMinted(tokenId, projectId, beneficiary, areaHectares, carbonCredits);

        return tokenId;
    }

    /**
     * @dev Update carbon credits for an existing certificate
     * @param tokenId Token ID of the certificate
     * @param newCarbonCredits Updated carbon credits amount
     */
    function updateCarbonCredits(uint256 tokenId, uint256 newCarbonCredits) public onlyOwner {
        require(_exists(tokenId), "Certificate does not exist");
        tokenToProject[tokenId].carbonCredits = newCarbonCredits;
    }

    /**
     * @dev Get certificate details by project ID
     * @param projectId Project identifier
     * @return PlantationData struct with project details
     */
    function getCertificateByProject(string memory projectId) public view returns (PlantationData memory) {
        require(projectCertified[projectId], "Project not certified");
        uint256 tokenId = projectToTokenId[projectId];
        return tokenToProject[tokenId];
    }

    /**
     * @dev Get certificate details by token ID
     * @param tokenId Token identifier
     * @return PlantationData struct with project details
     */
    function getCertificateByToken(uint256 tokenId) public view returns (PlantationData memory) {
        require(_exists(tokenId), "Certificate does not exist");
        return tokenToProject[tokenId];
    }

    /**
     * @dev Check if a project has been certified
     * @param projectId Project identifier
     * @return bool True if project is certified
     */
    function isProjectCertified(string memory projectId) public view returns (bool) {
        return projectCertified[projectId];
    }

    /**
     * @dev Get total number of certificates minted
     * @return uint256 Total certificates
     */
    function totalCertificates() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Get all certificates owned by an address
     * @param owner Address to query
     * @return uint256[] Array of token IDs owned
     */
    function getCertificatesByOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < _tokenIdCounter.current(); i++) {
            if (_exists(i) && ownerOf(i) == owner) {
                tokens[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return tokens;
    }

    /**
     * @dev Calculate total verified area for an owner
     * @param owner Address to query
     * @return uint256 Total area in hectares
     */
    function getTotalVerifiedArea(address owner) public view returns (uint256) {
        uint256[] memory tokens = getCertificatesByOwner(owner);
        uint256 totalArea = 0;
        
        for (uint256 i = 0; i < tokens.length; i++) {
            totalArea += tokenToProject[tokens[i]].areaHectares;
        }
        
        return totalArea;
    }

    /**
     * @dev Calculate total carbon credits for an owner
     * @param owner Address to query
     * @return uint256 Total carbon credits
     */
    function getTotalCarbonCredits(address owner) public view returns (uint256) {
        uint256[] memory tokens = getCertificatesByOwner(owner);
        uint256 totalCredits = 0;
        
        for (uint256 i = 0; i < tokens.length; i++) {
            totalCredits += tokenToProject[tokens[i]].carbonCredits;
        }
        
        return totalCredits;
    }

    // Override required functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        
        // Clean up mappings
        string memory projectId = tokenToProject[tokenId].projectId;
        delete tokenToProject[tokenId];
        delete projectToTokenId[projectId];
        projectCertified[projectId] = false;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}