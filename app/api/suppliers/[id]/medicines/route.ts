import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the supplier (user)
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        manufacturer: true,
        distributor: true,
      },
    });

    if (!user || !user.wallet) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Get batches created by this manufacturer or distributed by this distributor
    let medicines: {
      batchId: string;
      medicineName: string;
      availableQuantity: number;
      expiryDate: string;
      totalQuantity: number;
    }[] = [];

    if (user.role === "MANUFACTURER") {
      // Get batches created by this manufacturer
      const batches = await prisma.batch.findMany({
        where: {
          manufacturer: user.wallet,
          status: "ACTIVE",
        },
        include: {
          units: {
            where: {
              status: "ACTIVE",
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      medicines = batches.map((batch) => ({
        batchId: batch.batchId,
        medicineName: batch.medicineName,
        availableQuantity: batch.units.length,
        expiryDate: batch.expiryDate.toISOString().split("T")[0],
        totalQuantity: batch.totalQuantity,
      }));
    } else if (user.role === "DISTRIBUTOR") {
      // For distributors, get stock from DistributorStock
      const stocks = await prisma.distributorStock.findMany({
        where: {
          distributor: {
            userId: user.id,
          },
        },
      });

      // Get batch details for each stock item
      const batchIds = stocks.map((s) => s.batchId);
      const batches = await prisma.batch.findMany({
        where: {
          batchId: { in: batchIds },
          status: "ACTIVE",
        },
      });

      medicines = stocks.map((stock) => {
        const batch = batches.find((b) => b.batchId === stock.batchId);
        return {
          batchId: stock.batchId,
          medicineName: batch?.medicineName || "Unknown",
          availableQuantity: stock.quantity,
          expiryDate: batch?.expiryDate.toISOString().split("T")[0] || "",
          totalQuantity: batch?.totalQuantity || stock.quantity,
        };
      });
    }

    return NextResponse.json({
      supplier: {
        id: user.id,
        name:
          user.manufacturer?.companyName ||
          user.distributor?.companyName ||
          "Unknown",
        wallet: user.wallet,
      },
      medicines,
    });
  } catch (error) {
    console.error("Error fetching medicines:", error);
    return NextResponse.json(
      { error: "Failed to fetch medicines" },
      { status: 500 }
    );
  }
}
