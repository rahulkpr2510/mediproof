import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // MANUFACTURER or DISTRIBUTOR

    if (!role || !["MANUFACTURER", "DISTRIBUTOR"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role parameter" },
        { status: 400 }
      );
    }

    // Get approved users with the specified role
    const users = await prisma.user.findMany({
      where: {
        role: role as "MANUFACTURER" | "DISTRIBUTOR",
        status: "APPROVED",
      },
      include: {
        manufacturer: role === "MANUFACTURER" ? true : undefined,
        distributor: role === "DISTRIBUTOR" ? true : undefined,
      },
    });

    const suppliers = users.map((user) => {
      const profile = user.manufacturer || user.distributor;
      return {
        id: user.id,
        wallet: user.wallet,
        name:
          user.manufacturer?.companyName ||
          user.distributor?.companyName ||
          "Unknown",
        licenseNumber: profile?.licenseNumber || "N/A",
        verifiedBadge: profile?.verifiedBadge || false,
      };
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}
