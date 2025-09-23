// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract BlueCarbon is ERC20, AccessControl, ERC20Burnable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant NGO_ROLE = keccak256("NGO_ROLE");

    // Events
    event ProjectVerified(string indexed projectId, address indexed ngo, uint256 creditsIssued);
    event CreditsRetired(address indexed owner, uint256 amount, string reason);

    // Project tracking
    mapping(string => bool) public verifiedProjects;
    mapping(string => uint256) public projectCredits;
    
    // Statistics
    uint256 public totalProjectsVerified;
    uint256 public totalCreditsIssued;
    uint256 public totalCreditsRetired;

    constructor() ERC20("BlueCarbon Credit", "BC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "BlueCarbon: caller is not an admin");
        _;
    }

    modifier onlyNGO() {
        require(hasRole(NGO_ROLE, msg.sender), "BlueCarbon: caller is not an NGO");
        _;
    }

    function grantNGORole(address ngo) external onlyAdmin {
        _grantRole(NGO_ROLE, ngo);
    }

    function revokeNGORole(address ngo) external onlyAdmin {
        _revokeRole(NGO_ROLE, ngo);
    }

    function grantAdminRole(address admin) external onlyAdmin {
        _grantRole(ADMIN_ROLE, admin);
    }

    function verifyProjectAndMint(
        string calldata projectId,
        address ngoAddress,
        uint256 creditsAmount
    ) external onlyAdmin {
        require(!verifiedProjects[projectId], "BlueCarbon: project already verified");
        require(creditsAmount > 0, "BlueCarbon: credits amount must be greater than 0");
        require(ngoAddress != address(0), "BlueCarbon: invalid NGO address");

        verifiedProjects[projectId] = true;
        projectCredits[projectId] = creditsAmount;
        totalProjectsVerified++;
        totalCreditsIssued += creditsAmount;

        _mint(ngoAddress, creditsAmount * 10**decimals());

        emit ProjectVerified(projectId, ngoAddress, creditsAmount);
    }

    function retireCredits(uint256 amount, string calldata reason) external {
        require(amount > 0, "BlueCarbon: amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "BlueCarbon: insufficient balance");

        totalCreditsRetired += amount;
        _burn(msg.sender, amount);

        emit CreditsRetired(msg.sender, amount, reason);
    }

    function burn(uint256 amount) public override {
        totalCreditsRetired += amount;
        super.burn(amount);
    }

    // View functions
    function isProjectVerified(string calldata projectId) external view returns (bool) {
        return verifiedProjects[projectId];
    }

    function getProjectCredits(string calldata projectId) external view returns (uint256) {
        return projectCredits[projectId];
    }

    function getStats() external view returns (
        uint256 _totalProjects,
        uint256 _totalIssued,
        uint256 _totalRetired,
        uint256 _circulating
    ) {
        return (
            totalProjectsVerified,
            totalCreditsIssued,
            totalCreditsRetired,
            totalSupply()
        );
    }

    // Required override for AccessControl
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC20, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
