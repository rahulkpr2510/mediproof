import hardhat from "hardhat";

const { ethers } = hardhat;

const roleManagerAbi = ["function assignRole(address account, uint8 role)"];

async function main() {
  const [deployer] = await ethers.getSigners();

  const roleManagerFactory = await ethers.getContractFactory("RoleManager");
  const roleManager = await roleManagerFactory.deploy(deployer.address);
  await roleManager.waitForDeployment();

  const roleManagerAddress = await roleManager.getAddress();

  const batchRegistryFactory = await ethers.getContractFactory("BatchRegistry");
  const batchRegistry = await batchRegistryFactory.deploy(roleManagerAddress);
  await batchRegistry.waitForDeployment();

  const shipmentLedgerFactory = await ethers.getContractFactory(
    "ShipmentLedger",
  );
  const shipmentLedger = await shipmentLedgerFactory.deploy(roleManagerAddress);
  await shipmentLedger.waitForDeployment();

  const saleRegistryFactory = await ethers.getContractFactory("SaleRegistry");
  const saleRegistry = await saleRegistryFactory.deploy(roleManagerAddress);
  await saleRegistry.waitForDeployment();

  const configuredAdmin = process.env.ADMIN_WALLET;
  if (configuredAdmin) {
    const roleManagerAsAdmin = new ethers.Contract(
      roleManagerAddress,
      roleManagerAbi,
      deployer,
    );
    const tx = await roleManagerAsAdmin.assignRole(configuredAdmin, 4);
    await tx.wait();
  }

  const batchRegistryAddress = await batchRegistry.getAddress();
  const shipmentLedgerAddress = await shipmentLedger.getAddress();
  const saleRegistryAddress = await saleRegistry.getAddress();

  console.log("RoleManager:", roleManagerAddress);
  console.log("BatchRegistry:", batchRegistryAddress);
  console.log("ShipmentLedger:", shipmentLedgerAddress);
  console.log("SaleRegistry:", saleRegistryAddress);
  console.log("\nCopy into .env:\n");
  console.log(`ROLE_MANAGER_ADDRESS=\"${roleManagerAddress}\"`);
  console.log(`BATCH_REGISTRY_ADDRESS=\"${batchRegistryAddress}\"`);
  console.log(`SHIPMENT_LEDGER_ADDRESS=\"${shipmentLedgerAddress}\"`);
  console.log(`SALE_REGISTRY_ADDRESS=\"${saleRegistryAddress}\"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
