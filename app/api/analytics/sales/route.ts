import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAddress } from "@/lib/server/crypto";

export async function GET(req: NextRequest) {
  try {
    const wallet = req.headers.get("x-wallet-address");
    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" }, { status: 401 });
    }

    const normalizedWallet = normalizeAddress(wallet);
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "week";
    const role = searchParams.get("role");

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Query based on role
    let data: { date: string; sales: number; units: number }[] = [];
    let totalSales = 0;
    let totalUnits = 0;

    if (role === "MANUFACTURER") {
      // Get supply events for manufactured items
      const events = await prisma.supplyEvent.findMany({
        where: {
          actorWallet: normalizedWallet,
          eventType: "MANUFACTURED",
          timestamp: { gte: startDate },
        },
        select: {
          timestamp: true,
        },
      });

      data = aggregateByDate(events.map((e) => e.timestamp), range);
      totalUnits = events.length;
      totalSales = totalUnits * 50; // Estimated revenue per unit
    } else if (role === "DISTRIBUTOR") {
      // Get delivered shipments
      const shipments = await prisma.shipment.findMany({
        where: {
          senderWallet: normalizedWallet,
          status: "DELIVERED",
          deliveredAt: { gte: startDate },
        },
        select: {
          deliveredAt: true,
          quantity: true,
        },
      });

      data = aggregateShipments(shipments, range);
      totalUnits = shipments.reduce((sum, s) => sum + s.quantity, 0);
      totalSales = totalUnits * 30; // Estimated revenue per unit
    } else if (role === "PHARMACY") {
      // Get final sales
      const sales = await prisma.finalSale.findMany({
        where: {
          pharmacyWallet: normalizedWallet,
          timestamp: { gte: startDate },
        },
        select: {
          timestamp: true,
        },
      });

      data = aggregateByDate(sales.map((s) => s.timestamp), range);
      totalUnits = sales.length;
      totalSales = totalUnits * 25; // Estimated revenue per unit
    } else {
      // Generic supply events
      const events = await prisma.supplyEvent.findMany({
        where: {
          actorWallet: normalizedWallet,
          timestamp: { gte: startDate },
        },
        select: {
          timestamp: true,
        },
      });

      data = aggregateByDate(events.map((e) => e.timestamp), range);
      totalUnits = events.length;
      totalSales = totalUnits * 40;
    }

    return NextResponse.json({
      data,
      totalSales,
      totalUnits,
      range,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

function aggregateByDate(
  timestamps: Date[],
  range: string
): { date: string; sales: number; units: number }[] {
  const grouped: Record<string, number> = {};

  for (const ts of timestamps) {
    const key = formatDateKey(ts, range);
    grouped[key] = (grouped[key] || 0) + 1;
  }

  return Object.entries(grouped)
    .map(([date, units]) => ({
      date,
      units,
      sales: units * 50,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateShipments(
  shipments: { deliveredAt: Date | null; quantity: number }[],
  range: string
): { date: string; sales: number; units: number }[] {
  const grouped: Record<string, number> = {};

  for (const s of shipments) {
    if (!s.deliveredAt) continue;
    const key = formatDateKey(s.deliveredAt, range);
    grouped[key] = (grouped[key] || 0) + s.quantity;
  }

  return Object.entries(grouped)
    .map(([date, units]) => ({
      date,
      units,
      sales: units * 30,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatDateKey(date: Date, range: string): string {
  if (range === "year") {
    return date.toLocaleDateString("en-US", { month: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
