import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        manufacturer: true,
        distributor: true,
        pharmacy: true,
      },
    });

    if (!user) {
      return NextResponse.json({ status: null, role: null });
    }

    return NextResponse.json({
      status: user.status,
      role: user.role,
      wallet: user.wallet,
      profile:
        user.manufacturer ||
        user.distributor ||
        user.pharmacy ||
        null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
