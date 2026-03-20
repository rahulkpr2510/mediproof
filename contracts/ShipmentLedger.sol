// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RoleManager.sol";

contract ShipmentLedger {
    enum ShipmentStatus {
        REQUESTED,
        APPROVED,
        DISPATCHED,
        DELIVERED
    }

    enum EventType {
        MANUFACTURED,
        DISTRIBUTOR_RECEIVED,
        PHARMACY_RECEIVED,
        SOLD
    }

    struct Shipment {
        bytes32 shipmentId;
        bytes32 batchId;
        uint32 unitStart;
        uint32 unitEnd;
        address sender;
        address receiver;
        uint256 quantity;
        ShipmentStatus status;
        bool exists;
    }

    struct SupplyEvent {
        bytes32 unitId;
        EventType eventType;
        address actor;
        uint64 timestamp;
        bytes32 locationHash;
        bool senderConfirmed;
        bool receiverConfirmed;
    }

    RoleManager public immutable roleManager;

    mapping(bytes32 => Shipment) public shipments;
    mapping(bytes32 => SupplyEvent[]) private unitEvents;

    event ShipmentRequested(bytes32 indexed shipmentId, bytes32 indexed batchId, address indexed receiver, address sender, uint32 unitStart, uint32 unitEnd, uint256 quantity);
    event ShipmentApproved(bytes32 indexed shipmentId, address indexed sender);
    event ShipmentDispatched(bytes32 indexed shipmentId, address indexed sender);
    event ShipmentDelivered(bytes32 indexed shipmentId, address indexed receiver);
    event SupplyEventRecorded(bytes32 indexed unitId, EventType indexed eventType, address indexed actor, bytes32 locationHash);

    constructor(address roleManagerAddress) {
        require(roleManagerAddress != address(0), "Invalid role manager");
        roleManager = RoleManager(roleManagerAddress);
    }

    function requestShipment(
        bytes32 shipmentId,
        bytes32 batchId,
        uint32 unitStart,
        uint32 unitEnd,
        address sender,
        uint256 quantity
    ) external {
        require(shipmentId != bytes32(0), "Invalid shipment");
        require(!shipments[shipmentId].exists, "Shipment exists");
        require(sender != address(0), "Invalid sender");
        require(unitEnd >= unitStart, "Invalid range");
        require(quantity == uint256(unitEnd - unitStart + 1), "Range mismatch");

        RoleManager.Role receiverRole = roleManager.getRole(msg.sender);
        require(
            receiverRole == RoleManager.Role.DISTRIBUTOR || receiverRole == RoleManager.Role.PHARMACY,
            "Receiver role invalid"
        );

        shipments[shipmentId] = Shipment({
            shipmentId: shipmentId,
            batchId: batchId,
            unitStart: unitStart,
            unitEnd: unitEnd,
            sender: sender,
            receiver: msg.sender,
            quantity: quantity,
            status: ShipmentStatus.REQUESTED,
            exists: true
        });

        emit ShipmentRequested(shipmentId, batchId, msg.sender, sender, unitStart, unitEnd, quantity);
    }

    function approveShipment(bytes32 shipmentId) external {
        Shipment storage shipment = shipments[shipmentId];
        require(shipment.exists, "Unknown shipment");
        require(shipment.sender == msg.sender, "Not sender");
        require(shipment.status == ShipmentStatus.REQUESTED, "Invalid status");

        shipment.status = ShipmentStatus.APPROVED;
        emit ShipmentApproved(shipmentId, msg.sender);
    }

    function dispatchShipment(bytes32 shipmentId) external {
        Shipment storage shipment = shipments[shipmentId];
        require(shipment.exists, "Unknown shipment");
        require(shipment.sender == msg.sender, "Not sender");
        require(shipment.status == ShipmentStatus.APPROVED, "Invalid status");

        shipment.status = ShipmentStatus.DISPATCHED;
        emit ShipmentDispatched(shipmentId, msg.sender);
    }

    function confirmDelivery(bytes32 shipmentId) external {
        Shipment storage shipment = shipments[shipmentId];
        require(shipment.exists, "Unknown shipment");
        require(shipment.receiver == msg.sender, "Not receiver");
        require(shipment.status == ShipmentStatus.DISPATCHED, "Invalid status");

        shipment.status = ShipmentStatus.DELIVERED;
        emit ShipmentDelivered(shipmentId, msg.sender);
    }

    function recordSupplyEvent(
        bytes32 unitId,
        EventType eventType,
        bytes32 locationHash,
        bool senderConfirmed,
        bool receiverConfirmed
    ) external {
        require(unitId != bytes32(0), "Invalid unit");
        require(senderConfirmed && receiverConfirmed, "Dual confirmation required");

        unitEvents[unitId].push(
            SupplyEvent({
                unitId: unitId,
                eventType: eventType,
                actor: msg.sender,
                timestamp: uint64(block.timestamp),
                locationHash: locationHash,
                senderConfirmed: senderConfirmed,
                receiverConfirmed: receiverConfirmed
            })
        );

        emit SupplyEventRecorded(unitId, eventType, msg.sender, locationHash);
    }

    function getUnitEvents(bytes32 unitId) external view returns (SupplyEvent[] memory) {
        return unitEvents[unitId];
    }
}
