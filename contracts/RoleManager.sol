// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RoleManager {
    enum Role {
        NONE,
        MANUFACTURER,
        DISTRIBUTOR,
        PHARMACY,
        ADMIN
    }

    mapping(address => Role) private roles;

    event RoleAssigned(address indexed account, Role indexed role, address indexed assignedBy);

    modifier onlyAdmin() {
        require(roles[msg.sender] == Role.ADMIN, "Only admin");
        _;
    }

    constructor(address initialAdmin) {
        require(initialAdmin != address(0), "Invalid admin");
        roles[initialAdmin] = Role.ADMIN;
        emit RoleAssigned(initialAdmin, Role.ADMIN, msg.sender);
    }

    function assignRole(address account, Role role) external onlyAdmin {
        require(account != address(0), "Invalid account");
        require(role != Role.NONE, "Invalid role");
        roles[account] = role;
        emit RoleAssigned(account, role, msg.sender);
    }

    function revokeRole(address account) external onlyAdmin {
        require(account != address(0), "Invalid account");
        roles[account] = Role.NONE;
        emit RoleAssigned(account, Role.NONE, msg.sender);
    }

    function getRole(address account) external view returns (Role) {
        return roles[account];
    }

    function hasRole(address account, Role role) external view returns (bool) {
        return roles[account] == role;
    }
}
