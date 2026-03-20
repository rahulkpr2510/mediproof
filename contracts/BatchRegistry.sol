// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RoleManager.sol";

contract BatchRegistry {
    enum BatchStatus {
        ACTIVE,
        RECALLED,
        EXPIRED,
        SUSPICIOUS
    }

    struct Batch {
        bytes32 batchId;
        string medicineName;
        address manufacturer;
        uint64 manufactureDate;
        uint64 expiryDate;
        uint256 totalQuantity;
        BatchStatus status;
        bool exists;
    }

    RoleManager public immutable roleManager;

    mapping(bytes32 => Batch) public batches;
    mapping(bytes32 => bytes32) public unitToBatch;

    event BatchRegistered(bytes32 indexed batchId, address indexed manufacturer, string medicineName, uint256 totalQuantity);
    event BatchStatusUpdated(bytes32 indexed batchId, BatchStatus indexed status);
    event UnitSerialized(bytes32 indexed unitId, bytes32 indexed batchId, uint32 serialNumber);

    modifier onlyManufacturer() {
        require(roleManager.getRole(msg.sender) == RoleManager.Role.MANUFACTURER, "Only manufacturer");
        _;
    }

    constructor(address roleManagerAddress) {
        require(roleManagerAddress != address(0), "Invalid role manager");
        roleManager = RoleManager(roleManagerAddress);
    }

    function registerBatch(
        bytes32 batchId,
        string calldata medicineName,
        uint64 manufactureDate,
        uint64 expiryDate,
        uint256 totalQuantity
    ) external onlyManufacturer {
        require(batchId != bytes32(0), "Invalid batch");
        require(!batches[batchId].exists, "Batch exists");
        require(bytes(medicineName).length > 0, "Name required");
        require(expiryDate > manufactureDate, "Invalid dates");
        require(totalQuantity > 0, "Invalid quantity");

        batches[batchId] = Batch({
            batchId: batchId,
            medicineName: medicineName,
            manufacturer: msg.sender,
            manufactureDate: manufactureDate,
            expiryDate: expiryDate,
            totalQuantity: totalQuantity,
            status: BatchStatus.ACTIVE,
            exists: true
        });

        emit BatchRegistered(batchId, msg.sender, medicineName, totalQuantity);
    }

    function setBatchStatus(bytes32 batchId, BatchStatus status) external {
        Batch storage batch = batches[batchId];
        require(batch.exists, "Unknown batch");
        require(
            msg.sender == batch.manufacturer || roleManager.getRole(msg.sender) == RoleManager.Role.ADMIN,
            "Not authorized"
        );
        batch.status = status;
        emit BatchStatusUpdated(batchId, status);
    }

    function serializeUnit(bytes32 batchId, bytes32 unitId, uint32 serialNumber) external onlyManufacturer {
        Batch storage batch = batches[batchId];
        require(batch.exists, "Unknown batch");
        require(batch.manufacturer == msg.sender, "Wrong manufacturer");
        require(unitId != bytes32(0), "Invalid unit");
        require(unitToBatch[unitId] == bytes32(0), "Unit exists");

        unitToBatch[unitId] = batchId;
        emit UnitSerialized(unitId, batchId, serialNumber);
    }

    function getBatchByUnit(bytes32 unitId) external view returns (bytes32) {
        return unitToBatch[unitId];
    }
}
