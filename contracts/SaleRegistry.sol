// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RoleManager.sol";

contract SaleRegistry {
    struct SaleRecord {
        bytes32 unitId;
        address pharmacy;
        address buyer;
        uint64 timestamp;
        bytes pharmacySig;
        bytes buyerSig;
    }

    RoleManager public immutable roleManager;
    mapping(bytes32 => SaleRecord) public sales;

    event SaleFinalized(bytes32 indexed unitId, address indexed pharmacy, address indexed buyer, uint64 timestamp);

    constructor(address roleManagerAddress) {
        require(roleManagerAddress != address(0), "Invalid role manager");
        roleManager = RoleManager(roleManagerAddress);
    }

    function finalizeSale(
        bytes32 unitId,
        address buyer,
        bytes calldata pharmacySig,
        bytes calldata buyerSig
    ) external {
        require(roleManager.getRole(msg.sender) == RoleManager.Role.PHARMACY, "Only pharmacy");
        require(unitId != bytes32(0), "Invalid unit");
        require(buyer != address(0), "Invalid buyer");
        require(sales[unitId].timestamp == 0, "Already sold");
        require(pharmacySig.length > 0 && buyerSig.length > 0, "Dual signatures required");

        sales[unitId] = SaleRecord({
            unitId: unitId,
            pharmacy: msg.sender,
            buyer: buyer,
            timestamp: uint64(block.timestamp),
            pharmacySig: pharmacySig,
            buyerSig: buyerSig
        });

        emit SaleFinalized(unitId, msg.sender, buyer, uint64(block.timestamp));
    }
}
